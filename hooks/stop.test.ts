// ABOUTME: Tests for the stop hook (autoflow continuation evaluation)
// ABOUTME: Verifies throttling logic, evaluation flow, and state management

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  type AutoflowState,
  buildEvaluationPrompt,
  getLastMessages,
  MAX_CONTINUES_PER_WINDOW,
  type StopHookDeps,
  stopHook,
  type TranscriptMessage,
  WINDOW_DURATION_MS,
} from './stop';

describe('getLastMessages', () => {
  test('extracts text content from transcript messages', () => {
    const transcript: TranscriptMessage[] = [
      { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'Hi there' }] },
    ];

    const result = getLastMessages(transcript, 10);

    expect(result).toContain('user: Hello');
    expect(result).toContain('assistant: Hi there');
  });

  test('limits to last N messages', () => {
    const transcript: TranscriptMessage[] = [
      { role: 'user', content: [{ type: 'text', text: 'Message 1' }] },
      { role: 'user', content: [{ type: 'text', text: 'Message 2' }] },
      { role: 'user', content: [{ type: 'text', text: 'Message 3' }] },
    ];

    const result = getLastMessages(transcript, 2);

    expect(result).not.toContain('Message 1');
    expect(result).toContain('Message 2');
    expect(result).toContain('Message 3');
  });

  test('truncates long messages to 1000 chars', () => {
    const longText = 'a'.repeat(2000);
    const transcript: TranscriptMessage[] = [{ role: 'assistant', content: [{ type: 'text', text: longText }] }];

    const result = getLastMessages(transcript, 10);

    expect(result.length).toBeLessThan(1100); // role prefix + truncated text
  });

  test('handles empty transcript', () => {
    const result = getLastMessages([], 10);
    expect(result).toBe('');
  });

  test('filters out messages without text content', () => {
    const transcript: TranscriptMessage[] = [{ role: 'assistant', content: [{ type: 'tool_use', id: '123' }] }];

    const result = getLastMessages(transcript, 10);

    // Tool-use-only messages are filtered out (no garbage data for evaluator)
    expect(result).toBe('');
  });

  test('handles SDK format with message wrapper', () => {
    // SDK format: { type: 'user', message: { role: 'user', content: [...] } }
    const transcript = [
      { type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'SDK user message' }] } },
      {
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'SDK assistant response' }] },
      },
    ] as unknown as TranscriptMessage[];

    const result = getLastMessages(transcript, 10);

    expect(result).toContain('user: SDK user message');
    expect(result).toContain('assistant: SDK assistant response');
  });

  test('filters out messages with undefined content inside message wrapper', () => {
    const transcript = [
      { type: 'user', message: { role: 'user' } }, // No content
    ] as unknown as TranscriptMessage[];

    const result = getLastMessages(transcript, 10);

    // Messages without content are filtered out (no garbage data for evaluator)
    expect(result).toBe('');
  });
});

describe('buildEvaluationPrompt', () => {
  test('includes conversation context', () => {
    const prompt = buildEvaluationPrompt('user: Hello\nassistant: Hi');

    expect(prompt).toContain('user: Hello');
    expect(prompt).toContain('assistant: Hi');
  });

  test('includes CONTINUE criteria', () => {
    const prompt = buildEvaluationPrompt('test');

    expect(prompt).toContain('CONTINUE');
    expect(prompt).toContain('Next I need to');
    expect(prompt).toContain('Incomplete todo list');
  });

  test('includes STOP criteria', () => {
    const prompt = buildEvaluationPrompt('test');

    expect(prompt).toContain('STOP');
    expect(prompt).toContain('TASK COMPLETION');
    expect(prompt).toContain('QUESTIONS');
    expect(prompt).toContain('BLOCKERS');
  });

  test('includes JSON response format instruction', () => {
    const prompt = buildEvaluationPrompt('test');

    expect(prompt).toContain('should_continue');
    expect(prompt).toContain('reasoning');
  });
});

describe('stopHook', () => {
  let mockState: AutoflowState | null;
  let writtenState: AutoflowState | null;
  let mockTranscript: TranscriptMessage[];
  let mockEvaluateResult: { shouldContinue: boolean; reason: string };
  let mockNow: number;

  const createMockDeps = (): StopHookDeps => ({
    readState: () => mockState,
    writeState: (state: AutoflowState) => {
      writtenState = state;
    },
    readTranscript: () => mockTranscript,
    evaluate: async () => mockEvaluateResult,
    now: () => mockNow,
  });

  beforeEach(() => {
    mockState = null;
    writtenState = null;
    mockTranscript = [];
    mockEvaluateResult = { shouldContinue: false, reason: 'Work complete' };
    mockNow = Date.now();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('when autoflow is inactive', () => {
    test('allows stop when state is null', async () => {
      mockState = null;

      const result = await stopHook({ transcript_path: '/some/path' }, createMockDeps());

      expect(result.action).toBe('allow');
    });

    test('allows stop when active is false', async () => {
      mockState = {
        active: false,
        sessionId: 'test',
        activatedAt: '2025-01-01',
        continueCount: 0,
      };

      const result = await stopHook({ transcript_path: '/some/path' }, createMockDeps());

      expect(result.action).toBe('allow');
    });
  });

  describe('throttling', () => {
    beforeEach(() => {
      mockState = {
        active: true,
        sessionId: 'test',
        activatedAt: '2025-01-01',
        continueCount: 0,
      };
    });

    test('triggers throttle when continueCount reaches limit', async () => {
      mockState = {
        active: true,
        sessionId: 'test',
        activatedAt: '2025-01-01',
        continueCount: MAX_CONTINUES_PER_WINDOW,
        windowStart: new Date(mockNow - 1000).toISOString(), // 1 second ago
      };

      const result = await stopHook({ transcript_path: '/path' }, createMockDeps());

      expect(result.action).toBe('throttle');
      expect(result.message).toContain('throttle limit reached');
      expect(writtenState?.active).toBe(false);
    });

    test('resets continueCount when window expires', async () => {
      mockState = {
        active: true,
        sessionId: 'test',
        activatedAt: '2025-01-01',
        continueCount: 2,
        windowStart: new Date(mockNow - WINDOW_DURATION_MS - 1000).toISOString(), // Window expired
      };
      mockEvaluateResult = { shouldContinue: true, reason: 'More work to do' };
      mockTranscript = [{ role: 'assistant', content: [{ type: 'text', text: 'Next I need to...' }] }];

      const result = await stopHook({ transcript_path: '/path' }, createMockDeps());

      expect(result.action).toBe('block');
      // Continue count should be 1 (reset from 2 to 0, then incremented)
      expect(writtenState?.continueCount).toBe(1);
    });

    test('increments continueCount within window', async () => {
      mockState = {
        active: true,
        sessionId: 'test',
        activatedAt: '2025-01-01',
        continueCount: 1,
        windowStart: new Date(mockNow - 60000).toISOString(), // 1 minute ago
      };
      mockEvaluateResult = { shouldContinue: true, reason: 'More work' };
      mockTranscript = [{ role: 'assistant', content: [{ type: 'text', text: 'test' }] }];

      const result = await stopHook({ transcript_path: '/path' }, createMockDeps());

      expect(result.action).toBe('block');
      expect(writtenState?.continueCount).toBe(2);
    });

    test('sets windowStart on first continue of new window', async () => {
      mockState = {
        active: true,
        sessionId: 'test',
        activatedAt: '2025-01-01',
        continueCount: 0,
      };
      mockEvaluateResult = { shouldContinue: true, reason: 'Starting work' };
      mockTranscript = [{ role: 'assistant', content: [{ type: 'text', text: 'test' }] }];

      await stopHook({ transcript_path: '/path' }, createMockDeps());

      expect(writtenState?.windowStart).toBeDefined();
    });
  });

  describe('evaluation', () => {
    beforeEach(() => {
      mockState = {
        active: true,
        sessionId: 'test',
        activatedAt: '2025-01-01',
        continueCount: 0,
      };
      mockTranscript = [{ role: 'assistant', content: [{ type: 'text', text: 'Some message' }] }];
    });

    test('allows stop when evaluation returns shouldContinue=false', async () => {
      mockEvaluateResult = { shouldContinue: false, reason: 'Work is done' };

      const result = await stopHook({ transcript_path: '/path' }, createMockDeps());

      expect(result.action).toBe('allow');
    });

    test('blocks stop when evaluation returns shouldContinue=true', async () => {
      mockEvaluateResult = { shouldContinue: true, reason: 'More tasks pending' };

      const result = await stopHook({ transcript_path: '/path' }, createMockDeps());

      expect(result.action).toBe('block');
      expect(result.message).toContain('Continue working');
      expect(result.message).toContain('More tasks pending');
    });

    test('allows stop when no transcript_path provided', async () => {
      const result = await stopHook({}, createMockDeps());

      expect(result.action).toBe('allow');
    });
  });

  describe('state updates', () => {
    test('updates state on block', async () => {
      mockState = {
        active: true,
        sessionId: 'test-session',
        activatedAt: '2025-01-01T00:00:00Z',
        continueCount: 1,
        windowStart: new Date(mockNow - 60000).toISOString(),
      };
      mockEvaluateResult = { shouldContinue: true, reason: 'Continue' };
      mockTranscript = [{ role: 'assistant', content: [{ type: 'text', text: 'test' }] }];

      await stopHook({ transcript_path: '/path' }, createMockDeps());

      expect(writtenState?.continueCount).toBe(2);
      expect(writtenState?.active).toBe(true);
      expect(writtenState?.sessionId).toBe('test-session');
    });

    test('deactivates on throttle', async () => {
      mockState = {
        active: true,
        sessionId: 'test',
        activatedAt: '2025-01-01',
        continueCount: MAX_CONTINUES_PER_WINDOW,
        windowStart: new Date(mockNow - 1000).toISOString(),
      };

      await stopHook({ transcript_path: '/path' }, createMockDeps());

      expect(writtenState?.active).toBe(false);
    });

    test('does not update state on allow', async () => {
      mockState = {
        active: true,
        sessionId: 'test',
        activatedAt: '2025-01-01',
        continueCount: 0,
      };
      mockEvaluateResult = { shouldContinue: false, reason: 'Done' };
      mockTranscript = [{ role: 'assistant', content: [{ type: 'text', text: 'test' }] }];

      await stopHook({ transcript_path: '/path' }, createMockDeps());

      expect(writtenState).toBeNull();
    });
  });

  describe('edge cases', () => {
    test('handles empty transcript', async () => {
      mockState = {
        active: true,
        sessionId: 'test',
        activatedAt: '2025-01-01',
        continueCount: 0,
      };
      mockTranscript = [];
      mockEvaluateResult = { shouldContinue: false, reason: 'No context' };

      const result = await stopHook({ transcript_path: '/path' }, createMockDeps());

      expect(result.action).toBe('allow');
    });

    test('handles continueCount of exactly MAX_CONTINUES_PER_WINDOW', async () => {
      mockState = {
        active: true,
        sessionId: 'test',
        activatedAt: '2025-01-01',
        continueCount: MAX_CONTINUES_PER_WINDOW,
        windowStart: new Date(mockNow - 1000).toISOString(),
      };

      const result = await stopHook({ transcript_path: '/path' }, createMockDeps());

      expect(result.action).toBe('throttle');
    });

    test('handles continueCount just below limit', async () => {
      mockState = {
        active: true,
        sessionId: 'test',
        activatedAt: '2025-01-01',
        continueCount: MAX_CONTINUES_PER_WINDOW - 1,
        windowStart: new Date(mockNow - 1000).toISOString(),
      };
      mockEvaluateResult = { shouldContinue: true, reason: 'More work' };
      mockTranscript = [{ role: 'assistant', content: [{ type: 'text', text: 'test' }] }];

      const result = await stopHook({ transcript_path: '/path' }, createMockDeps());

      expect(result.action).toBe('block');
      expect(writtenState?.continueCount).toBe(MAX_CONTINUES_PER_WINDOW);
    });
  });
});
