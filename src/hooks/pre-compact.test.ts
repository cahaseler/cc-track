import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { createLogger } from '../lib/logger';
import type { HookInput } from '../types';
import { type PreCompactDependencies, preCompactHook } from './pre-compact';

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

describe('preCompactHook', () => {
  let mockLogger: ReturnType<typeof createLogger>;
  let mockIsHookEnabled: ReturnType<typeof mock>;
  let mockGetActiveTaskId: ReturnType<typeof mock>;
  let mockLogParser: {
    parse: ReturnType<typeof mock>;
  };
  let mockClaudeSDK: {
    prompt: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mock.restore();
    mockLogger = createMockLogger();
    mockIsHookEnabled = mock(() => true);
    mockGetActiveTaskId = mock(() => null);
    mockLogParser = {
      parse: mock(async () => [
        'User: Working on task',
        'Assistant: Making progress',
        'User: Continue with implementation',
      ]),
    };
    mockClaudeSDK = {
      prompt: mock(async () => ({ text: 'Updated task', success: true })),
    };
  });

  test('returns success when hook is disabled', async () => {
    mockIsHookEnabled = mock(() => false);

    const result = await preCompactHook(
      { hook_event_name: 'PreCompact', transcript_path: '/tmp/transcript.jsonl' } as HookInput,
      { isHookEnabled: mockIsHookEnabled, logger: mockLogger },
    );

    expect(result).toEqual({
      continue: true,
      success: true,
      message: 'Hook disabled',
    });
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  test('returns failure when no transcript is provided', async () => {
    const result = await preCompactHook({ hook_event_name: 'PreCompact' } as HookInput, {
      isHookEnabled: mockIsHookEnabled,
      logger: mockLogger,
    });

    expect(result).toEqual({
      continue: true,
      success: false,
      message: 'No transcript found',
    });
  });

  test('exits early when no active task exists', async () => {
    const result = await preCompactHook({ hook_event_name: 'PreCompact', transcript_path: __filename } as HookInput, {
      isHookEnabled: mockIsHookEnabled,
      logger: mockLogger,
      getActiveTaskId: mockGetActiveTaskId,
      logParser: mockLogParser,
    });

    expect(result).toEqual({
      continue: true,
      success: true,
      message: 'No active task to update',
    });
    expect(mockLogger.info).toHaveBeenCalledWith('No active task - skipping task update');
  });

  test('updates task when active task exists', async () => {
    mockGetActiveTaskId = mock(() => 'TASK_045');

    const result = await preCompactHook(
      { hook_event_name: 'PreCompact', transcript_path: __filename, cwd: '/test/project' } as HookInput,
      {
        isHookEnabled: mockIsHookEnabled,
        logger: mockLogger,
        getActiveTaskId: mockGetActiveTaskId,
        logParser: mockLogParser,
        claudeSDK: mockClaudeSDK,
      },
    );

    expect(result).toEqual({
      continue: true,
      success: true,
      message: 'Updated task TASK_045 with recent progress',
    });
    expect(mockLogger.info).toHaveBeenCalledWith('Active task found: TASK_045');
    expect(mockClaudeSDK.prompt).toHaveBeenCalled();
  });

  test('handles Claude SDK failure gracefully', async () => {
    mockGetActiveTaskId = mock(() => 'TASK_045');
    mockClaudeSDK.prompt = mock(async () => ({
      text: '',
      success: false,
      error: 'API error',
    }));

    const result = await preCompactHook(
      { hook_event_name: 'PreCompact', transcript_path: __filename, cwd: '/test/project' } as HookInput,
      {
        isHookEnabled: mockIsHookEnabled,
        logger: mockLogger,
        getActiveTaskId: mockGetActiveTaskId,
        logParser: mockLogParser,
        claudeSDK: mockClaudeSDK,
      },
    );

    expect(result).toEqual({
      continue: true,
      success: false,
      message: 'Failed to update task: API error',
    });
    expect(mockLogger.warn).toHaveBeenCalledWith('Claude SDK failed to update task', { error: 'API error' });
  });

  test('handles Claude SDK exception gracefully', async () => {
    mockGetActiveTaskId = mock(() => 'TASK_045');
    mockClaudeSDK.prompt = mock(async () => {
      throw new Error('Network error');
    });

    const result = await preCompactHook(
      { hook_event_name: 'PreCompact', transcript_path: __filename, cwd: '/test/project' } as HookInput,
      {
        isHookEnabled: mockIsHookEnabled,
        logger: mockLogger,
        getActiveTaskId: mockGetActiveTaskId,
        logParser: mockLogParser,
        claudeSDK: mockClaudeSDK,
      },
    );

    expect(result).toEqual({
      continue: true,
      success: false,
      message: 'Claude SDK error: Error: Network error',
    });
    expect(mockLogger.error).toHaveBeenCalledWith('Error calling Claude SDK', {
      error: expect.any(Error),
    });
  });

  test('verifies Claude SDK is called with correct parameters', async () => {
    mockGetActiveTaskId = mock(() => 'TASK_045');

    await preCompactHook(
      { hook_event_name: 'PreCompact', transcript_path: __filename, cwd: '/test/project' } as HookInput,
      {
        isHookEnabled: mockIsHookEnabled,
        logger: mockLogger,
        getActiveTaskId: mockGetActiveTaskId,
        logParser: mockLogParser,
        claudeSDK: mockClaudeSDK,
      },
    );

    expect(mockClaudeSDK.prompt).toHaveBeenCalledWith(
      expect.stringContaining('TASK FILE PATH: /test/project/.claude/tasks/TASK_045.md'),
      'sonnet',
      {
        maxTurns: 20,
        allowedTools: ['Read', 'Grep', 'Edit'],
        disallowedTools: ['Write', 'MultiEdit', 'Bash', 'TodoWrite'],
        timeoutMs: 120000,
        cwd: '/test/project',
      },
    );
  });

  test('handles exception in main try block', async () => {
    mockIsHookEnabled = mock(() => {
      throw new Error('Config error');
    });

    const result = await preCompactHook(
      { hook_event_name: 'PreCompact', transcript_path: '/tmp/transcript.jsonl' } as HookInput,
      { isHookEnabled: mockIsHookEnabled, logger: mockLogger },
    );

    expect(result).toEqual({
      continue: true,
      success: false,
      message: 'Error: Error: Config error',
    });
    expect(mockLogger.exception).toHaveBeenCalledWith('Error in pre_compact hook', expect.any(Error));
  });

  test('handles log parser failure gracefully', async () => {
    mockGetActiveTaskId = mock(() => 'TASK_045');
    // Since we're using the actual file as transcript, parser might fail or succeed
    // We're mainly testing that the hook doesn't crash

    const deps: PreCompactDependencies = {
      isHookEnabled: mockIsHookEnabled,
      logger: mockLogger,
      getActiveTaskId: mockGetActiveTaskId,
      claudeSDK: mockClaudeSDK,
    };

    const result = await preCompactHook(
      { hook_event_name: 'PreCompact', transcript_path: '/nonexistent/file.jsonl', cwd: '/test/project' } as HookInput,
      deps,
    );

    // Should return failure for non-existent transcript
    expect(result.continue).toBe(true);
    expect(result.success).toBe(false);
    expect(result.message).toBe('No transcript found');
  });
});
