import { describe, expect, mock, test } from 'bun:test';
import { existsSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CACHE_TTL_MS,
  type CcusageCache,
  type CcusageCacheDeps,
  getCcusageData,
  readCache,
  refreshCcusageCache,
  STALE_LOCK_MS,
  tryAcquireLock,
} from './ccusage-cache';

const LOCK_FILE = 'ccusage-refresh.lock';

function createDeps(runCcusage: CcusageCacheDeps['runCcusage'] = async () => ''): CcusageCacheDeps {
  return {
    cacheDir: mkdtempSync(join(tmpdir(), 'cc-track-ccusage-cache-test-')),
    startRefresh: mock(() => {}),
    runCcusage: mock(runCcusage),
  };
}

function writeCache(cacheDir: string, cache: CcusageCache): void {
  writeFileSync(join(cacheDir, 'ccusage-cache.json'), JSON.stringify(cache));
}

function writeLock(cacheDir: string, ageMs: number): void {
  const lockPath = join(cacheDir, LOCK_FILE);
  writeFileSync(lockPath, '');
  const lockedAt = (Date.now() - ageMs) / 1000;
  utimesSync(lockPath, lockedAt, lockedAt);
}

const staleCache: CcusageCache = {
  updatedAt: Date.now() - CACHE_TTL_MS - 1000,
  daily: [{ period: '2026-01-01', totalCost: 3 }],
  statusline: '$4.00/hr | (10m left)',
};

describe('ccusage-cache', () => {
  describe('getCcusageData', () => {
    test('a fresh cache is returned without starting a refresh', () => {
      const deps = createDeps();
      const fresh = { ...staleCache, updatedAt: Date.now() };
      writeCache(deps.cacheDir, fresh);

      expect(getCcusageData('{}', deps)).toEqual(fresh);
      expect(deps.startRefresh).not.toHaveBeenCalled();
      expect(existsSync(join(deps.cacheDir, LOCK_FILE))).toBe(false);
    });

    test('a stale cache with the lock held returns the cached value without starting a refresh', () => {
      const deps = createDeps();
      writeCache(deps.cacheDir, staleCache);
      writeLock(deps.cacheDir, 1000);

      expect(getCcusageData('{}', deps)).toEqual(staleCache);
      expect(deps.startRefresh).not.toHaveBeenCalled();
    });

    test('a stale cache with no lock starts exactly one refresh across callers', () => {
      const deps = createDeps();
      writeCache(deps.cacheDir, staleCache);

      // Every caller gets the stale value straight away; only the first takes the lock
      expect(getCcusageData('{"session":1}', deps)).toEqual(staleCache);
      expect(getCcusageData('{"session":2}', deps)).toEqual(staleCache);
      expect(getCcusageData('{"session":3}', deps)).toEqual(staleCache);

      expect(deps.startRefresh).toHaveBeenCalledTimes(1);
      expect(deps.startRefresh).toHaveBeenCalledWith('{"session":1}');
      expect(existsSync(join(deps.cacheDir, LOCK_FILE))).toBe(true);
    });

    test('a stale lock left by a dead refresher is taken over', () => {
      const deps = createDeps();
      writeCache(deps.cacheDir, staleCache);
      writeLock(deps.cacheDir, STALE_LOCK_MS + 1000);

      expect(getCcusageData('{}', deps)).toEqual(staleCache);
      expect(deps.startRefresh).toHaveBeenCalledTimes(1);
      // The taken-over lock is fresh, so the next caller backs off
      getCcusageData('{}', deps);
      expect(deps.startRefresh).toHaveBeenCalledTimes(1);
    });

    test('a missing cache returns null and starts a refresh', () => {
      const deps = createDeps();

      expect(getCcusageData('{}', deps)).toBeNull();
      expect(deps.startRefresh).toHaveBeenCalledTimes(1);
    });

    test('a failure to start the refresh releases the lock', () => {
      const deps = createDeps();
      deps.startRefresh = mock(() => {
        throw new Error('spawn failed');
      });

      expect(getCcusageData('{}', deps)).toBeNull();
      expect(existsSync(join(deps.cacheDir, LOCK_FILE))).toBe(false);
    });
  });

  describe('tryAcquireLock', () => {
    test('only the first of several callers gets the lock', () => {
      const { cacheDir } = createDeps();

      expect([tryAcquireLock(cacheDir), tryAcquireLock(cacheDir), tryAcquireLock(cacheDir)]).toEqual([
        true,
        false,
        false,
      ]);
    });
  });

  describe('refreshCcusageCache', () => {
    test('writes both ccusage results to the cache and releases the lock', async () => {
      const deps = createDeps(async (args) =>
        args[0] === 'daily'
          ? // Shape of a ccusage 20 `daily --json` entry
            JSON.stringify({
              daily: [
                {
                  agent: 'all',
                  period: '2026-10-26',
                  inputTokens: 100,
                  outputTokens: 50,
                  cacheCreationTokens: 10,
                  cacheReadTokens: 1000,
                  totalTokens: 1160,
                  totalCost: 12.5,
                  modelsUsed: ['claude-opus-5-5'],
                  modelBreakdowns: [],
                  metadata: { agents: ['claude'] },
                },
              ],
            })
          : '💰 $15.50/hr | (23m left)',
      );
      tryAcquireLock(deps.cacheDir);

      await refreshCcusageCache('{"model":"x"}', deps);

      expect(deps.runCcusage).toHaveBeenCalledTimes(2);
      expect(deps.runCcusage).toHaveBeenCalledWith(['daily', '--json'], '{"model":"x"}');
      expect(deps.runCcusage).toHaveBeenCalledWith(['statusline'], '{"model":"x"}');
      const cache = readCache(deps.cacheDir);
      expect(cache?.daily).toEqual([{ period: '2026-10-26', totalCost: 12.5 }]);
      expect(cache?.statusline).toBe('💰 $15.50/hr | (23m left)');
      expect(Date.now() - (cache?.updatedAt ?? 0)).toBeLessThan(CACHE_TTL_MS);
      expect(existsSync(join(deps.cacheDir, LOCK_FILE))).toBe(false);
    });

    test('a failed command leaves its field empty and still releases the lock', async () => {
      const deps = createDeps(async (args) => {
        if (args[0] === 'daily') {
          throw new Error('ccusage timed out');
        }
        return '$2.00/hr';
      });
      tryAcquireLock(deps.cacheDir);

      await refreshCcusageCache('{}', deps);

      const cache = readCache(deps.cacheDir);
      expect(cache?.daily).toBeUndefined();
      expect(cache?.statusline).toBe('$2.00/hr');
      expect(existsSync(join(deps.cacheDir, LOCK_FILE))).toBe(false);
    });
  });
});
