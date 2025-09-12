import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { GitHelpers } from '../lib/git-helpers';
import type { GitHubHelpers } from '../lib/github-helpers';
import type { createLogger } from '../lib/logger';
import type { HookInput } from '../types';
import {
  type CapturePlanDependencies,
  capturePlanHook,
  enrichPlanWithClaude,
  findNextTaskNumber,
  generateEnrichmentPrompt,
  handleGitBranching,
  handleGitHubIntegration,
  updateClaudeMd,
} from './capture-plan';

// Create a properly typed logger mock
function createMockLogger(): ReturnType<typeof createLogger> {
  return {
    debug: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    exception: mock(() => {}),
  } as unknown as ReturnType<typeof createLogger>;
}

describe('capture-plan', () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('findNextTaskNumber', () => {
    test("returns 1 when tasks directory doesn't exist", () => {
      const fileOps = {
        existsSync: mock(() => false),
        readdirSync: mock(() => []),
      };

      const result = findNextTaskNumber('/tasks', fileOps);
      expect(result).toBe(1);
    });

    test('returns 1 when tasks directory is empty', () => {
      const fileOps = {
        existsSync: mock(() => true),
        readdirSync: mock(() => []),
      };

      const result = findNextTaskNumber('/tasks', fileOps);
      expect(result).toBe(1);
    });

    test('finds highest task number and returns next', () => {
      const fileOps = {
        existsSync: mock(() => true),
        readdirSync: mock(() => ['TASK_001.md', 'TASK_003.md', 'TASK_002.md', 'other-file.txt']),
      };

      const result = findNextTaskNumber('/tasks', fileOps);
      expect(result).toBe(4);
    });

    test('handles non-standard filenames gracefully', () => {
      const fileOps = {
        existsSync: mock(() => true),
        readdirSync: mock(() => ['TASK_001.md', 'TASK_invalid.md', 'random.txt', 'TASK_005.md']),
      };

      const result = findNextTaskNumber('/tasks', fileOps);
      expect(result).toBe(6);
    });
  });

  describe('generateEnrichmentPrompt', () => {
    test('generates correct prompt with all required fields', () => {
      const plan = 'Test plan content';
      const taskId = '001';
      const now = new Date('2025-01-01T10:30:00Z');

      const prompt = generateEnrichmentPrompt(plan, taskId, now);

      expect(prompt).toContain('Test plan content');
      expect(prompt).toContain('TASK_001.md');
      expect(prompt).toContain('**Task ID:** 001');
      expect(prompt).toContain('**Started:** 2025-01-01 10:30');
      expect(prompt).toContain('## Requirements');
      expect(prompt).toContain('## Success Criteria');
    });
  });

  describe('enrichPlanWithClaude', () => {
    test('successfully enriches plan using Claude SDK', async () => {
      const mockClaudeSDK = {
        generateCommitMessage: mock(async () => 'feat: test'),
        generateBranchName: mock(async () => 'feature/test'),
        prompt: mock(async () => ({
          text: '# Enriched Task\n\nTask content here',
          success: true,
        })),
      };
      const logger = createMockLogger();

      const deps: CapturePlanDependencies = {
        claudeSDK: mockClaudeSDK,
        logger,
        isHookEnabled: () => true,
        isGitHubIntegrationEnabled: () => false,
      };

      const result = await enrichPlanWithClaude('test prompt', deps);

      expect(result).toBe('# Enriched Task\n\nTask content here');
      expect(mockClaudeSDK.prompt).toHaveBeenCalledWith('test prompt', 'sonnet');
    });

    test('handles SDK error gracefully', async () => {
      const mockClaudeSDK = {
        generateCommitMessage: mock(async () => 'feat: test'),
        generateBranchName: mock(async () => 'feature/test'),
        prompt: mock(async () => ({
          text: '',
          success: false,
          error: 'Claude SDK failed',
        })),
      };
      const logger = createMockLogger();

      const deps: CapturePlanDependencies = {
        claudeSDK: mockClaudeSDK,
        logger,
        isHookEnabled: () => true,
        isGitHubIntegrationEnabled: () => false,
      };

      await expect(enrichPlanWithClaude('test prompt', deps)).rejects.toThrow('Claude SDK failed');

      expect(mockClaudeSDK.prompt).toHaveBeenCalledWith('test prompt', 'sonnet');
    });
  });

  describe('handleGitBranching', () => {
    test('returns null when git branching is disabled', async () => {
      const result = await handleGitBranching('plan', '001', '/project', {});
      expect(result).toBe(null);
    });

    test('creates branch when enabled and in git repo', async () => {
      const mockExecSync = mock((cmd: string) => {
        if (cmd.includes('git rev-parse')) return '.git';
        if (cmd.includes('git diff HEAD')) return 'diff content';
        return '';
      });

      const mockGitHelpers: Partial<GitHelpers> = {
        hasUncommittedChanges: mock(() => true),
        generateCommitMessage: mock(async () => 'Auto-commit message'),
        generateBranchName: mock(async () => 'feature/task-001'),
        createTaskBranch: mock(() => {}),
      };

      const logger = createMockLogger();

      const deps: CapturePlanDependencies = {
        execSync: mockExecSync,
        gitHelpers: mockGitHelpers as GitHelpers,
        logger,
      };

      const result = await handleGitBranching('plan', '001', '/project', deps);

      expect(result).toBe('feature/task-001');
      expect(mockGitHelpers.createTaskBranch).toHaveBeenCalledWith('feature/task-001', '/project');
    });

    test('returns null on git error', async () => {
      const mockExecSync = mock(() => {
        throw new Error('Not a git repository');
      });

      const logger = createMockLogger();

      const deps: CapturePlanDependencies = {
        execSync: mockExecSync,
        logger,
      };

      const result = await handleGitBranching('plan', '001', '/project', deps);
      expect(result).toBe(null);
    });
  });

  describe('handleGitHubIntegration', () => {
    test('returns empty result when GitHub integration is disabled', async () => {
      const result = await handleGitHubIntegration('content', '001', '/project', {});
      expect(result.issue).toBe(null);
      expect(result.infoString).toBe('');
    });

    test('creates issue and returns info when enabled', async () => {
      const mockGitHubHelpers: Partial<GitHubHelpers> = {
        validateGitHubIntegration: mock(() => ({ valid: true, errors: [] })),
        formatTaskForGitHub: mock(() => ({
          title: 'Test Task',
          body: 'Task body',
        })),
        createGitHubIssue: mock(() => ({
          number: 42,
          url: 'https://github.com/test/repo/issues/42',
        })),
        createIssueBranch: mock(() => null),
      };

      const logger = createMockLogger();

      const deps: CapturePlanDependencies = {
        githubHelpers: mockGitHubHelpers as GitHubHelpers,
        logger,
      };

      const result = await handleGitHubIntegration('content', '001', '/project', deps);

      expect(result.issue).toEqual({
        number: 42,
        url: 'https://github.com/test/repo/issues/42',
      });
      expect(result.infoString).toContain('<!-- github_issue: 42 -->');
      expect(result.infoString).toContain('<!-- github_url: https://github.com/test/repo/issues/42 -->');
    });

    test('returns issue object without branch info', async () => {
      const mockGitHubHelpers = {
        validateGitHubIntegration: mock(() => ({ valid: true, errors: [] })),
        formatTaskForGitHub: mock(() => ({
          title: 'Test Task',
          body: 'Task body',
        })),
        createGitHubIssue: mock(() => ({
          number: 42,
          url: 'https://github.com/test/repo/issues/42',
        })),
      };

      const logger = createMockLogger();

      const deps: CapturePlanDependencies = {
        githubHelpers: mockGitHubHelpers as GitHubHelpers,
        logger,
      };

      const result = await handleGitHubIntegration('content', '001', '/project', deps);

      expect(result.issue).toEqual({
        number: 42,
        url: 'https://github.com/test/repo/issues/42',
      });
      // Branch creation is now handled in main flow, not in this function
      expect(result.infoString).not.toContain('<!-- issue_branch');
    });
  });

  describe('updateClaudeMd', () => {
    test('updates CLAUDE.md with new task when no active task', () => {
      const fileOps = {
        existsSync: mock(() => true),
        readFileSync: mock(() => '# Project\n\n@.claude/no_active_task.md\n'),
        writeFileSync: mock(() => {}),
      };

      updateClaudeMd('/project', '005', fileOps);

      expect(fileOps.writeFileSync).toHaveBeenCalledWith(
        '/project/CLAUDE.md',
        '# Project\n\n@.claude/tasks/TASK_005.md\n',
      );
    });

    test('replaces existing task reference', () => {
      const fileOps = {
        existsSync: mock(() => true),
        readFileSync: mock(() => '# Project\n\n@.claude/tasks/TASK_003.md\n'),
        writeFileSync: mock(() => {}),
      };

      updateClaudeMd('/project', '005', fileOps);

      expect(fileOps.writeFileSync).toHaveBeenCalledWith(
        '/project/CLAUDE.md',
        '# Project\n\n@.claude/tasks/TASK_005.md\n',
      );
    });

    test("does nothing when CLAUDE.md doesn't exist", () => {
      const fileOps = {
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        writeFileSync: mock(() => {}),
      };

      updateClaudeMd('/project', '005', fileOps);

      expect(fileOps.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('capturePlanHook', () => {
    test('returns early when hook is disabled', async () => {
      const input: HookInput = {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        tool_input: { plan: 'Test plan' },
        cwd: '/project',
      };

      const result = await capturePlanHook(input, {
        isHookEnabled: () => false,
      });
      expect(result).toEqual({ continue: true });
    });

    test('returns early when plan not approved in PostToolUse', async () => {
      const input: HookInput = {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        tool_input: { plan: 'Test plan' },
        tool_response: { success: false }, // No plan field
        cwd: '/project',
      };

      const logger = createMockLogger();

      const result = await capturePlanHook(input, {
        logger,
        isHookEnabled: () => true,
      });

      expect(result).toEqual({ continue: true });
      expect(logger.info).toHaveBeenCalledWith('Plan was not approved, skipping task creation', expect.any(Object));
    });

    test('creates task successfully when plan is approved', async () => {
      const mockExecSync = mock(() => '# Task Title\n\nEnriched content');

      const writtenFiles: Record<string, string> = {};
      const fileOps = {
        existsSync: mock((path: string) => path.includes('CLAUDE.md')),
        mkdirSync: mock(() => {}),
        readdirSync: mock(() => []), // Empty tasks directory, so next will be 001
        readFileSync: mock(() => '# Project\n\n@.claude/no_active_task.md\n'),
        writeFileSync: mock((path: string, content: string) => {
          writtenFiles[path] = content;
        }),
        unlinkSync: mock(() => {}),
      };

      // Mock GitHelpers to avoid real Claude API calls
      const mockExecForGitHelpers = mock((cmd: string) => {
        if (cmd.includes('claude')) return 'chore: save work in progress';
        if (cmd.includes('branch --show-current')) return 'feature/test-branch-001';
        return '';
      });
      const mockGitHelpers = new GitHelpers(mockExecForGitHelpers);

      const input: HookInput = {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        tool_input: { plan: 'Create a new feature' },
        tool_response: { plan: 'Create a new feature' }, // Plan approved
        cwd: '/project',
        session_id: 'test-session',
      };

      const deps: CapturePlanDependencies = {
        execSync: mockExecSync,
        fileOps,
        gitHelpers: mockGitHelpers,
        logger: createMockLogger(),
        isHookEnabled: () => true,
        isGitHubIntegrationEnabled: () => false,
      };

      const result = await capturePlanHook(input, deps);

      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('✅ Plan captured as task 001');
      expect(writtenFiles['/project/.claude/plans/001.md']).toContain('Create a new feature');
      expect(writtenFiles['/project/.claude/tasks/TASK_001.md']).toContain('# Task Title');
      expect(writtenFiles['/project/CLAUDE.md']).toContain('@.claude/tasks/TASK_001.md');
    });

    test('handles errors gracefully', async () => {
      const mockExecSync = mock(() => {
        throw new Error('Claude CLI error');
      });

      const fileOps = {
        existsSync: mock(() => false),
        mkdirSync: mock(() => {}),
        readdirSync: mock(() => []),
        writeFileSync: mock(() => {}),
        unlinkSync: mock(() => {}),
      };

      const logger = createMockLogger();

      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'ExitPlanMode',
        tool_input: { plan: 'Test plan' },
        cwd: '/project',
      };

      // Mock GitHelpers to avoid real Claude API calls
      const mockGitHelpers = {
        getDefaultBranch: mock(() => 'main'),
        hasUncommittedChanges: mock(() => false),
        generateCommitMessage: mock(async () => 'chore: save work in progress'),
        generateBranchName: mock(async () => 'feature/test-branch'),
        createTaskBranch: mock(() => {}),
        mergeTaskBranch: mock(() => {}),
        getCurrentBranch: mock(() => 'main'),
        switchToBranch: mock(() => {}),
      } as unknown as GitHelpers;

      const deps: CapturePlanDependencies = {
        execSync: mockExecSync,
        fileOps,
        gitHelpers: mockGitHelpers,
        logger,
        debugLog: mock(() => {}),
      };

      const result = await capturePlanHook(input, deps);

      expect(result).toEqual({ continue: true });
      expect(logger.exception).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    test('successfully enriches task with Claude and creates GitHub issue', async () => {
      // Mock Claude CLI to return enriched task content
      const mockExecSync = mock((cmd: string) => {
        if (cmd.includes('claude') && cmd.includes('sonnet')) {
          // Return enriched task content
          return `# Task Title Here

**Purpose:** Test task purpose
**Status:** in-progress
**Started:** 2025-09-11
**Task ID:** 027

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Success Criteria
- Criteria 1
- Criteria 2`;
        }
        if (cmd.includes('gh issue create')) {
          return 'https://github.com/user/repo/issues/123';
        }
        if (cmd.includes('git checkout -b')) {
          return '';
        }
        return '';
      });

      const fileOps = {
        existsSync: mock((path: string) => {
          if (path.includes('track.config.json')) return true;
          if (path.includes('.claude')) return true;
          return false;
        }),
        mkdirSync: mock(() => {}),
        readdirSync: mock(() => ['026.md']),
        readFileSync: mock((path: string) => {
          if (path.includes('track.config.json')) {
            return JSON.stringify({ github: { enabled: true, autoCreateIssues: true } });
          }
          if (path.includes('CLAUDE.md')) {
            return '# Project\n@.claude/no_active_task.md';
          }
          return '';
        }),
        writeFileSync: mock(() => {}),
        unlinkSync: mock(() => {}),
      };

      const input: HookInput = {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        tool_input: {
          plan: '## Task: Implement new feature\n\n- Step 1\n- Step 2\n- Step 3',
        },
        tool_response: {
          plan: '## Task: Implement new feature\n\n- Step 1\n- Step 2\n- Step 3', // Plan field present = approved
        },
        cwd: '/project',
      };

      const deps: CapturePlanDependencies = {
        execSync: mockExecSync,
        fileOps,
        gitHelpers: new GitHelpers(
          mock((cmd: string) => {
            if (cmd.includes('claude')) {
              if (cmd.includes('branch')) return 'feature/task-027';
              return 'Auto-commit';
            }
            if (cmd.includes('branch --show-current')) return 'main';
            if (cmd.includes('status --porcelain')) return '';
            if (cmd.includes('symbolic-ref')) return 'main';
            return '';
          }),
          { writeFileSync: mock(() => {}), unlinkSync: mock(() => {}) },
        ),
        githubHelpers: {
          validateGitHubIntegration: mock(() => ({ valid: true, errors: [] })),
          createGitHubIssue: mock(() => ({
            number: 123,
            url: 'https://github.com/user/repo/issues/123',
            title: 'Test',
            state: 'open',
          })),
        } as GitHubHelpers,
        logger: createMockLogger(),
        debugLog: mock(() => {}),
      };

      const result = await capturePlanHook(input, deps);

      expect(result.continue).toBe(true);
      expect(fileOps.writeFileSync).toHaveBeenCalled();
      // Check that task file was written
      const writeFileMock = fileOps.writeFileSync as ReturnType<typeof mock>;
      const writeCall = writeFileMock.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('TASK_') && call[0].includes('.md'),
      );
      expect(writeCall).toBeDefined();
      expect(writeCall[1]).toContain('Task Title Here');
      expect(writeCall[1]).toContain('Requirement 1');
    });

    test('handles Claude CLI failure gracefully', async () => {
      const mockExecSync = mock((cmd: string) => {
        if (cmd.includes('claude')) {
          throw new Error('Claude CLI failed');
        }
        return '';
      });

      const fileOps = {
        existsSync: mock(() => false),
        mkdirSync: mock(() => {}),
        readdirSync: mock(() => []),
        readFileSync: mock((path: string) => {
          if (path.includes('track.config.json')) {
            return JSON.stringify({ github: { enabled: false } });
          }
          if (path.includes('CLAUDE.md')) {
            return '# Project\n@.claude/no_active_task.md';
          }
          return '';
        }),
        writeFileSync: mock(() => {}),
        unlinkSync: mock(() => {}),
      };

      const input: HookInput = {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        tool_input: {
          plan: '## Simple task\n\nJust a simple task',
        },
        tool_response: {
          plan: '## Simple task\n\nJust a simple task', // Plan field present = approved
        },
        cwd: '/project',
      };

      const deps: CapturePlanDependencies = {
        execSync: mockExecSync,
        fileOps,
        gitHelpers: new GitHelpers(
          mock((cmd: string) => {
            if (cmd.includes('claude')) {
              if (cmd.includes('branch')) return 'feature/task-027';
              return 'Auto-commit';
            }
            if (cmd.includes('branch --show-current')) return 'main';
            if (cmd.includes('status --porcelain')) return '';
            if (cmd.includes('symbolic-ref')) return 'main';
            return '';
          }),
          { writeFileSync: mock(() => {}), unlinkSync: mock(() => {}) },
        ),
        githubHelpers: {
          validateGitHubIntegration: mock(() => ({ valid: true, errors: [] })),
          createGitHubIssue: mock(() => ({
            number: 123,
            url: 'https://github.com/user/repo/issues/123',
            title: 'Test',
            state: 'open',
          })),
        } as GitHubHelpers,
        logger: createMockLogger(),
        debugLog: mock(() => {}),
      };

      const result = await capturePlanHook(input, deps);

      // When Claude CLI fails, the hook still returns continue: true
      // but doesn't create a task file (implementation limitation)
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    test('skips task creation when user rejects plan in PostToolUse', async () => {
      const fileOps = {
        existsSync: mock(() => false),
        mkdirSync: mock(() => {}),
        readdirSync: mock(() => []),
        readFileSync: mock(() => ''),
        writeFileSync: mock(() => {}),
        unlinkSync: mock(() => {}),
      };

      const input: HookInput = {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        tool_input: {
          plan: 'Plan that was rejected',
        },
        tool_response: {
          // Missing 'plan' field indicates rejection
          success: false,
        },
        cwd: '/project',
      };

      const deps: CapturePlanDependencies = {
        execSync: mock(() => ''),
        fileOps,
        gitHelpers: new GitHelpers(
          mock((cmd: string) => {
            if (cmd.includes('claude')) {
              if (cmd.includes('branch')) return 'feature/test-branch';
              return 'chore: save work in progress';
            }
            if (cmd.includes('branch --show-current')) return 'main';
            if (cmd.includes('status --porcelain')) return '';
            if (cmd.includes('symbolic-ref')) return 'main';
            return '';
          }),
          { writeFileSync: mock(() => {}), unlinkSync: mock(() => {}) },
        ),
        githubHelpers: {} as GitHubHelpers,
        logger: createMockLogger(),
        debugLog: mock(() => {}),
      };

      const result = await capturePlanHook(input, deps);

      // When plan is rejected, hook continues but doesn't create task
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
      // Verify no files were written
      expect(fileOps.writeFileSync).not.toHaveBeenCalled();
    });
  });
});
