#!/usr/bin/env bun
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { Command } from 'commander';
import { getConfig } from '../lib/config';

interface StatusLineInput {
  model?: {
    display_name: string;
  };
}

/**
 * Get today's cost from ccusage
 */
function getTodaysCost(input: StatusLineInput): string {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = execSync('bunx ccusage daily --json', {
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
function getUsageInfo(input: StatusLineInput): { hourlyRate: string; tokens: string; apiWindow: string } {
  try {
    const result = execSync('bunx ccusage statusline', {
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
function getCurrentBranch(): string {
  try {
    return execSync('git branch --show-current', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Get active task from CLAUDE.md
 */
function getActiveTask(): string {
  const claudeMdPath = 'CLAUDE.md';
  if (!existsSync(claudeMdPath)) {
    return '';
  }

  const content = readFileSync(claudeMdPath, 'utf-8');
  const taskMatch = content.match(/@\.claude\/tasks\/(TASK_\d+\.md)/);

  if (!taskMatch) {
    if (content.includes('@.claude/no_active_task.md')) {
      return 'No active task';
    }
    return '';
  }

  const taskPath = taskMatch[0].replace('@', '');
  if (!existsSync(taskPath)) {
    return '';
  }

  const taskContent = readFileSync(taskPath, 'utf-8');
  const firstLine = taskContent.split('\n')[0];
  return firstLine.replace(/^# /, '');
}

/**
 * Get cost emoji based on amount
 */
function getCostEmoji(cost: number): string {
  if (cost >= 300) return '🤑';
  if (cost >= 200) return '💰';
  if (cost >= 100) return '💸';
  if (cost >= 50) return '💵';
  return '🪙';
}

/**
 * Generate statusline output
 */
export function generateStatusLine(input: StatusLineInput): string {
  const modelName = input.model?.display_name || 'Unknown';
  const todaysCost = getTodaysCost(input);
  const { hourlyRate, tokens, apiWindow } = getUsageInfo(input);
  const branch = getCurrentBranch();
  const task = getActiveTask();

  // Get API timer config
  const config = getConfig();
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
