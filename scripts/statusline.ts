#!/usr/bin/env bun
import { execSync as nodeExecSync } from 'node:child_process';
import {
  existsSync as nodeExistsSync,
  mkdirSync as nodeMkdirSync,
  readFileSync as nodeReadFileSync,
  writeFileSync as nodeWriteFileSync,
} from 'node:fs';
import { join } from 'node:path/posix';
import { getActiveTaskId } from '../skills/cc-track-tools/lib/claude-md';

// Simple result type for statusline
interface CommandResult<T = unknown> {
  success: boolean;
  messages?: string[];
  data?: T;
}

import { getConfig as getConfigImpl } from '../skills/cc-track-tools/lib/config';
import { getCurrentBranch as getCurrentBranchImpl } from '../skills/cc-track-tools/lib/git-helpers';
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
  getConfig: typeof getConfigImpl;
  getCurrentBranch: typeof getCurrentBranchImpl;
  getActiveTaskId: typeof getActiveTaskId;
  getActiveSpecDirectory: typeof getActiveSpecDirectory;
}

const defaultDeps: StatusLineDeps = {
  execSync: nodeExecSync,
  existsSync: nodeExistsSync,
  readFileSync: nodeReadFileSync,
  getConfig: getConfigImpl,
  getCurrentBranch: getCurrentBranchImpl,
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

  // Get API timer config
  const config = deps.getConfig();
  const apiTimerDisplay = config.features?.api_timer?.display || 'sonnet-only';

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

  // Build second line
  let secondLine = '';
  if (branch) {
    secondLine = branch;
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
