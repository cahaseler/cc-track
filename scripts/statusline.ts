#!/usr/bin/env bun
import { execSync as nodeExecSync } from 'node:child_process';
import {
  existsSync as nodeExistsSync,
  mkdirSync as nodeMkdirSync,
  readFileSync as nodeReadFileSync,
  writeFileSync as nodeWriteFileSync,
} from 'node:fs';
import { homedir as nodeHomedir } from 'node:os';
import { join } from 'node:path/posix';
import { getActiveTaskId } from '../skills/cc-track-tools/lib/claude-md';

interface AutoflowState {
  active: boolean;
  sessionId: string;
  activatedAt: string;
  continueCount: number;
  windowStart?: string;
}

// Simple result type for statusline
interface CommandResult<T = unknown> {
  success: boolean;
  messages?: string[];
  data?: T;
}

import { getConfig as getConfigImpl, type StatuslineConfig } from '../skills/cc-track-tools/lib/config';
import {
  getCurrentBranch as getCurrentBranchImpl,
  getRepoName as getRepoNameImpl,
} from '../skills/cc-track-tools/lib/git-helpers';
import { getActiveSpecDirectory } from '../skills/cc-track-tools/lib/spec-helpers';

interface CurrentUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface StatusLineInput {
  model?: {
    display_name: string;
  };
  cost?: {
    total_cost_usd?: number;
  };
  context_window?: {
    context_window_size: number;
    current_usage?: CurrentUsage;
  };
}

// Dependency injection for testing
interface StatusLineDeps {
  execSync: typeof nodeExecSync;
  existsSync: typeof nodeExistsSync;
  readFileSync: typeof nodeReadFileSync;
  writeFileSync: typeof nodeWriteFileSync;
  homedir: typeof nodeHomedir;
  getConfig: typeof getConfigImpl;
  getCurrentBranch: typeof getCurrentBranchImpl;
  getRepoName: typeof getRepoNameImpl;
  getActiveTaskId: typeof getActiveTaskId;
  getActiveSpecDirectory: typeof getActiveSpecDirectory;
}

const defaultDeps: StatusLineDeps = {
  execSync: nodeExecSync,
  existsSync: nodeExistsSync,
  readFileSync: nodeReadFileSync,
  writeFileSync: nodeWriteFileSync,
  homedir: nodeHomedir,
  getConfig: getConfigImpl,
  getCurrentBranch: getCurrentBranchImpl,
  getRepoName: getRepoNameImpl,
  getActiveTaskId,
  getActiveSpecDirectory,
};

/**
 * Get today's cost from ccusage
 */
export function getTodaysCost(input: StatusLineInput, deps = defaultDeps): string {
  try {
    // Use local date instead of UTC to match user's timezone
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const result = deps.execSync('bunx ccusage daily --json', {
      encoding: 'utf-8',
      input: JSON.stringify(input),
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    const data = JSON.parse(result);
    const todayData = data.daily?.find((d: { date: string; totalCost?: number }) => d.date === today);
    return todayData?.totalCost?.toFixed(2) || '0.00';
  } catch {
    return '0.00';
  }
}

/**
 * Get token info from current_usage (actual context state, post-compaction)
 */
export function getTokenInfo(input: StatusLineInput): string {
  const { context_window } = input;
  if (!context_window?.current_usage) {
    return '';
  }

  const { current_usage, context_window_size } = context_window;
  const current =
    current_usage.input_tokens +
    (current_usage.cache_creation_input_tokens || 0) +
    (current_usage.cache_read_input_tokens || 0);
  const percentage = Math.round((current / context_window_size) * 100);
  return `${current.toLocaleString()} (${percentage}%)`;
}

/**
 * Get cost info from ccusage (hourly rate and API window time)
 */
export function getCostInfo(input: StatusLineInput, deps = defaultDeps): { hourlyRate: string; apiWindow: string } {
  try {
    const result = deps.execSync('bunx ccusage statusline', {
      encoding: 'utf-8',
      input: JSON.stringify(input),
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    // Extract hourly rate
    const rateMatch = result.match(/\$[\d.]+\/hr/);
    const hourlyRate = rateMatch ? rateMatch[0] : '';

    // Extract API window time
    const windowMatch = result.match(/\(([^)]+)left\)/);
    const apiWindow = windowMatch ? windowMatch[1].replace(' left', '').trim() : '';

    return { hourlyRate, apiWindow };
  } catch {
    return { hourlyRate: '', apiWindow: '' };
  }
}

interface OAuthUsageLimit {
  kind: string;
  group: string;
  percent?: number;
  resets_at?: string;
  scope?: { model?: { display_name?: string | null } | null } | null;
}

interface OAuthUsageResponse {
  limits?: OAuthUsageLimit[];
}

interface UsageCacheFile {
  fetchedAt: number;
  data: OAuthUsageResponse;
}

const USAGE_CACHE_MAX_AGE_MS = 60_000;

function getUsageCachePath(deps: StatusLineDeps): string {
  return join(deps.homedir(), '.claude', '.usage-cache.json');
}

function getOAuthToken(deps: StatusLineDeps): string | undefined {
  try {
    const credentialsPath = join(deps.homedir(), '.claude', '.credentials.json');
    if (!deps.existsSync(credentialsPath)) {
      return undefined;
    }
    const parsed = JSON.parse(deps.readFileSync(credentialsPath, 'utf-8'));
    return parsed?.claudeAiOauth?.accessToken || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get session/weekly plan usage limits via an undocumented Anthropic endpoint
 * (not in the statusLine stdin schema) discovered by the community; may break
 * without notice. Cached to avoid hitting it on every render.
 */
export function getUsageLimits(deps = defaultDeps): OAuthUsageLimit[] {
  let cached: UsageCacheFile | undefined;

  try {
    const cachePath = getUsageCachePath(deps);
    if (deps.existsSync(cachePath)) {
      cached = JSON.parse(deps.readFileSync(cachePath, 'utf-8'));
    }
  } catch {
    cached = undefined;
  }

  const isFresh = cached ? Date.now() - cached.fetchedAt < USAGE_CACHE_MAX_AGE_MS : false;

  if (!isFresh) {
    try {
      const token = getOAuthToken(deps);
      if (token) {
        const result = deps.execSync(
          `curl -s --max-time 3 "https://api.anthropic.com/api/oauth/usage" -H "Authorization: Bearer ${token}" -H "anthropic-beta: oauth-2025-04-20"`,
          { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] },
        );
        const data = JSON.parse(result) as OAuthUsageResponse;
        if (data?.limits) {
          cached = { fetchedAt: Date.now(), data };
          deps.writeFileSync(getUsageCachePath(deps), JSON.stringify(cached));
        }
      }
    } catch {
      // Network/parse failure - fall back to whatever stale cache we have
    }
  }

  return cached?.data.limits ?? [];
}

function formatSessionReset(resetsAt: string | undefined): string {
  if (!resetsAt) return '';
  const date = new Date(resetsAt);
  if (Number.isNaN(date.getTime())) return '';
  const hours = date.getHours() % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = date.getHours() >= 12 ? 'PM' : 'AM';
  return `${hours}:${minutes}${period}`;
}

function formatWeeklyReset(resetsAt: string | undefined): string {
  if (!resetsAt) return '';
  const date = new Date(resetsAt);
  if (Number.isNaN(date.getTime())) return '';
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const hours = date.getHours() % 12 || 12;
  const period = date.getHours() >= 12 ? 'PM' : 'AM';
  return `${weekday} ${hours}${period}`;
}

/**
 * Format 5h/weekly (including model-scoped, e.g. Fable) usage limits for display
 */
export function formatUsageLimits(limits: OAuthUsageLimit[]): string {
  const parts: string[] = [];

  const session = limits.find((limit) => limit.kind === 'session');
  if (session?.percent !== undefined) {
    const reset = formatSessionReset(session.resets_at);
    parts.push(`5h:${session.percent}%${reset ? ` (resets ${reset})` : ''}`);
  }

  for (const weekly of limits.filter((limit) => limit.group === 'weekly')) {
    if (weekly.percent === undefined) continue;
    const label = weekly.scope?.model?.display_name || 'all';
    const reset = formatWeeklyReset(weekly.resets_at);
    parts.push(`wk-${label}:${weekly.percent}%${reset ? ` (resets ${reset})` : ''}`);
  }

  return parts.join(' | ');
}

/**
 * Get current git branch
 */
export function getCurrentBranch(deps = defaultDeps): string {
  try {
    return deps.getCurrentBranch(process.cwd());
  } catch {
    return '';
  }
}

/**
 * Get current repository name
 */
export function getRepoName(deps = defaultDeps): string {
  try {
    return deps.getRepoName(process.cwd());
  } catch {
    return '';
  }
}

/**
 * Get active task from CLAUDE.md
 */
export function getActiveTask(deps = defaultDeps): string {
  const cwd = process.cwd();

  // Check if there's an active task
  const taskId = deps.getActiveTaskId(cwd);
  if (!taskId) {
    // Check if no_active_task.md is referenced
    const claudeMdPath = join(cwd, 'CLAUDE.md');
    if (deps.existsSync(claudeMdPath)) {
      const content = deps.readFileSync(claudeMdPath, 'utf-8');
      if (content.includes('@.cc-track/no_active_task.md')) {
        return 'No active task';
      }
    }
    return '';
  }

  // Get the spec directory and read the title from spec.md
  const fileOps = {
    existsSync: deps.existsSync,
    readFileSync: deps.readFileSync,
    writeFileSync: nodeWriteFileSync,
    mkdirSync: nodeMkdirSync,
  };

  const specDir = deps.getActiveSpecDirectory(cwd, fileOps);
  if (!specDir) {
    return '';
  }

  const specMdPath = join(specDir, 'spec.md');
  if (!deps.existsSync(specMdPath)) {
    return '';
  }

  const specContent = deps.readFileSync(specMdPath, 'utf-8');
  const titleMatch = specContent.match(/^# (.+)$/m);
  return titleMatch ? titleMatch[1] : '';
}

/**
 * Check if autoflow mode is active
 */
export function getAutoflowState(deps = defaultDeps): { active: boolean; continueCount: number } {
  const cwd = process.cwd();
  const stateFile = join(cwd, '.cc-track', '.autoflow-state.json');

  if (!deps.existsSync(stateFile)) {
    return { active: false, continueCount: 0 };
  }

  try {
    const content = deps.readFileSync(stateFile, 'utf-8');
    const state: AutoflowState = JSON.parse(content);
    // Only return continueCount when active - it's not meaningful when inactive
    if (state.active === true) {
      return { active: true, continueCount: state.continueCount || 0 };
    }
    return { active: false, continueCount: 0 };
  } catch {
    return { active: false, continueCount: 0 };
  }
}

/**
 * Get cost emoji based on amount
 */
export function getCostEmoji(cost: number): string {
  if (cost >= 300) return '🤑';
  if (cost >= 200) return '💰';
  if (cost >= 100) return '💸';
  if (cost >= 50) return '💵';
  return '🪙';
}

/**
 * Generate statusline output
 */
export function generateStatusLine(input: StatusLineInput, deps = defaultDeps): string {
  const modelName = input.model?.display_name || 'Unknown';
  const todaysCost = getTodaysCost(input, deps);
  const { hourlyRate, apiWindow } = getCostInfo(input, deps);
  const tokens = getTokenInfo(input);
  const branch = getCurrentBranch(deps);
  const task = getActiveTask(deps);

  // Get config
  const config = deps.getConfig();
  const apiTimerDisplay = config.features?.api_timer?.display || 'sonnet-only';
  const statuslineConfig = config.features?.statusline as StatuslineConfig | undefined;
  const showRepo = statuslineConfig?.show_repo !== false; // Default to true

  // Build first line
  let firstLine = `🚅 ${modelName}`;

  // Handle API timer based on config
  if (apiWindow) {
    if (apiTimerDisplay === 'sonnet-only' && modelName.includes('Sonnet')) {
      firstLine = `🚅 ${modelName} (reset in ${apiWindow})`;
    } else if (apiTimerDisplay === 'show') {
      firstLine += ` | ⏰ ${apiWindow}`;
    }
  }

  // Add cost
  if (todaysCost !== '0.00') {
    const costNum = parseFloat(todaysCost);
    const emoji = getCostEmoji(costNum);
    firstLine += ` | ${emoji} $${todaysCost} today`;
  }

  // Add hourly rate
  if (hourlyRate) {
    const rateNum = parseFloat(hourlyRate.replace(/[^0-9.]/g, ''));
    const rateStr = rateNum > 20 ? `🔥 ${hourlyRate}` : hourlyRate;
    firstLine += ` | ${rateStr}`;
  }

  // Add tokens
  if (tokens) {
    firstLine += ` | ${tokens}`;
  }

  // Add 5h/weekly usage limits (including model-scoped, e.g. Fable)
  const usageLimits = formatUsageLimits(getUsageLimits(deps));
  if (usageLimits) {
    firstLine += ` | ${usageLimits}`;
  }

  // Build second line
  let secondLine = '';

  // Add repo name if enabled
  if (showRepo) {
    const repo = getRepoName(deps);
    if (repo) {
      secondLine = repo;
    }
  }

  // Check autoflow state
  const autoflow = getAutoflowState(deps);
  if (autoflow.active) {
    secondLine += secondLine
      ? ` | 🤖 Autoflow (${autoflow.continueCount}/3)`
      : `🤖 Autoflow (${autoflow.continueCount}/3)`;
  }

  if (branch) {
    secondLine += secondLine ? ` | ${branch}` : branch;
  }
  if (task) {
    secondLine += secondLine ? ` | ${task}` : task;
  }

  // Return two-line output
  return `${firstLine}\n${secondLine}`;
}

export async function runStatusline(
  deps: StatusLineDeps = defaultDeps,
  stdin: NodeJS.ReadableStream = process.stdin,
): Promise<CommandResult<{ output: string }>> {
  let input: StatusLineInput = {};
  try {
    const stdinData = await new Promise<string>((resolve) => {
      let data = '';
      stdin.on('data', (chunk) => {
        data += chunk;
      });
      stdin.on('end', () => resolve(data));
    });

    if (stdinData) {
      input = JSON.parse(stdinData);
    }
  } catch {
    // Ignore parse errors, use empty input
  }

  const output = generateStatusLine(input, deps);

  return {
    success: true,
    messages: [output],
    data: { output },
  };
}

if (import.meta.main) {
  runStatusline()
    .then((result) => {
      for (const message of result.messages ?? []) {
        console.log(message);
      }
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Statusline error:', error);
      process.exit(1);
    });
}
