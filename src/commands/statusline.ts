#!/usr/bin/env bun
import { execSync as nodeExecSync } from 'node:child_process';
import { existsSync as nodeExistsSync, readFileSync as nodeReadFileSync } from 'node:fs';
import { Command } from 'commander';
import { getConfig as getConfigImpl } from '../lib/config';
import { getCurrentBranch as getCurrentBranchImpl } from '../lib/git-helpers';
import type { CommandDeps, CommandResult, PartialCommandDeps } from './context';
import { applyCommandResult, handleCommandException, resolveCommandDeps } from './context';

interface StatusLineInput {
  model?: {
    display_name: string;
  };
  cost?: {
    total_cost_usd?: number;
    context_usage_percent?: number;
    hourly_rate_usd?: number;
  };
}

// Dependency injection for testing
interface StatusLineDeps {
  execSync: typeof nodeExecSync;
  existsSync: typeof nodeExistsSync;
  readFileSync: typeof nodeReadFileSync;
  getConfig: typeof getConfigImpl;
  getCurrentBranch: typeof getCurrentBranchImpl;
}

const defaultDeps: StatusLineDeps = {
  execSync: nodeExecSync,
  existsSync: nodeExistsSync,
  readFileSync: nodeReadFileSync,
  getConfig: getConfigImpl,
  getCurrentBranch: getCurrentBranchImpl,
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
 * Get usage info from Claude Code's native cost data
 */
export function getUsageInfo(input: StatusLineInput): { hourlyRate: string; tokens: string } {
  const hourlyRate = input.cost?.hourly_rate_usd
    ? `$${input.cost.hourly_rate_usd.toFixed(2)}/hr`
    : '';

  const contextPercent = input.cost?.context_usage_percent;
  let tokens = '';
  if (contextPercent !== undefined && contextPercent !== null) {
    // Sonnet 4.5 has 200K context window
    const totalTokens = Math.round((contextPercent / 100) * 200000);
    tokens = `${totalTokens.toLocaleString()} (${contextPercent}%)`;
  }

  return { hourlyRate, tokens };
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
  const claudeMdPath = 'CLAUDE.md';
  if (!deps.existsSync(claudeMdPath)) {
    return '';
  }

  const content = deps.readFileSync(claudeMdPath, 'utf-8');
  const taskMatch = content.match(/@\.claude\/tasks\/(TASK_\d+\.md)/);

  if (!taskMatch) {
    if (content.includes('@.claude/no_active_task.md')) {
      return 'No active task';
    }
    return '';
  }

  const taskFilePath = `.claude/tasks/${taskMatch[1]}`;
  if (!deps.existsSync(taskFilePath)) {
    return '';
  }

  const taskContent = deps.readFileSync(taskFilePath, 'utf-8');
  const titleMatch = taskContent.match(/^# (.+)$/m);
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
  const { hourlyRate, tokens } = getUsageInfo(input);
  const branch = getCurrentBranch(deps);
  const task = getActiveTask(deps);

  // Build first line
  let firstLine = `🚅 ${modelName}`;

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

function mapStatuslineDeps(deps: CommandDeps): StatusLineDeps {
  return {
    execSync: deps.childProcess.execSync,
    existsSync: deps.fs.existsSync,
    readFileSync: deps.fs.readFileSync,
    getConfig: deps.config.getConfig,
    getCurrentBranch: deps.git.getCurrentBranch,
  };
}

export function createStatuslineCommand(overrides?: PartialCommandDeps): Command {
  return new Command('statusline').description('Generate status line for Claude Code').action(async () => {
    const deps = resolveCommandDeps(overrides);
    try {
      const result = await runStatusline(mapStatuslineDeps(deps));
      applyCommandResult(result, deps);
    } catch (error) {
      handleCommandException(error, deps);
    }
  });
}

export const statuslineCommand = createStatuslineCommand();

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
