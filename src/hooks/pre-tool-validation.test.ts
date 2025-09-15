import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { HookInput } from '../types';
import {
  buildValidationPrompt,
  extractDiffInfo,
  extractFilePath,
  isGitIgnored,
  isTaskFile,
  preToolValidationHook,
} from './pre-tool-validation';

describe('pre-tool-validation', () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('isGitIgnored', () => {
    test('returns true for ignored files', () => {
      const mockExec = mock(() => '');
      expect(isGitIgnored('/path/to/file.log', '/project', mockExec)).toBe(true);
      expect(mockExec).toHaveBeenCalledWith('git check-ignore "/path/to/file.log"', { cwd: '/project', stdio: 'pipe' });
    });

    test('returns false for non-ignored files', () => {
      const mockExec = mock(() => {
        throw new Error('exit code 1');
      });
      expect(isGitIgnored('/path/to/file.ts', '/project', mockExec)).toBe(false);
    });
  });

  describe('extractFilePath', () => {
    test('extracts path from Edit tool', () => {
      expect(extractFilePath('Edit', { file_path: '/test/file.ts' })).toBe('/test/file.ts');
    });

    test('extracts path from Write tool', () => {
      expect(extractFilePath('Write', { file_path: '/test/new.ts' })).toBe('/test/new.ts');
    });

    test('extracts path from MultiEdit tool', () => {
      expect(extractFilePath('MultiEdit', { file_path: '/test/multi.ts' })).toBe('/test/multi.ts');
    });

    test('returns null for other tools', () => {
      expect(extractFilePath('Read', { file_path: '/test/file.ts' })).toBe(null);
    });

    test('returns null when no file_path', () => {
      expect(extractFilePath('Edit', { other_field: 'value' })).toBe(null);
    });
  });

  describe('isTaskFile', () => {
    test('identifies task files correctly', () => {
      expect(isTaskFile('.claude/tasks/TASK_001.md')).toBe(true);
      expect(isTaskFile('/home/user/.claude/tasks/TASK_999.md')).toBe(true);
      expect(isTaskFile('.claude/tasks/TASK_0123.md')).toBe(true);
    });

    test('rejects non-task files', () => {
      expect(isTaskFile('.claude/tasks/README.md')).toBe(false);
      expect(isTaskFile('.claude/TASK_001.md')).toBe(false);
      expect(isTaskFile('src/file.ts')).toBe(false);
      expect(isTaskFile('.claude/tasks/task_001.md')).toBe(false);
    });
  });

  describe('extractDiffInfo', () => {
    test('extracts diff from Edit tool', () => {
      const result = extractDiffInfo('Edit', {
        file_path: '/path/to/file.md',
        old_string: 'old content',
        new_string: 'new content',
      });

      expect(result).toEqual({
        filePath: '/path/to/file.md',
        oldContent: 'old content',
        newContent: 'new content',
      });
    });

    test('extracts diff from MultiEdit tool', () => {
      const result = extractDiffInfo('MultiEdit', {
        file_path: '/path/to/file.md',
        edits: [
          { old_string: 'old1', new_string: 'new1' },
          { old_string: 'old2', new_string: 'new2' },
        ],
      });

      expect(result).toEqual({
        filePath: '/path/to/file.md',
        oldContent: 'old1\n---\nold2',
        newContent: 'new1\n---\nnew2',
      });
    });

    test('returns null for missing file_path', () => {
      expect(extractDiffInfo('Edit', { old_string: 'old', new_string: 'new' })).toBe(null);
    });

    test('returns null for Write tool', () => {
      expect(extractDiffInfo('Write', { file_path: '/path', content: 'content' })).toBe(null);
    });
  });

  describe('buildValidationPrompt', () => {
    test('includes all required elements', () => {
      const prompt = buildValidationPrompt('.claude/tasks/TASK_001.md', 'Status: in_progress', 'Status: completed');

      expect(prompt).toContain('TASK FILE: .claude/tasks/TASK_001.md');
      expect(prompt).toContain('OLD CONTENT:\nStatus: in_progress');
      expect(prompt).toContain('NEW CONTENT:\nStatus: completed');
      expect(prompt).toContain('100% of tests must pass');
      expect(prompt).toContain('weasel words');
    });
  });

  describe('preToolValidationHook - branch protection', () => {
    const createMockLogger = () => ({
      debug: mock(() => {}),
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      exception: mock(() => {}),
    });

    const createMockGitHelpers = (currentBranch: string) => {
      // Create a mock that matches the GitHelpers class interface
      const gitHelpers = {
        getCurrentBranch: mock(() => currentBranch),
        getDefaultBranch: mock(() => 'main'),
        hasUncommittedChanges: mock(() => false),
        isWipCommit: mock(() => false),
        getMergeBase: mock(() => ''),
        generateCommitMessage: mock(async () => 'test'),
        generateCommitMessageWithMeta: mock(async () => ({ message: 'test', source: 'sdk' as const })),
        generateBranchName: mock(async () => 'feature/test'),
        createTaskBranch: mock(() => {}),
        mergeTaskBranch: mock(() => {}),
        switchToBranch: mock(() => {}),
      };
      return gitHelpers as any; // Cast to any to avoid type issues with the class
    };

    const createMockConfig = (
      branchProtectionEnabled: boolean,
      options: {
        protectedBranches?: string[];
        allowGitignored?: boolean;
      } = {},
    ) => ({
      hooks: {
        pre_tool_validation: { enabled: true, description: 'test' },
      },
      features: {
        branch_protection: {
          enabled: branchProtectionEnabled,
          description: 'test',
          protected_branches: options.protectedBranches || ['main', 'master'],
          allow_gitignored: options.allowGitignored !== false,
        },
      },
      logging: { enabled: false, level: 'INFO' as const, retentionDays: 7, prettyPrint: false },
    });

    test('blocks edits on protected branch', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '/project/src/file.ts',
          old_string: 'old',
          new_string: 'new',
        },
        cwd: '/project',
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        getConfig: () => createMockConfig(true),
        gitHelpers: createMockGitHelpers('main'),
        execSync: mock(() => {
          throw new Error('not gitignored');
        }),
        logger: createMockLogger(),
      });

      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('Branch Protection');
    });

    test('allows edits on non-protected branch', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '/project/src/file.ts',
          old_string: 'old',
          new_string: 'new',
        },
        cwd: '/project',
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        getConfig: () => createMockConfig(true),
        gitHelpers: createMockGitHelpers('feature/my-feature'),
        logger: createMockLogger(),
      });

      expect(result).toEqual({ continue: true });
    });

    test('allows gitignored files on protected branch when configured', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/.env',
          content: 'SECRET=value',
        },
        cwd: '/project',
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        getConfig: () => createMockConfig(true, { protectedBranches: ['main'] }),
        gitHelpers: createMockGitHelpers('main'),
        execSync: mock(() => ''), // File is gitignored
        logger: createMockLogger(),
      });

      expect(result).toEqual({ continue: true });
    });

    test('blocks gitignored files when allow_gitignored is false', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/.env',
          content: 'SECRET=value',
        },
        cwd: '/project',
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        getConfig: () => createMockConfig(true, { protectedBranches: ['main'], allowGitignored: false }),
        gitHelpers: createMockGitHelpers('main'),
        execSync: mock(() => ''), // File is gitignored
        logger: createMockLogger(),
      });

      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    });

    test('skips branch protection when disabled', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '/project/src/file.ts',
          old_string: 'old',
          new_string: 'new',
        },
        cwd: '/project',
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        getConfig: () => createMockConfig(false, { protectedBranches: ['main'] }),
        gitHelpers: createMockGitHelpers('main'),
        logger: createMockLogger(),
      });

      expect(result).toEqual({ continue: true });
    });
  });

  describe('preToolValidationHook - task validation', () => {
    const createMockLogger = () => ({
      debug: mock(() => {}),
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      exception: mock(() => {}),
    });

    const createMockGitHelpers = (currentBranch: string) => {
      // Create a mock that matches the GitHelpers class interface
      const gitHelpers = {
        getCurrentBranch: mock(() => currentBranch),
        getDefaultBranch: mock(() => 'main'),
        hasUncommittedChanges: mock(() => false),
        isWipCommit: mock(() => false),
        getMergeBase: mock(() => ''),
        generateCommitMessage: mock(async () => 'test'),
        generateCommitMessageWithMeta: mock(async () => ({ message: 'test', source: 'sdk' as const })),
        generateBranchName: mock(async () => 'feature/test'),
        createTaskBranch: mock(() => {}),
        mergeTaskBranch: mock(() => {}),
        switchToBranch: mock(() => {}),
      };
      return gitHelpers as any; // Cast to any to avoid type issues with the class
    };

    const createMockConfig = (
      branchProtectionEnabled: boolean,
      options: {
        protectedBranches?: string[];
        allowGitignored?: boolean;
      } = {},
    ) => ({
      hooks: {
        pre_tool_validation: { enabled: true, description: 'test' },
      },
      features: {
        branch_protection: {
          enabled: branchProtectionEnabled,
          description: 'test',
          protected_branches: options.protectedBranches || ['main', 'master'],
          allow_gitignored: options.allowGitignored !== false,
        },
      },
      logging: { enabled: false, level: 'INFO' as const, retentionDays: 7, prettyPrint: false },
    });

    const createMockClaudeSDK = (response: { shouldBlock: boolean; reason: string }) => ({
      prompt: mock(async () => ({
        text: JSON.stringify(response),
        success: true,
      })),
      generateCommitMessage: mock(async () => 'feat: test'),
      generateBranchName: mock(async () => 'feature/test'),
      reviewCode: mock(async () => ({ hasIssues: false, review: 'ok' })),
      extractErrorPatterns: mock(async () => 'patterns'),
      createValidationAgent: mock(async function* () {}),
    });

    test('allows edits to non-task files', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/file.ts',
          old_string: 'old',
          new_string: 'new',
        },
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        logger: createMockLogger(),
        getConfig: () => createMockConfig(false),
        gitHelpers: createMockGitHelpers('feature/test'),
      });

      expect(result).toEqual({ continue: true });
    });

    test('blocks status change to completed', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '.claude/tasks/TASK_001.md',
          old_string: 'Status: in_progress',
          new_string: 'Status: completed',
        },
      };

      const mockSDK = createMockClaudeSDK({
        shouldBlock: true,
        reason: 'Cannot change status to completed',
      });

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        claudeSDK: mockSDK,
        logger: createMockLogger(),
        getConfig: () => createMockConfig(false),
        gitHelpers: createMockGitHelpers('feature/test'),
      });

      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('Cannot change status to completed');
      expect(mockSDK.prompt).toHaveBeenCalledTimes(1);
    });

    test('blocks weasel words about test failures', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '.claude/tasks/TASK_001.md',
          old_string: '- [ ] All tests pass',
          new_string: '- [x] Most tests pass (environment issues with 2 tests)',
        },
      };

      const mockSDK = createMockClaudeSDK({
        shouldBlock: true,
        reason: 'Weasel words detected: claiming partial test completion',
      });

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        claudeSDK: mockSDK,
        logger: createMockLogger(),
        getConfig: () => createMockConfig(false),
        gitHelpers: createMockGitHelpers('feature/test'),
      });

      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('Weasel words detected');
    });

    test('allows legitimate progress updates', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '.claude/tasks/TASK_001.md',
          old_string: 'Progress: Started implementation',
          new_string: 'Progress: Implemented core functionality, tests in progress',
        },
      };

      const mockSDK = createMockClaudeSDK({
        shouldBlock: false,
        reason: 'Edit is acceptable',
      });

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        claudeSDK: mockSDK,
        logger: createMockLogger(),
        getConfig: () => createMockConfig(false),
        gitHelpers: createMockGitHelpers('feature/test'),
      });

      expect(result).toEqual({ continue: true });
    });

    test('handles Claude SDK errors gracefully', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '.claude/tasks/TASK_001.md',
          old_string: 'old',
          new_string: 'new',
        },
      };

      const mockSDK = {
        prompt: mock(async () => ({
          text: '',
          success: false,
          error: 'SDK error',
        })),
        generateCommitMessage: mock(async () => 'feat: test'),
        generateBranchName: mock(async () => 'feature/test'),
        reviewCode: mock(async () => ({ hasIssues: false, review: 'ok' })),
        extractErrorPatterns: mock(async () => 'patterns'),
        createValidationAgent: mock(async function* () {}),
      };

      const logger = createMockLogger();
      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        claudeSDK: mockSDK,
        logger,
        getConfig: () => createMockConfig(false),
        gitHelpers: createMockGitHelpers('feature/test'),
      });

      // Should allow edit on error
      expect(result).toEqual({ continue: true });
      expect(logger.error).toHaveBeenCalledWith('Claude SDK validation failed', { error: 'SDK error' });
    });

    test('handles invalid JSON response', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '.claude/tasks/TASK_001.md',
          old_string: 'old',
          new_string: 'new',
        },
      };

      const mockSDK = {
        prompt: mock(async () => ({
          text: 'Not valid JSON',
          success: true,
        })),
        generateCommitMessage: mock(async () => 'feat: test'),
        generateBranchName: mock(async () => 'feature/test'),
        reviewCode: mock(async () => ({ hasIssues: false, review: 'ok' })),
        extractErrorPatterns: mock(async () => 'patterns'),
        createValidationAgent: mock(async function* () {}),
      };

      const logger = createMockLogger();
      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        claudeSDK: mockSDK,
        logger,
        getConfig: () => createMockConfig(false),
        gitHelpers: createMockGitHelpers('feature/test'),
      });

      // Should allow edit on parse error
      expect(result).toEqual({ continue: true });
      expect(logger.error).toHaveBeenCalled();
    });

    test('skips validation when disabled', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '.claude/tasks/TASK_001.md',
          old_string: 'Status: in_progress',
          new_string: 'Status: completed',
        },
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => false,
        logger: createMockLogger(),
      });

      expect(result).toEqual({ continue: true });
    });

    test('ignores non-Edit/MultiEdit tools', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: {
          file_path: '.claude/tasks/TASK_001.md',
          content: 'new content',
        },
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        logger: createMockLogger(),
        getConfig: () => createMockConfig(false),
        gitHelpers: createMockGitHelpers('feature/test'),
      });

      expect(result).toEqual({ continue: true });
    });
  });
});
