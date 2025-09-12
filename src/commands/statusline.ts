#!/usr/bin/env bun
import { execSync as nodeExecSync } from 'node:child_process';
import { existsSync as nodeExistsSync, readFileSync as nodeReadFileSync } from 'node:fs';
import { Command } from 'commander';
import { getConfig as getConfigImpl } from '../lib/config';
import { getCurrentBranch as getCurrentBranchImpl } from '../lib/git-helpers';

interface StatusLineInput {
  model?: {
    display_name: string;
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
    const today = new Date().toISOString().split('T')[0];
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
 * Get usage info from ccusage statusline
 */
export function getUsageInfo(
  input: StatusLineInput,
  deps = defaultDeps,
): { hourlyRate: string; tokens: string; apiWindow: string } {
  try {
    const result = deps.execSync('bunx ccusage statusline', {
      encoding: 'utf-8',
      input: JSON.stringify(input),
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    // Extract hourly rate
    const rateMatch = result.match(/\$[\d.]+\/hr/);
    const hourlyRate = rateMatch ? rateMatch[0] : '';

    // Extract tokens
    const tokensMatch = result.match(/🧠 [\d,]+ \(\d+%\)/);
    const tokens = tokensMatch ? tokensMatch[0].replace('🧠 ', '') : '';

    // Extract API window time
    const windowMatch = result.match(/\(([^)]+)left\)/);
    const apiWindow = windowMatch ? windowMatch[1].replace(' left', '').trim() : '';

    return { hourlyRate, tokens, apiWindow };
  } catch {
    return { hourlyRate: '', tokens: '', apiWindow: '' };
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
  const { hourlyRate, tokens, apiWindow } = getUsageInfo(input, deps);
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

/**
 * Main function for CLI execution
 */
export async function runStatusline(): Promise<void> {
  // Read JSON input from stdin
  let input: StatusLineInput = {};
  try {
    const stdinData = await new Promise<string>((resolve) => {
      let data = '';
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });
      process.stdin.on('end', () => resolve(data));
    });

    if (stdinData) {
      input = JSON.parse(stdinData);
    }
  } catch {
    // Ignore parse errors, use empty input
  }

  const output = generateStatusLine(input);
  console.log(output);
}

// Create command for CLI
export const statuslineCommand = new Command('statusline')
  .description('Generate status line for Claude Code')
  .action(async () => {
    await runStatusline();
  });

// Run if executed directly
if (import.meta.main) {
  runStatusline().catch(console.error);
}
