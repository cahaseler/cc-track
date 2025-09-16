import { describe, expect, mock, test } from 'bun:test';
import {
  generateStatusLine,
  getActiveTask,
  getCostEmoji,
  getCurrentBranch,
  getTodaysCost,
  getUsageInfo,
  statuslineCommand,
} from './statusline';

// No mocking needed - statusline.ts doesn't import from claude-md

describe('statusline', () => {
  describe('getTodaysCost', () => {
    test('returns cost when ccusage returns valid data', () => {
      const today = new Date().toISOString().split('T')[0];
      const mockDeps = {
        execSync: mock(() =>
          JSON.stringify({
            daily: [
              { date: today, totalCost: 12.45 },
              { date: '2025-01-01', totalCost: 5.0 },
            ],
          }),
        ),
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        getConfig: mock(() => ({ features: {} })),
        getCurrentBranch: mock((_cwd: string) => ''),
      };

      const result = getTodaysCost({ model: { display_name: 'Claude Sonnet' } }, mockDeps);
      expect(result).toBe('12.45');
    });

    test('returns 0.00 when ccusage fails', () => {
      const mockDeps = {
        execSync: mock(() => {
          throw new Error('ccusage not found');
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        getConfig: mock(() => ({ features: {} })),
        getCurrentBranch: mock((_cwd: string) => ''),
      };

      const result = getTodaysCost({ model: { display_name: 'Claude Sonnet' } }, mockDeps);
      expect(result).toBe('0.00');
    });

    test('returns 0.00 when no data for today', () => {
      const mockDeps = {
        execSync: mock(() =>
          JSON.stringify({
            daily: [{ date: '2025-01-01', totalCost: 5.0 }],
          }),
        ),
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        getConfig: mock(() => ({ features: {} })),
        getCurrentBranch: mock((_cwd: string) => ''),
      };

      const result = getTodaysCost({ model: { display_name: 'Claude Sonnet' } }, mockDeps);
      expect(result).toBe('0.00');
    });
  });

  describe('getUsageInfo', () => {
    test('extracts hourly rate, tokens, and API window', () => {
      const mockDeps = {
        execSync: mock(() => '💰 $15.50/hr | 🧠 125,432 (45%) | (23m left)'),
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        getConfig: mock(() => ({ features: {} })),
        getCurrentBranch: mock((_cwd: string) => ''),
      };

      const result = getUsageInfo({ model: { display_name: 'Claude Sonnet' } }, mockDeps);
      expect(result.hourlyRate).toBe('$15.50/hr');
      expect(result.tokens).toBe('125,432 (45%)');
      expect(result.apiWindow).toBe('23m');
    });

    test('handles missing ccusage gracefully', () => {
      const mockDeps = {
        execSync: mock(() => {
          throw new Error('ccusage not found');
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        getConfig: mock(() => ({ features: {} })),
        getCurrentBranch: mock((_cwd: string) => ''),
      };

      const result = getUsageInfo({}, mockDeps);
      expect(result.hourlyRate).toBe('');
      expect(result.tokens).toBe('');
      expect(result.apiWindow).toBe('');
    });
  });

  describe('getCurrentBranch', () => {
    test('returns current git branch', () => {
      const mockDeps = {
        execSync: mock(() => 'feature/new-feature\n'),
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        getConfig: mock(() => ({ features: {} })),
        getCurrentBranch: mock((_cwd: string) => 'feature/new-feature'),
      };

      const result = getCurrentBranch(mockDeps);
      expect(result).toBe('feature/new-feature');
    });

    test('handles non-git directories', () => {
      const mockDeps = {
        execSync: mock(() => {
          throw new Error('not a git repository');
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        getConfig: mock(() => ({ features: {} })),
        getCurrentBranch: mock((_cwd: string) => ''),
      };

      const result = getCurrentBranch(mockDeps);
      expect(result).toBe('');
    });
  });

  describe('getActiveTask', () => {
    test('extracts active task from CLAUDE.md', () => {
      const mockDeps = {
        execSync: mock(() => ''),
        existsSync: mock((path: string) => {
          if (path === 'CLAUDE.md') return true;
          if (path === '.claude/tasks/TASK_026.md') return true;
          return false;
        }),
        readFileSync: mock((path: string) => {
          if (path === 'CLAUDE.md') {
            return '# Project\n\n## Active Task\n@.claude/tasks/TASK_026.md\n';
          }
          if (path === '.claude/tasks/TASK_026.md') {
            return '# Refactor CLI Tool\n\nTask description...';
          }
          return '';
        }),
        getConfig: mock(() => ({ features: {} })),
        getCurrentBranch: mock((_cwd: string) => ''),
      };

      const result = getActiveTask(mockDeps);
      expect(result).toBe('Refactor CLI Tool');
    });

    test('shows "No active task" when no_active_task.md is referenced', () => {
      const mockDeps = {
        execSync: mock(() => ''),
        existsSync: mock((path: string) => path === 'CLAUDE.md'),
        readFileSync: mock(() => '## Active Task\n@.claude/no_active_task.md\n'),
        getConfig: mock(() => ({ features: {} })),
        getCurrentBranch: mock((_cwd: string) => ''),
      };

      const result = getActiveTask(mockDeps);
      expect(result).toBe('No active task');
    });

    test('handles missing CLAUDE.md', () => {
      const mockDeps = {
        execSync: mock(() => ''),
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        getConfig: mock(() => ({ features: {} })),
        getCurrentBranch: mock((_cwd: string) => ''),
      };

      const result = getActiveTask(mockDeps);
      expect(result).toBe('');
    });
  });

  describe('getCostEmoji', () => {
    test('returns correct emoji for different cost tiers', () => {
      expect(getCostEmoji(0.5)).toBe('🪙');
      expect(getCostEmoji(50)).toBe('💵');
      expect(getCostEmoji(100)).toBe('💸');
      expect(getCostEmoji(200)).toBe('💰');
      expect(getCostEmoji(300)).toBe('🤑');
    });

    test('boundary values for cost tiers', () => {
      // Lower boundaries
      expect(getCostEmoji(0)).toBe('🪙');
      expect(getCostEmoji(49.99)).toBe('🪙');
      expect(getCostEmoji(50)).toBe('💵');

      // Mid boundaries
      expect(getCostEmoji(99.99)).toBe('💵');
      expect(getCostEmoji(100)).toBe('💸');

      // Upper boundaries
      expect(getCostEmoji(199.99)).toBe('💸');
      expect(getCostEmoji(200)).toBe('💰');

      // Highest boundaries
      expect(getCostEmoji(299.99)).toBe('💰');
      expect(getCostEmoji(300)).toBe('🤑');
      expect(getCostEmoji(1000)).toBe('🤑');
    });
  });

  describe('generateStatusLine integration', () => {
    test('generates complete two-line output with all features', () => {
      const today = new Date().toISOString().split('T')[0];

      const mockDeps = {
        execSync: mock((cmd: string) => {
          if (cmd.includes('ccusage daily')) {
            return JSON.stringify({
              daily: [{ date: today, totalCost: 75.5 }],
            });
          }
          if (cmd.includes('ccusage statusline')) {
            return '💰 $12.25/hr | 🧠 89,234 (72%) | (45m left)';
          }
          if (cmd.includes('git branch --show-current')) {
            return 'main\n';
          }
          return '';
        }),
        existsSync: mock((path: string) => {
          if (path === 'CLAUDE.md') return true;
          if (path === '.claude/tasks/TASK_001.md') return true;
          return false;
        }),
        readFileSync: mock((path: string) => {
          if (path === 'CLAUDE.md') {
            return '@.claude/tasks/TASK_001.md';
          }
          if (path === '.claude/tasks/TASK_001.md') {
            return '# Fix authentication bug';
          }
          return '';
        }),
        getConfig: mock(() => ({
          features: {
            api_timer: {
              display: 'sonnet-only',
            },
          },
        })),
        getCurrentBranch: mock((_cwd: string) => 'main'),
      };

      const result = generateStatusLine({ model: { display_name: 'Claude Sonnet' } }, mockDeps);

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
      const mockDeps = {
        execSync: mock(() => {
          throw new Error('All commands fail');
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        getConfig: mock(() => ({ features: {} })),
        getCurrentBranch: mock((_cwd: string) => ''),
      };

      const result = generateStatusLine({}, mockDeps);
      expect(result).toBe('🚅 Unknown\n');
    });

    test('adds fire emoji for high hourly rate', () => {
      const mockDeps = {
        execSync: mock((cmd: string) => {
          if (cmd.includes('ccusage statusline')) {
            return '$25.00/hr';
          }
          return '';
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        getConfig: mock(() => ({ features: {} })),
        getCurrentBranch: mock((_cwd: string) => ''),
      };

      const result = generateStatusLine({}, mockDeps);
      expect(result).toContain('🔥 $25.00/hr');
    });

    test('shows timer for Sonnet in sonnet-only mode', () => {
      const mockDeps = {
        execSync: mock((cmd: string) => {
          if (cmd.includes('ccusage statusline')) {
            return '(15m left)';
          }
          return '';
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        getConfig: mock(() => ({
          features: {
            api_timer: {
              display: 'sonnet-only',
            },
          },
        })),
        getCurrentBranch: mock((_cwd: string) => 'main'),
      };

      const result = generateStatusLine({ model: { display_name: 'Claude Sonnet' } }, mockDeps);
      expect(result).toContain('(reset in 15m)');
    });

    test('hides timer for non-Sonnet in sonnet-only mode', () => {
      const mockDeps = {
        execSync: mock((cmd: string) => {
          if (cmd.includes('ccusage statusline')) {
            return '(15m left)';
          }
          return '';
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        getConfig: mock(() => ({
          features: {
            api_timer: {
              display: 'sonnet-only',
            },
          },
        })),
        getCurrentBranch: mock((_cwd: string) => 'main'),
      };

      const result = generateStatusLine({ model: { display_name: 'Claude Haiku' } }, mockDeps);
      expect(result).not.toContain('reset in');
    });
  });

  describe('statuslineCommand', () => {
    test('has correct name and description', () => {
      expect(statuslineCommand.name()).toBe('statusline');
      expect(statuslineCommand.description()).toBe('Generate status line for Claude Code');
    });

    test('has no required arguments', () => {
      const args = statuslineCommand.args;
      expect(args).toHaveLength(0);
    });

    test('has no options', () => {
      const options = statuslineCommand.options;
      expect(options).toHaveLength(0);
    });

    test('has an action handler', () => {
      expect(statuslineCommand.commands).toHaveLength(0);
      // Verify the command has an action handler configured
      const handler = (statuslineCommand as unknown as { _actionHandler: unknown })._actionHandler;
      expect(typeof handler).toBe('function');
    });
  });

  describe('direct execution (import.meta.main)', () => {
    test('handles errors gracefully when executed directly', async () => {
      // This test ensures that if runStatusline() rejects, the process would
      // exit with code 1 and log the error. We can't easily test import.meta.main
      // directly, but we can verify the error handling logic exists in the file.
      const fs = await import('node:fs');
      const path = await import('node:path');
      const fileContent = fs.readFileSync(path.resolve(__dirname, './statusline.ts'), 'utf-8');

      // Check that we have proper error handling with .catch()
      expect(fileContent).toContain('.catch(');
      expect(fileContent).toContain('process.exit(1)');

      // Check that we handle unsuccessful results
      expect(fileContent).toContain('if (!result.success)');
    });
  });

  describe('git repository handling', () => {
    test('works gracefully outside git repository', () => {
      // Mock deps to avoid calling external commands
      const mockDeps = {
        execSync: mock(() => '{"daily": []}'), // Mock ccusage response
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        getConfig: mock(() => ({ features: {} })),
        getCurrentBranch: mock((_cwd: string) => ''), // Empty string for no git
        getActiveTaskId: mock(() => null),
      };

      // Verify statusline generates output without branch (when not in git repo)
      const output = generateStatusLine(
        {
          model: { display_name: 'Sonnet' },
          cost: 10,
          branch: '', // Empty branch simulates not being in a git repo
          task: null,
          hourlyRate: '',
          tokens: '',
          apiWindow: '',
          showTimer: false,
        },
        mockDeps,
      );

      expect(output).toContain('🚅 Sonnet');
      expect(output).not.toContain('fatal:');
      expect(output).not.toContain('error');
      expect(output).toContain('\n'); // Two-line output

      // Second line should be empty when no branch/task
      const lines = output.split('\n');
      expect(lines[1]).toBe('');
    });

    test('getCurrentBranch suppresses git stderr output', async () => {
      // This test verifies that getCurrentBranch in git-helpers.ts
      // uses stdio options to suppress stderr
      const gitHelpers = await import('../lib/git-helpers');
      const mockExec = mock((cmd: string, options?: any) => {
        // Verify stdio option is passed to suppress stderr
        expect(options?.stdio).toEqual(['pipe', 'pipe', 'ignore']);
        throw new Error('not a git repository');
      });

      const helpers = new gitHelpers.GitHelpers(mockExec);
      const branch = helpers.getCurrentBranch('/tmp');

      expect(branch).toBe('');
      expect(mockExec).toHaveBeenCalledTimes(1);
    });
  });
});
