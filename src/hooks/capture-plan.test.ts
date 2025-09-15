import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { GitHelpers } from '../lib/git-helpers';
import type { createLogger } from '../lib/logger';
import type { HookInput } from '../types';
import {
  type CapturePlanDependencies,
  capturePlanHook,
  enrichPlanWithClaude,
  findNextTaskNumber,
  generateEnrichmentPrompt,
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

// Create mock ClaudeSDK
function createMockClaudeSDK() {
  return {
    generateCommitMessage: mock(async () => 'chore: save work in progress'),
    generateBranchName: mock(async () => 'feature/test-branch'),
    prompt: mock(async () => ({
      text: '# Task Title\n\nEnriched content',
      success: true,
    })),
  };
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
        readdirSync: mock(() => ['TASK_001.md', 'TASK_003.md', 'TASK_002.md']),
      };

      const result = findNextTaskNumber('/tasks', fileOps);
      expect(result).toBe(4);
    });
  });

  describe('generateEnrichmentPrompt', () => {
    test('generates correct prompt with all required fields', () => {
      const plan = 'Create a new feature';
      const taskId = '005';
      const now = new Date('2025-01-01T12:00:00Z');

      const prompt = generateEnrichmentPrompt(plan, taskId, now);

      expect(prompt).toContain('Create a new feature');
      expect(prompt).toContain('Task ID:** 005');
      expect(prompt).toContain('## Requirements');
      expect(prompt).toContain('## Success Criteria');
      expect(prompt).toContain('**Status:** in_progress'); // Verify status is in_progress
    });
  });

  describe('enrichPlanWithClaude', () => {
    test('successfully enriches plan using Claude SDK', async () => {
      const mockClaudeSDK = createMockClaudeSDK();
      const logger = createMockLogger();

      const deps: CapturePlanDependencies = {
        claudeSDK: mockClaudeSDK,
        logger,
        isHookEnabled: () => true,
        isGitHubIntegrationEnabled: () => false,
      };

      const result = await enrichPlanWithClaude('test prompt', deps);

      expect(result).toBe('# Task Title\n\nEnriched content');
      expect(mockClaudeSDK.prompt).toHaveBeenCalledWith('test prompt', 'sonnet');
    });

    test('handles SDK error gracefully', async () => {
      const mockClaudeSDK = {
        ...createMockClaudeSDK(),
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

  describe('capturePlanHook', () => {
    test('returns early when hook is disabled', async () => {
      const input: HookInput = {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        tool_input: { plan: 'Create a new feature' },
        tool_response: { plan: 'Create a new feature' },
        cwd: '/project',
        session_id: 'test-session',
      };

      const deps: CapturePlanDependencies = {
        isHookEnabled: () => false,
        isGitHubIntegrationEnabled: () => false,
      };

      const result = await capturePlanHook(input, deps);
      expect(result).toEqual({ continue: true });
    });

    test('returns early when plan not approved in PostToolUse', async () => {
      const logger = createMockLogger();
      const input: HookInput = {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        tool_input: { plan: 'Create a new feature' },
        tool_response: {}, // No plan field = not approved
        cwd: '/project',
        session_id: 'test-session',
      };

      const deps: CapturePlanDependencies = {
        logger,
        isHookEnabled: () => true,
        isGitHubIntegrationEnabled: () => false,
      };

      const result = await capturePlanHook(input, deps);

      expect(result).toEqual({ continue: true });
      expect(logger.info).toHaveBeenCalledWith('Plan was not approved, skipping task creation', expect.any(Object));
    });

    test('blocks task creation when active task exists', async () => {
      const logger = createMockLogger();
      const fileOps = {
        existsSync: mock(() => true),
        readFileSync: mock(() => '# Project\n\n@.claude/tasks/TASK_002.md\n'), // Active task exists
        writeFileSync: mock(() => {}),
      };

      const input: HookInput = {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        tool_input: { plan: 'Create another feature' },
        tool_response: { plan: 'Create another feature' }, // Plan approved
        cwd: '/project',
        session_id: 'test-session',
      };

      const deps: CapturePlanDependencies = {
        fileOps,
        logger,
        isHookEnabled: () => true,
      };

      const result = await capturePlanHook(input, deps);

      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('⚠️ There is already an active task: TASK_002');
      expect(result.systemMessage).toContain('Please update the existing task file');
      expect(logger.info).toHaveBeenCalledWith('Active task detected, blocking new task creation', {
        activeTaskId: 'TASK_002',
      });
    });

    test('creates task successfully when plan is approved', async () => {
      const mockClaudeSDK = createMockClaudeSDK();
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

      const mockGitHelpers = new GitHelpers(
        mock((cmd: string) => {
          if (cmd.includes('branch --show-current')) return 'feature/test-branch-001';
          return '';
        }),
        undefined,
        mockClaudeSDK,
      );

      const input: HookInput = {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        tool_input: { plan: 'Create a new feature' },
        tool_response: { plan: 'Create a new feature' }, // Plan approved
        cwd: '/project',
        session_id: 'test-session',
      };

      const deps: CapturePlanDependencies = {
        fileOps,
        gitHelpers: mockGitHelpers,
        claudeSDK: mockClaudeSDK,
        logger: createMockLogger(),
        isHookEnabled: () => true,
        isGitHubIntegrationEnabled: () => false,
      };

      const result = await capturePlanHook(input, deps);

      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('✅ Plan captured as task 001');
    });
  });
});
