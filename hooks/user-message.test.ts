// ABOUTME: Tests for the user-message hook (autoflow activation/deactivation)
// ABOUTME: Verifies per-message opt-in behavior and negation pattern handling

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { type AutoflowState, shouldActivate, type UserMessageDeps, userMessageHook } from './user-message';

describe('shouldActivate', () => {
  describe('activation patterns', () => {
    test('activates on "autoflow" at end of message', () => {
      expect(shouldActivate('implement the feature autoflow')).toBe(true);
    });

    test('activates on "autoflow" at start of message', () => {
      expect(shouldActivate('autoflow please implement this')).toBe(true);
    });

    test('activates on standalone "autoflow"', () => {
      expect(shouldActivate('autoflow')).toBe(true);
    });

    test('activates case-insensitively', () => {
      expect(shouldActivate('AUTOFLOW')).toBe(true);
      expect(shouldActivate('AutoFlow')).toBe(true);
      expect(shouldActivate('Autoflow')).toBe(true);
    });

    test('activates with autoflow in middle of message', () => {
      expect(shouldActivate('please autoflow this task')).toBe(true);
    });
  });

  describe('negation patterns - should NOT activate', () => {
    test('does not activate on "don\'t autoflow"', () => {
      expect(shouldActivate("don't autoflow")).toBe(false);
      expect(shouldActivate("don't use autoflow")).toBe(false);
    });

    test('does not activate on "dont autoflow" (no apostrophe)', () => {
      expect(shouldActivate('dont autoflow')).toBe(false);
      expect(shouldActivate('dont use autoflow')).toBe(false);
    });

    test('does not activate on "no autoflow"', () => {
      expect(shouldActivate('no autoflow please')).toBe(false);
    });

    test('does not activate on "not autoflow"', () => {
      expect(shouldActivate('not autoflow this time')).toBe(false);
    });

    test('does not activate on "without autoflow"', () => {
      expect(shouldActivate('do this without autoflow')).toBe(false);
    });
  });

  describe('non-matching patterns', () => {
    test('does not activate without autoflow keyword', () => {
      expect(shouldActivate('implement the feature')).toBe(false);
      expect(shouldActivate('please continue')).toBe(false);
      expect(shouldActivate('')).toBe(false);
    });

    test('does not activate on partial matches', () => {
      expect(shouldActivate('autoflowing')).toBe(false);
      expect(shouldActivate('myautoflow')).toBe(false);
    });
  });
});

describe('userMessageHook', () => {
  let mockState: AutoflowState | null;
  let writtenState: AutoflowState | null;

  const createMockDeps = (): UserMessageDeps => ({
    readState: () => mockState,
    writeState: (state: AutoflowState) => {
      writtenState = state;
    },
  });

  beforeEach(() => {
    mockState = null;
    writtenState = null;
  });

  afterEach(() => {
    mock.restore();
  });

  describe('activation', () => {
    test('activates autoflow when keyword present', async () => {
      const deps = createMockDeps();
      const result = await userMessageHook({ prompt: 'implement feature autoflow', session_id: 'test-session' }, deps);

      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput?.additionalContext).toContain('Autoflow mode active');
      expect(writtenState?.active).toBe(true);
      expect(writtenState?.sessionId).toBe('test-session');
      expect(writtenState?.continueCount).toBe(0);
    });

    test('resets continueCount on activation', async () => {
      mockState = {
        active: true,
        sessionId: 'old-session',
        activatedAt: '2025-01-01',
        continueCount: 5,
        windowStart: '2025-01-01',
      };

      const deps = createMockDeps();
      await userMessageHook({ prompt: 'new task autoflow', session_id: 'new-session' }, deps);

      expect(writtenState?.continueCount).toBe(0);
      expect(writtenState?.sessionId).toBe('new-session');
    });
  });

  describe('per-message deactivation', () => {
    test('deactivates when message lacks autoflow keyword', async () => {
      mockState = {
        active: true,
        sessionId: 'test-session',
        activatedAt: '2025-01-01',
        continueCount: 2,
      };

      const deps = createMockDeps();
      const result = await userMessageHook({ prompt: 'what did you do?' }, deps);

      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
      expect(writtenState?.active).toBe(false);
    });

    test('preserves other state fields on deactivation', async () => {
      mockState = {
        active: true,
        sessionId: 'test-session',
        activatedAt: '2025-01-01T12:00:00Z',
        continueCount: 2,
        windowStart: '2025-01-01T11:55:00Z',
      };

      const deps = createMockDeps();
      await userMessageHook({ prompt: 'stop' }, deps);

      expect(writtenState?.sessionId).toBe('test-session');
      expect(writtenState?.activatedAt).toBe('2025-01-01T12:00:00Z');
    });

    test('does nothing if already inactive', async () => {
      mockState = null;

      const deps = createMockDeps();
      const result = await userMessageHook({ prompt: 'hello' }, deps);

      expect(result.continue).toBe(true);
      expect(writtenState).toBeNull();
    });
  });

  describe('negation handling', () => {
    test('deactivates on negation even if was active', async () => {
      mockState = {
        active: true,
        sessionId: 'test-session',
        activatedAt: '2025-01-01',
        continueCount: 1,
      };

      const deps = createMockDeps();
      await userMessageHook({ prompt: "don't autoflow this" }, deps);

      expect(writtenState?.active).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('handles empty message', async () => {
      const deps = createMockDeps();
      const result = await userMessageHook({ prompt: '' }, deps);

      expect(result.continue).toBe(true);
    });

    test('handles undefined message', async () => {
      const deps = createMockDeps();
      const result = await userMessageHook({}, deps);

      expect(result.continue).toBe(true);
    });

    test('uses unknown session_id if not provided', async () => {
      const deps = createMockDeps();
      await userMessageHook({ prompt: 'autoflow' }, deps);

      expect(writtenState?.sessionId).toBe('unknown');
    });
  });
});
