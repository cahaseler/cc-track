import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { generateStatusLine, statuslineCommand } from './statusline';

// Mock all external dependencies
mock.module('node:child_process', () => ({
  execSync: mock(() => ''),
}));

mock.module('node:fs', () => ({
  existsSync: mock(() => false),
  readFileSync: mock(() => ''),
}));

mock.module('../lib/config', () => ({
  getConfig: mock(() => ({
    features: {
      api_timer: {
        display: 'sonnet-only',
      },
    },
  })),
}));

describe('statusline', () => {
  let mockExecSync: ReturnType<typeof mock>;
  let mockExistsSync: ReturnType<typeof mock>;
  let mockReadFileSync: ReturnType<typeof mock>;

  beforeEach(() => {
    mockExecSync = execSync as ReturnType<typeof mock>;
    mockExistsSync = existsSync as ReturnType<typeof mock>;
    mockReadFileSync = readFileSync as ReturnType<typeof mock>;
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('getTodaysCost', () => {
    test('returns cost when ccusage returns valid data', () => {
      const today = new Date().toISOString().split('T')[0];
      mockExecSync.mockImplementation(() =>
        JSON.stringify({
          daily: [
            { date: today, totalCost: 12.45 },
            { date: '2025-01-01', totalCost: 5.00 },
          ],
        }),
      );

      const result = generateStatusLine({ model: { display_name: 'Claude Sonnet' } });
      expect(result).toContain('$12.45 today');
    });

    test('returns 0.00 when ccusage fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('ccusage not found');
      });

      const result = generateStatusLine({ model: { display_name: 'Claude Sonnet' } });
      expect(result).not.toContain('today');
    });

    test('returns 0.00 when no data for today', () => {
      mockExecSync.mockImplementation(() =>
        JSON.stringify({
          daily: [{ date: '2025-01-01', totalCost: 5.00 }],
        }),
      );

      const result = generateStatusLine({ model: { display_name: 'Claude Sonnet' } });
      expect(result).not.toContain('today');
    });
  });

  describe('getUsageInfo', () => {
    test('extracts hourly rate, tokens, and API window', () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('ccusage daily')) {
          return JSON.stringify({ daily: [] });
        }
        if (cmd.includes('ccusage statusline')) {
          return '💰 $15.50/hr | 🧠 125,432 (45%) | (23m left)';
        }
        return '';
      });

      const result = generateStatusLine({ model: { display_name: 'Claude Sonnet' } });
      expect(result).toContain('$15.50/hr');
      expect(result).toContain('125,432 (45%)');
      expect(result).toContain('(reset in 23m)');
    });

    test('handles missing ccusage gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('ccusage not found');
      });

      const result = generateStatusLine({ model: { display_name: 'Claude Sonnet' } });
      expect(result).toContain('🚅 Claude Sonnet');
      expect(result).not.toContain('/hr');
    });
  });

  describe('getCurrentBranch', () => {
    test('returns current git branch', () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git branch --show-current')) {
          return 'feature/new-feature\n';
        }
        return '';
      });

      const result = generateStatusLine({});
      expect(result).toContain('feature/new-feature');
    });

    test('handles non-git directories', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });

      const result = generateStatusLine({});
      expect(result).toBe('🚅 Unknown\n');
    });
  });

  describe('getActiveTask', () => {
    test('extracts active task from CLAUDE.md', () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path === 'CLAUDE.md') return true;
        if (path === '.claude/tasks/TASK_026.md') return true;
        return false;
      });

      mockReadFileSync.mockImplementation((path: string) => {
        if (path === 'CLAUDE.md') {
          return '# Project\n\n## Active Task\n@.claude/tasks/TASK_026.md\n';
        }
        if (path === '.claude/tasks/TASK_026.md') {
          return '# Refactor CLI Tool\n\nTask description...';
        }
        return '';
      });

      const result = generateStatusLine({});
      expect(result).toContain('Refactor CLI Tool');
    });

    test('shows "No active task" when no_active_task.md is referenced', () => {
      mockExistsSync.mockImplementation((path: string) => path === 'CLAUDE.md');
      mockReadFileSync.mockImplementation(() => '## Active Task\n@.claude/no_active_task.md\n');

      const result = generateStatusLine({});
      expect(result).toContain('No active task');
    });

    test('handles missing CLAUDE.md', () => {
      mockExistsSync.mockImplementation(() => false);

      const result = generateStatusLine({});
      expect(result).not.toContain('Task');
    });
  });

  describe('getCostEmoji', () => {
    test('returns correct emoji for different cost tiers', () => {
      const testCases = [
        { cost: 0.5, expected: '🪙' },
        { cost: 50, expected: '💵' },
        { cost: 100, expected: '💸' },
        { cost: 200, expected: '💰' },
        { cost: 300, expected: '🤑' },
      ];

      for (const { cost, expected } of testCases) {
        mockExecSync.mockImplementation((cmd: string) => {
          if (cmd.includes('ccusage daily')) {
            const today = new Date().toISOString().split('T')[0];
            return JSON.stringify({
              daily: [{ date: today, totalCost: cost }],
            });
          }
          return '';
        });

        const result = generateStatusLine({});
        expect(result).toContain(`${expected} $${cost.toFixed(2)} today`);
      }
    });
  });

  describe('API timer display modes', () => {
    test('shows timer for Sonnet in sonnet-only mode', () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('ccusage statusline')) {
          return '(15m left)';
        }
        return '';
      });

      const result = generateStatusLine({ model: { display_name: 'Claude Sonnet' } });
      expect(result).toContain('(reset in 15m)');
    });

    test('hides timer for non-Sonnet in sonnet-only mode', () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('ccusage statusline')) {
          return '(15m left)';
        }
        return '';
      });

      const result = generateStatusLine({ model: { display_name: 'Claude Haiku' } });
      expect(result).not.toContain('reset in');
    });
  });

  describe('generateStatusLine integration', () => {
    test('generates complete two-line output with all features', () => {
      const today = new Date().toISOString().split('T')[0];
      
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('ccusage daily')) {
          return JSON.stringify({
            daily: [{ date: today, totalCost: 75.50 }],
          });
        }
        if (cmd.includes('ccusage statusline')) {
          return '💰 $12.25/hr | 🧠 89,234 (72%) | (45m left)';
        }
        if (cmd.includes('git branch --show-current')) {
          return 'main\n';
        }
        return '';
      });

      mockExistsSync.mockImplementation((path: string) => {
        if (path === 'CLAUDE.md') return true;
        if (path === '.claude/tasks/TASK_001.md') return true;
        return false;
      });

      mockReadFileSync.mockImplementation((path: string) => {
        if (path === 'CLAUDE.md') {
          return '@.claude/tasks/TASK_001.md';
        }
        if (path === '.claude/tasks/TASK_001.md') {
          return '# Fix authentication bug';
        }
        return '';
      });

      const result = generateStatusLine({ model: { display_name: 'Claude Sonnet' } });
      
      const lines = result.split('\n');
      expect(lines).toHaveLength(2);
      
      // First line should have model, cost, rate, tokens
      expect(lines[0]).toContain('🚅 Claude Sonnet');
      expect(lines[0]).toContain('(reset in 45m)');
      expect(lines[0]).toContain('💵 $75.50 today');
      expect(lines[0]).toContain('$12.25/hr');
      expect(lines[0]).toContain('89,234 (72%)');
      
      // Second line should have branch and task
      expect(lines[1]).toContain('main');
      expect(lines[1]).toContain('Fix authentication bug');
    });

    test('handles minimal input gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('All commands fail');
      });
      mockExistsSync.mockImplementation(() => false);

      const result = generateStatusLine({});
      expect(result).toBe('🚅 Unknown\n');
    });

    test('adds fire emoji for high hourly rate', () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('ccusage statusline')) {
          return '$25.00/hr';
        }
        return '';
      });

      const result = generateStatusLine({});
      expect(result).toContain('🔥 $25.00/hr');
    });
  });

  describe('statuslineCommand', () => {
    test('has correct name and description', () => {
      expect(statuslineCommand.name()).toBe('statusline');
      expect(statuslineCommand.description()).toBe('Generate status line for Claude Code');
    });
  });
});