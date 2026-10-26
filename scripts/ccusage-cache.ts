#!/usr/bin/env bun
/**
 * Shared cache for the ccusage results the status line shows.
 *
 * Claude Code runs the status line once per session on every update, and a
 * ccusage run parses every local usage log. Running it from each status line
 * call piles up overlapping ccusage processes when many sessions are open.
 * Instead, every caller reads one cache file. When the cache is stale, the
 * first caller to take the lock file starts a detached refresher (this file,
 * run as a script) and everyone, including that caller, renders from the
 * cached value without waiting.
 */
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * How long a cached result counts as fresh. The status line shows today's
 * cost and the minutes left in the usage window, so a minute keeps both
 * within one displayed unit of the truth while capping ccusage at one run
 * per minute across all sessions.
 */
export const CACHE_TTL_MS = 60_000;

/** Longest a single ccusage command may run before its process tree is killed. */
export const COMMAND_TIMEOUT_MS = 30_000;

/**
 * A lock older than this belongs to a refresher that died without releasing
 * it. A refresh runs two commands, each bounded by COMMAND_TIMEOUT_MS, so a
 * live refresher never holds the lock this long.
 */
export const STALE_LOCK_MS = 2 * COMMAND_TIMEOUT_MS + 30_000;

const CACHE_DIR = join(homedir(), '.claude', 'cc-track', 'statusline');
const CACHE_FILE = 'ccusage-cache.json';
const LOCK_FILE = 'ccusage-refresh.lock';
const INPUT_ENV = 'CC_TRACK_STATUSLINE_INPUT';

/** One entry of `ccusage daily --json`; `period` is the local date as YYYY-MM-DD */
export interface DailyCost {
  period: string;
  totalCost?: number;
}

export interface CcusageCache {
  updatedAt: number;
  daily?: DailyCost[];
  statusline?: string;
}

export interface CcusageCacheDeps {
  cacheDir: string;
  /** Starts a refresh that runs without blocking the caller; the refresh releases the lock. */
  startRefresh: (input: string) => void;
  /** Runs `ccusage <args>` with `input` on stdin and resolves with its stdout. */
  runCcusage: (args: string[], input: string) => Promise<string>;
}

export function readCache(cacheDir: string): CcusageCache | null {
  try {
    const cache = JSON.parse(readFileSync(join(cacheDir, CACHE_FILE), 'utf-8')) as CcusageCache;
    return typeof cache.updatedAt === 'number' ? cache : null;
  } catch {
    return null;
  }
}

function writeCache(cacheDir: string, cache: CcusageCache): void {
  // Write then rename so readers never see a partly written file
  const cachePath = join(cacheDir, CACHE_FILE);
  const tempPath = `${cachePath}.${process.pid}.tmp`;
  writeFileSync(tempPath, JSON.stringify(cache));
  renameSync(tempPath, cachePath);
}

function createLock(lockPath: string): boolean {
  try {
    // 'wx' fails if the file exists, so exactly one caller creates it
    closeSync(openSync(lockPath, 'wx'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Take the refresh lock. Returns false when another process holds it. A lock
 * older than STALE_LOCK_MS is taken over: renaming it away is atomic, so only
 * one of several callers that see it as stale gets to replace it.
 */
export function tryAcquireLock(cacheDir: string): boolean {
  try {
    mkdirSync(cacheDir, { recursive: true });
  } catch {
    return false;
  }
  const lockPath = join(cacheDir, LOCK_FILE);
  if (createLock(lockPath)) {
    return true;
  }

  let lockedAt: number;
  try {
    lockedAt = statSync(lockPath).mtimeMs;
  } catch {
    // The holder released it between our attempts; it has just refreshed the cache
    return false;
  }
  if (Date.now() - lockedAt < STALE_LOCK_MS) {
    return false;
  }

  const claimedPath = `${lockPath}.${process.pid}.stale`;
  try {
    renameSync(lockPath, claimedPath);
  } catch {
    // Another caller took over the stale lock first
    return false;
  }
  try {
    unlinkSync(claimedPath);
  } catch {
    // Leftover stale file is harmless
  }
  return createLock(lockPath);
}

export function releaseLock(cacheDir: string): void {
  try {
    unlinkSync(join(cacheDir, LOCK_FILE));
  } catch {
    // Already gone
  }
}

/**
 * Return the cached ccusage result, possibly stale or null, without waiting
 * on ccusage. When the cache is stale and no refresh is running, start one.
 */
export function getCcusageData(input: string, deps: CcusageCacheDeps): CcusageCache | null {
  const cache = readCache(deps.cacheDir);
  if (cache && Date.now() - cache.updatedAt < CACHE_TTL_MS) {
    return cache;
  }
  if (tryAcquireLock(deps.cacheDir)) {
    try {
      deps.startRefresh(input);
    } catch {
      releaseLock(deps.cacheDir);
    }
  }
  return cache;
}

function parseDaily(output: string): DailyCost[] | undefined {
  const data = JSON.parse(output) as { daily?: DailyCost[] };
  return data.daily?.map(({ period, totalCost }) => ({ period, totalCost }));
}

/**
 * Run ccusage and write the cache, then release the lock. The caller must
 * hold the lock. A failed command leaves its field empty so the status line
 * shows the same fallback it shows when ccusage fails.
 */
export async function refreshCcusageCache(input: string, deps: CcusageCacheDeps): Promise<void> {
  try {
    // Sequential, so a refresh holds at most one ccusage process at a time
    const daily = await deps
      .runCcusage(['daily', '--json'], input)
      .then(parseDaily)
      .catch(() => undefined);
    const statusline = await deps.runCcusage(['statusline'], input).catch(() => undefined);
    writeCache(deps.cacheDir, { updatedAt: Date.now(), daily, statusline });
  } finally {
    releaseLock(deps.cacheDir);
  }
}

function killTree(pid: number): void {
  if (process.platform === 'win32') {
    // bunx starts a chain of cmd/node/ccusage processes; /T ends all of them
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  } else {
    try {
      // The child leads its own process group (detached), so this reaches its descendants
      process.kill(-pid, 'SIGKILL');
    } catch {
      // Already exited
    }
  }
}

/**
 * Run `bunx ccusage <args>`, killing its whole process tree if it runs past
 * COMMAND_TIMEOUT_MS. A plain execSync timeout would only kill the direct
 * child and leave the ccusage process behind it running.
 */
function runCcusage(args: string[], input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('bunx', ['ccusage', ...args], {
      // A neutral directory, so bunx resolves the same ccusage whichever project triggered the refresh
      cwd: CACHE_DIR,
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true,
      detached: process.platform !== 'win32',
    });
    let output = '';
    child.stdout.setEncoding('utf-8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
    });
    const timer = setTimeout(() => {
      if (child.pid !== undefined) {
        killTree(child.pid);
      }
      reject(new Error(`ccusage ${args.join(' ')} timed out`));
    }, COMMAND_TIMEOUT_MS);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`ccusage ${args.join(' ')} exited with ${code}`));
      }
    });
    child.stdin.on('error', () => {
      // ccusage may exit before reading its input
    });
    child.stdin.end(input);
  });
}

/** Run this file as a detached process that refreshes the cache and exits. */
function startDetachedRefresh(input: string): void {
  const child = spawn(process.execPath, [import.meta.path], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, [INPUT_ENV]: input },
  });
  child.unref();
}

export const defaultCcusageCacheDeps: CcusageCacheDeps = {
  cacheDir: CACHE_DIR,
  startRefresh: startDetachedRefresh,
  runCcusage,
};

if (import.meta.main) {
  refreshCcusageCache(process.env[INPUT_ENV] ?? '', defaultCcusageCacheDeps).finally(() => process.exit(0));
}
