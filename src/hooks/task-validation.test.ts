import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { taskValidationHook, isTaskFile, extractDiffInfo, buildValidationPrompt } from './task-validation';
import type { HookInput } from '../types';

describe('task-validation', () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
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
      const prompt = buildValidationPrompt(
        '.claude/tasks/TASK_001.md',
        'Status: in_progress',
        'Status: completed',
      );

      expect(prompt).toContain('TASK FILE: .claude/tasks/TASK_001.md');
      expect(prompt).toContain('OLD CONTENT:\nStatus: in_progress');
      expect(prompt).toContain('NEW CONTENT:\nStatus: completed');
      expect(prompt).toContain('100% of tests must pass');
      expect(prompt).toContain('weasel words');
    });
  });

  describe('taskValidationHook', () => {
    const createMockLogger = () => ({
      debug: mock(() => {}),
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      exception: mock(() => {}),
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

      const result = await taskValidationHook(input, {
        isHookEnabled: () => true,
        logger: createMockLogger(),
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

      const result = await taskValidationHook(input, {
        isHookEnabled: () => true,
        claudeSDK: mockSDK,
        logger: createMockLogger(),
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

      const result = await taskValidationHook(input, {
        isHookEnabled: () => true,
        claudeSDK: mockSDK,
        logger: createMockLogger(),
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

      const result = await taskValidationHook(input, {
        isHookEnabled: () => true,
        claudeSDK: mockSDK,
        logger: createMockLogger(),
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
      const result = await taskValidationHook(input, {
        isHookEnabled: () => true,
        claudeSDK: mockSDK,
        logger,
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
      const result = await taskValidationHook(input, {
        isHookEnabled: () => true,
        claudeSDK: mockSDK,
        logger,
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

      const result = await taskValidationHook(input, {
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

      const result = await taskValidationHook(input, {
        isHookEnabled: () => true,
        logger: createMockLogger(),
      });

      expect(result).toEqual({ continue: true });
    });
  });
});