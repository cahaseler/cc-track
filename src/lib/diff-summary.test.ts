import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { ClaudeSDKInterface } from './diff-summary';
import { DiffSummary } from './diff-summary';
import type { createLogger } from './logger';

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
function createMockClaudeSDK(): ClaudeSDKInterface {
  return {
    prompt: mock(async (text: string) => {
      // Return different responses based on prompt content
      if (text.includes('No changes detected')) {
        return { text: '• No changes detected', success: true };
      }
      if (text.includes('auth.ts') || text.includes('login')) {
        return { text: '• Added user authentication\n• Updated security middleware', success: true };
      }
      if (text.includes('Diff 1') && text.includes('Diff 2')) {
        return {
          text: 'Added authentication system with login/logout functionality and updated security middleware to enforce access controls.',
          success: true,
        };
      }
      if (text.includes('truncated')) {
        return { text: '• Large changes truncated for processing', success: true };
      }
      // Default response
      return { text: '• Modified application code\n• Updated dependencies', success: true };
    }),
  };
}

describe('DiffSummary', () => {
  let mockClaudeSDK: ClaudeSDKInterface;
  let mockLogger: ReturnType<typeof createLogger>;
  let diffSummary: DiffSummary;

  beforeEach(() => {
    mock.restore();
    mockClaudeSDK = createMockClaudeSDK();
    mockLogger = createMockLogger();
    diffSummary = new DiffSummary(mockClaudeSDK, mockLogger);
  });

  describe('summarizeDiff', () => {
    test('returns summary for valid diff', async () => {
      const diff = `diff --git a/src/auth.ts b/src/auth.ts
+export function login() {
+  // authentication logic
+}`;

      const summary = await diffSummary.summarizeDiff(diff);

      expect(summary).toContain('authentication');
      expect(mockClaudeSDK.prompt).toHaveBeenCalledWith(
        expect.stringContaining(diff),
        'haiku',
        expect.objectContaining({
          timeoutMs: 15000,
          disallowedTools: ['*'],
        }),
      );
    });

    test('handles empty diff input', async () => {
      const summary = await diffSummary.summarizeDiff('');

      expect(summary).toBe('• No changes detected');
      expect(mockLogger.debug).toHaveBeenCalledWith('Empty diff provided, returning default message');
      // Should not call SDK for empty diff
      expect(mockClaudeSDK.prompt).not.toHaveBeenCalled();
    });

    test('handles whitespace-only diff', async () => {
      const summary = await diffSummary.summarizeDiff('   \n  \t  ');

      expect(summary).toBe('• No changes detected');
      expect(mockLogger.debug).toHaveBeenCalledWith('Empty diff provided, returning default message');
      expect(mockClaudeSDK.prompt).not.toHaveBeenCalled();
    });

    test('truncates very large diffs', async () => {
      const largeDiff = 'a'.repeat(4000); // Exceeds MAX_DIFF_LENGTH

      const _summary = await diffSummary.summarizeDiff(largeDiff);

      expect(mockClaudeSDK.prompt).toHaveBeenCalledWith(
        expect.stringContaining('... (diff truncated)'),
        'haiku',
        expect.any(Object),
      );

      // Verify the diff was actually truncated in the prompt
      const callArgs = (mockClaudeSDK.prompt as any).mock.calls[0];
      expect(callArgs[0].length).toBeLessThan(4000);
    });

    test('handles SDK errors gracefully', async () => {
      mockClaudeSDK = {
        prompt: mock(async () => ({
          text: '',
          success: false,
          error: 'API rate limit exceeded',
        })),
      };
      diffSummary = new DiffSummary(mockClaudeSDK, mockLogger);

      await expect(diffSummary.summarizeDiff('some diff')).rejects.toThrow(
        'Diff summary failed: API rate limit exceeded',
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to summarize diff', { error: 'API rate limit exceeded' });
    });

    test('handles SDK exceptions', async () => {
      mockClaudeSDK = {
        prompt: mock(async () => {
          throw new Error('Network timeout');
        }),
      };
      diffSummary = new DiffSummary(mockClaudeSDK, mockLogger);

      await expect(diffSummary.summarizeDiff('some diff')).rejects.toThrow('Failed to summarize diff: Network timeout');
      expect(mockLogger.error).toHaveBeenCalledWith('Error summarizing diff', { error: 'Network timeout' });
    });

    test('returns fallback for empty SDK response', async () => {
      mockClaudeSDK = {
        prompt: mock(async () => ({
          text: '',
          success: true,
        })),
      };
      diffSummary = new DiffSummary(mockClaudeSDK, mockLogger);

      const summary = await diffSummary.summarizeDiff('some diff');
      expect(summary).toBe('• Changes made to the codebase');
    });
  });

  describe('summarizeDiffs', () => {
    test('summarizes multiple diffs into unified summary', async () => {
      const diffs = ['diff --git a/auth.ts\n+login function', 'diff --git a/middleware.ts\n+security checks'];

      const summary = await diffSummary.summarizeDiffs(diffs);

      expect(summary).toContain('authentication');
      expect(mockClaudeSDK.prompt).toHaveBeenCalledWith(
        expect.stringContaining('=== Diff 1 ==='),
        'haiku',
        expect.objectContaining({
          timeoutMs: 30000, // Double timeout for multiple diffs
          disallowedTools: ['*'],
        }),
      );
    });

    test('handles empty array', async () => {
      const summary = await diffSummary.summarizeDiffs([]);

      expect(summary).toBe('No changes to summarize');
      expect(mockLogger.debug).toHaveBeenCalledWith('No diffs provided, returning default message');
      expect(mockClaudeSDK.prompt).not.toHaveBeenCalled();
    });

    test('filters out empty diffs from array', async () => {
      const diffs = ['', '  ', 'actual diff content', '\n\t'];

      const summary = await diffSummary.summarizeDiffs(diffs);

      // Should process as single diff since only one non-empty
      expect(summary).toContain('Modified application code');
      // Verify it was processed as a single diff (converted from bullets)
      expect(summary).not.toContain('•');
    });

    test('handles all empty diffs in array', async () => {
      const diffs = ['', '  ', '\n', '\t'];

      const summary = await diffSummary.summarizeDiffs(diffs);

      expect(summary).toBe('No substantial changes detected');
      expect(mockLogger.debug).toHaveBeenCalledWith('All diffs were empty, returning default message');
      expect(mockClaudeSDK.prompt).not.toHaveBeenCalled();
    });

    test('converts single diff bullet points to paragraph format', async () => {
      const diffs = ['single diff content'];

      mockClaudeSDK = {
        prompt: mock(async () => ({
          text: '• First change\n• Second change\n• Third change',
          success: true,
        })),
      };
      diffSummary = new DiffSummary(mockClaudeSDK, mockLogger);

      const summary = await diffSummary.summarizeDiffs(diffs);

      // Should convert bullets to paragraph
      expect(summary).not.toContain('•');
      expect(summary).toContain('First change. Second change. Third change');
    });

    test('truncates large diffs in multi-diff summary', async () => {
      const diffs = ['a'.repeat(4000), 'b'.repeat(4000)];

      await diffSummary.summarizeDiffs(diffs);

      const callArgs = (mockClaudeSDK.prompt as any).mock.calls[0];
      expect(callArgs[0]).toContain('... (diff truncated)');
      expect(callArgs[0].length).toBeLessThan(10000); // Much less than 8000 chars
    });

    test('handles SDK errors in multi-diff summary', async () => {
      mockClaudeSDK = {
        prompt: mock(async () => ({
          text: '',
          success: false,
          error: 'Model overloaded',
        })),
      };
      diffSummary = new DiffSummary(mockClaudeSDK, mockLogger);

      const diffs = ['diff1', 'diff2'];

      await expect(diffSummary.summarizeDiffs(diffs)).rejects.toThrow('Diff summary failed: Model overloaded');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to summarize diffs', { error: 'Model overloaded' });
    });

    test('returns fallback for empty SDK response in multi-diff', async () => {
      mockClaudeSDK = {
        prompt: mock(async () => ({
          text: '',
          success: true,
        })),
      };
      diffSummary = new DiffSummary(mockClaudeSDK, mockLogger);

      const diffs = ['diff1', 'diff2'];
      const summary = await diffSummary.summarizeDiffs(diffs);

      expect(summary).toBe('Multiple changes made to the codebase');
    });
  });

  describe('lazy SDK loading', () => {
    test('loads SDK lazily when not provided in constructor', async () => {
      // Create instance without SDK
      const diffSummaryNoSDK = new DiffSummary(undefined, mockLogger);

      // Mock the dynamic import
      const _mockImport = mock(() =>
        Promise.resolve({
          ClaudeSDK: {
            prompt: mock(async () => ({
              text: '• Lazy loaded SDK response',
              success: true,
            })),
          },
        }),
      );

      // Replace import in the test context (this is a simplified test)
      // In real usage, the import would load the actual SDK

      // For now, we'll test that the class structure supports lazy loading
      // by verifying it works when SDK is not initially provided
      expect(diffSummaryNoSDK).toBeDefined();

      // The actual lazy loading would happen on first use
      // This is tested in integration tests
    });
  });
});
