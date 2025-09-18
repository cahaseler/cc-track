import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createMockLogger } from '../test-utils/command-mocks';
import { runValidationChecks, type ValidationDeps } from './validation';

describe('validation', () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('runValidationChecks', () => {
    test('passes validation when TypeScript is disabled', async () => {
      // Mock dependencies
      const mockExecSync = mock(() => '');
      const mockExistsSync = mock(() => true);
      const mockReadFileSync = mock((path: string) => {
        if (path.includes('package.json')) {
          return JSON.stringify({ scripts: {} }); // No test script
        }
        if (path.includes('TASK_001.md')) {
          return '# Test Task\n\n**Status:** in_progress';
        }
        return '';
      });

      const deps: ValidationDeps = {
        execSync: mockExecSync,
        fileOps: {
          existsSync: mockExistsSync,
          readFileSync: mockReadFileSync,
        },
        getConfig: mock(() => ({
          hooks: {
            edit_validation: {
              typecheck: { enabled: false },
              lint: { enabled: false },
            },
          },
        })),
        getLintConfig: mock(() => ({ enabled: false })),
        getTestConfig: mock(() => ({ enabled: false })),
        getActiveTaskId: mock(() => 'TASK_001'),
        isWipCommit: mock(() => false),
        getLintParser: mock(() => ({ parseOutput: () => ({ issueCount: 0 }) })),
        logger: createMockLogger(),
      };

      const result = await runValidationChecks('/test/project', deps);

      expect(result.success).toBe(true);
      expect(result.readyForCompletion).toBe(true);
      expect(result.validation.typescript?.passed).toBe(true);
      expect(result.validation.lint?.passed).toBe(true);

      // TypeScript command should never be called when disabled
      expect(mockExecSync).not.toHaveBeenCalledWith(expect.stringContaining('tsc'), expect.any(Object));
    });

    test('fails validation when TypeScript is enabled and has errors', async () => {
      // Mock TypeScript failure
      const mockExecSync = mock((command: string) => {
        if (command.includes('tsc')) {
          const error = new Error('TypeScript compilation failed') as any;
          error.stderr = 'src/test.ts(5,10): error TS2304: Cannot find name "foo".';
          throw error;
        }
        if (command.includes('git status')) {
          return '';
        }
        if (command.includes('git branch')) {
          return 'main';
        }
        if (command.includes('git log')) {
          return '';
        }
        return '';
      });

      const mockExistsSync = mock(() => true);
      const mockReadFileSync = mock((path: string) => {
        if (path.includes('package.json')) {
          return JSON.stringify({ scripts: {} });
        }
        if (path.includes('TASK_001.md')) {
          return '# Test Task\n\n**Status:** in_progress';
        }
        return '';
      });

      const deps: ValidationDeps = {
        execSync: mockExecSync,
        fileOps: {
          existsSync: mockExistsSync,
          readFileSync: mockReadFileSync,
        },
        getConfig: mock(() => ({
          hooks: {
            edit_validation: {
              typecheck: { enabled: true, command: 'bunx tsc --noEmit' },
              lint: { enabled: false },
            },
          },
        })),
        getLintConfig: mock(() => ({ enabled: false })),
        getTestConfig: mock(() => ({ enabled: false })),
        getActiveTaskId: mock(() => 'TASK_001'),
        isWipCommit: mock(() => false),
        getLintParser: mock(() => ({ parseOutput: () => ({ issueCount: 0 }) })),
        logger: createMockLogger(),
      };

      const result = await runValidationChecks('/test/project', deps);

      expect(result.success).toBe(true);
      expect(result.readyForCompletion).toBe(false); // Should fail due to TypeScript errors
      expect(result.validation.typescript?.passed).toBe(false);
      expect(result.validation.typescript?.errorCount).toBe(1);

      // TypeScript command should be called when enabled
      expect(mockExecSync).toHaveBeenCalledWith('bunx tsc --noEmit', expect.objectContaining({ cwd: '/test/project' }));
    });

    test('passes validation when TypeScript is enabled and has no errors', async () => {
      // Mock successful TypeScript check
      const mockExecSync = mock((command: string) => {
        if (command.includes('git status')) {
          return '';
        }
        if (command.includes('git branch')) {
          return 'main';
        }
        if (command.includes('git log')) {
          return '';
        }
        return ''; // TypeScript success returns empty
      });

      const mockExistsSync = mock(() => true);
      const mockReadFileSync = mock((path: string) => {
        if (path.includes('package.json')) {
          return JSON.stringify({ scripts: {} });
        }
        if (path.includes('TASK_001.md')) {
          return '# Test Task\n\n**Status:** in_progress';
        }
        return '';
      });

      const deps: ValidationDeps = {
        execSync: mockExecSync,
        fileOps: {
          existsSync: mockExistsSync,
          readFileSync: mockReadFileSync,
        },
        getConfig: mock(() => ({
          hooks: {
            edit_validation: {
              typecheck: { enabled: true, command: 'bunx tsc --noEmit' },
              lint: { enabled: false },
            },
          },
        })),
        getLintConfig: mock(() => ({ enabled: false })),
        getTestConfig: mock(() => ({ enabled: false })),
        getActiveTaskId: mock(() => 'TASK_001'),
        isWipCommit: mock(() => false),
        getLintParser: mock(() => ({ parseOutput: () => ({ issueCount: 0 }) })),
        logger: createMockLogger(),
      };

      const result = await runValidationChecks('/test/project', deps);

      expect(result.success).toBe(true);
      expect(result.readyForCompletion).toBe(true);
      expect(result.validation.typescript?.passed).toBe(true);

      // TypeScript command should be called when enabled
      expect(mockExecSync).toHaveBeenCalledWith('bunx tsc --noEmit', expect.objectContaining({ cwd: '/test/project' }));
    });

    test('handles missing active task', async () => {
      const deps: ValidationDeps = {
        execSync: mock(() => ''),
        fileOps: {
          existsSync: mock(() => true),
          readFileSync: mock(() => ''),
        },
        getConfig: mock(() => ({})),
        getLintConfig: mock(() => ({ enabled: false })),
        getTestConfig: mock(() => ({ enabled: false })),
        getActiveTaskId: mock(() => null), // No active task
        isWipCommit: mock(() => false),
        getLintParser: mock(() => ({ parseOutput: () => ({ issueCount: 0 }) })),
        logger: createMockLogger(),
      };

      const result = await runValidationChecks('/test/project', deps);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active task found');
      expect(result.task.exists).toBe(false);
    });

    test('uses custom TypeScript command when configured', async () => {
      const customCommand = 'npx tsc --strict --noEmit';

      const mockExecSync = mock((command: string) => {
        if (command.includes('git status')) {
          return '';
        }
        if (command.includes('git branch')) {
          return 'main';
        }
        if (command.includes('git log')) {
          return '';
        }
        return '';
      });

      const mockExistsSync = mock(() => true);
      const mockReadFileSync = mock((path: string) => {
        if (path.includes('package.json')) {
          return JSON.stringify({ scripts: {} });
        }
        if (path.includes('TASK_001.md')) {
          return '# Test Task\n\n**Status:** in_progress';
        }
        return '';
      });

      const deps: ValidationDeps = {
        execSync: mockExecSync,
        fileOps: {
          existsSync: mockExistsSync,
          readFileSync: mockReadFileSync,
        },
        getConfig: mock(() => ({
          hooks: {
            edit_validation: {
              typecheck: { enabled: true, command: customCommand },
              lint: { enabled: false },
            },
          },
        })),
        getLintConfig: mock(() => ({ enabled: false })),
        getTestConfig: mock(() => ({ enabled: false })),
        getActiveTaskId: mock(() => 'TASK_001'),
        isWipCommit: mock(() => false),
        getLintParser: mock(() => ({ parseOutput: () => ({ issueCount: 0 }) })),
        logger: createMockLogger(),
      };

      const result = await runValidationChecks('/test/project', deps);

      expect(result.success).toBe(true);
      expect(result.validation.typescript?.passed).toBe(true);

      // Should use the custom command
      expect(mockExecSync).toHaveBeenCalledWith(customCommand, expect.objectContaining({ cwd: '/test/project' }));
    });

    test('passes validation when tests are disabled', async () => {
      const mockExecSync = mock((command: string) => {
        if (command.includes('git status')) {
          return '';
        }
        if (command.includes('git branch')) {
          return 'main';
        }
        if (command.includes('git log')) {
          return '';
        }
        return '';
      });

      const mockExistsSync = mock(() => true);
      const mockReadFileSync = mock((path: string) => {
        if (path.includes('package.json')) {
          return JSON.stringify({ scripts: { test: 'bun test' } });
        }
        if (path.includes('TASK_001.md')) {
          return '# Test Task\n\n**Status:** in_progress';
        }
        return '';
      });

      const deps: ValidationDeps = {
        execSync: mockExecSync,
        fileOps: {
          existsSync: mockExistsSync,
          readFileSync: mockReadFileSync,
        },
        getConfig: mock(() => ({})),
        getLintConfig: mock(() => ({ enabled: false })),
        getTestConfig: mock(() => ({ enabled: false })),
        getActiveTaskId: mock(() => 'TASK_001'),
        isWipCommit: mock(() => false),
        getLintParser: mock(() => ({ parseOutput: () => ({ issueCount: 0 }) })),
        logger: createMockLogger(),
      };

      const result = await runValidationChecks('/test/project', deps);

      expect(result.success).toBe(true);
      expect(result.readyForCompletion).toBe(true);
      expect(result.validation.tests?.passed).toBe(true);

      // Tests should not be executed when disabled
      expect(mockExecSync).not.toHaveBeenCalledWith(expect.stringContaining('test'), expect.any(Object));
    });

    test('uses custom test command when configured', async () => {
      const customTestCommand = 'npm test';

      const mockExecSync = mock((command: string) => {
        if (command.includes('git status')) {
          return '';
        }
        if (command.includes('git branch')) {
          return 'main';
        }
        if (command.includes('git log')) {
          return '';
        }
        return '';
      });

      const mockExistsSync = mock(() => true);
      const mockReadFileSync = mock((path: string) => {
        if (path.includes('package.json')) {
          return JSON.stringify({ scripts: { test: 'npm test' } });
        }
        if (path.includes('TASK_001.md')) {
          return '# Test Task\n\n**Status:** in_progress';
        }
        return '';
      });

      const deps: ValidationDeps = {
        execSync: mockExecSync,
        fileOps: {
          existsSync: mockExistsSync,
          readFileSync: mockReadFileSync,
        },
        getConfig: mock(() => ({})),
        getLintConfig: mock(() => ({ enabled: false })),
        getTestConfig: mock(() => ({ enabled: true, command: customTestCommand })),
        getActiveTaskId: mock(() => 'TASK_001'),
        isWipCommit: mock(() => false),
        getLintParser: mock(() => ({ parseOutput: () => ({ issueCount: 0 }) })),
        logger: createMockLogger(),
      };

      const result = await runValidationChecks('/test/project', deps);

      expect(result.success).toBe(true);
      expect(result.validation.tests?.passed).toBe(true);

      // Should use the custom test command
      expect(mockExecSync).toHaveBeenCalledWith(
        `${customTestCommand} >/dev/null 2>&1`,
        expect.objectContaining({
          cwd: '/test/project',
          shell: '/bin/bash',
        }),
      );
    });

    test('detects test failures when tests are enabled', async () => {
      const mockExecSync = mock((command: string) => {
        if (command.includes('npm test >/dev/null 2>&1')) {
          const error = new Error('Tests failed') as any;
          error.status = 1;
          throw error;
        }
        if (command.includes('npm test 2>&1 || true')) {
          return '✗ test/example.test.js › should work (fail)\n    AssertionError: expected 1 to equal 2\n\n1 fail\n0 pass';
        }
        if (command.includes('git status')) {
          return '';
        }
        if (command.includes('git branch')) {
          return 'main';
        }
        if (command.includes('git log')) {
          return '';
        }
        return '';
      });

      const mockExistsSync = mock(() => true);
      const mockReadFileSync = mock((path: string) => {
        if (path.includes('package.json')) {
          return JSON.stringify({ scripts: { test: 'npm test' } });
        }
        if (path.includes('TASK_001.md')) {
          return '# Test Task\n\n**Status:** in_progress';
        }
        return '';
      });

      const deps: ValidationDeps = {
        execSync: mockExecSync,
        fileOps: {
          existsSync: mockExistsSync,
          readFileSync: mockReadFileSync,
        },
        getConfig: mock(() => ({})),
        getLintConfig: mock(() => ({ enabled: false })),
        getTestConfig: mock(() => ({ enabled: true, command: 'npm test' })),
        getActiveTaskId: mock(() => 'TASK_001'),
        isWipCommit: mock(() => false),
        getLintParser: mock(() => ({ parseOutput: () => ({ issueCount: 0 }) })),
        logger: createMockLogger(),
      };

      const result = await runValidationChecks('/test/project', deps);

      expect(result.success).toBe(true);
      expect(result.readyForCompletion).toBe(false); // Should fail due to test failures
      expect(result.validation.tests?.passed).toBe(false);
      expect(result.validation.tests?.failCount).toBe(1);
      expect(result.validation.tests?.errors).toContain('should work');
    });

    test('falls back to default bun test command when no custom command configured', async () => {
      const mockExecSync = mock((command: string) => {
        if (command.includes('git status')) {
          return '';
        }
        if (command.includes('git branch')) {
          return 'main';
        }
        if (command.includes('git log')) {
          return '';
        }
        return '';
      });

      const mockExistsSync = mock(() => true);
      const mockReadFileSync = mock((path: string) => {
        if (path.includes('package.json')) {
          return JSON.stringify({ scripts: { test: 'bun test' } });
        }
        if (path.includes('TASK_001.md')) {
          return '# Test Task\n\n**Status:** in_progress';
        }
        return '';
      });

      const deps: ValidationDeps = {
        execSync: mockExecSync,
        fileOps: {
          existsSync: mockExistsSync,
          readFileSync: mockReadFileSync,
        },
        getConfig: mock(() => ({})),
        getLintConfig: mock(() => ({ enabled: false })),
        getTestConfig: mock(() => ({ enabled: true })), // No command specified
        getActiveTaskId: mock(() => 'TASK_001'),
        isWipCommit: mock(() => false),
        getLintParser: mock(() => ({ parseOutput: () => ({ issueCount: 0 }) })),
        logger: createMockLogger(),
      };

      const result = await runValidationChecks('/test/project', deps);

      expect(result.success).toBe(true);
      expect(result.validation.tests?.passed).toBe(true);

      // Should use the default 'bun test' command
      expect(mockExecSync).toHaveBeenCalledWith(
        'bun test >/dev/null 2>&1',
        expect.objectContaining({
          cwd: '/test/project',
          shell: '/bin/bash',
        }),
      );
    });
  });
});
