import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { ClaudeMdHelpers } from '../lib/claude-md';
import type { DiffSummary } from '../lib/diff-summary';
import { GitHelpers } from '../lib/git-helpers';
import type { createLogger } from '../lib/logger';
import type { HookInput } from '../types';
import {
  generateStopOutput,
  type ReviewResult,
  SessionReviewer,
  type StopReviewDependencies,
  stopReviewHook,
} from './stop-review';

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

// Create mock DiffSummary for tests
function createMockDiffSummary(): DiffSummary {
  return {
    summarizeDiff: mock(async (diff: string) => {
      // Return a compressed version
      if (diff.includes('large file')) {
        return '• Major refactoring of large file\n• Added new functionality';
      }
      return `• Summary of ${diff.length} chars of changes`;
    }),
    summarizeDiffs: mock(async (diffs: string[]) => {
      return `Combined summary of ${diffs.length} diffs`;
    }),
  } as unknown as DiffSummary;
}

// Create mock ClaudeSDK for tests
function createMockClaudeSDK() {
  return {
    generateCommitMessage: mock(async () => 'chore: save work in progress'),
    generateBranchName: mock(async () => 'feature/test-branch'),
    prompt: mock(async (prompt: string) => {
      // Return different responses based on prompt content to support different test scenarios
      if (prompt.includes('deviation') || prompt.includes('Breaking changes')) {
        return {
          text: JSON.stringify({
            status: 'deviation',
            message: 'Breaking changes without tests',
            commit_message: 'wip: work in progress',
          }),
          success: true,
        };
      }

      if (prompt.includes('verification') || prompt.includes('test')) {
        return {
          text: JSON.stringify({
            status: 'needs_verification',
            message: "Tests haven't been run",
            commit_message: 'wip: work in progress',
          }),
          success: true,
        };
      }

      // Default on_track response
      return {
        text: JSON.stringify({
          status: 'on_track',
          message: 'Changes look good',
          commit_message: '[wip] TASK_001 work in progress',
        }),
        success: true,
      };
    }),
  };
}

// Create a ClaudeMdHelpers mock for active task
function createMockClaudeMdHelpers(activeTaskId: string = 'TASK_001'): ClaudeMdHelpers {
  const taskNumber = activeTaskId.replace('TASK_', '');
  return {
    getActiveTaskId: mock(() => activeTaskId),
    getActiveTaskContent: mock(() => `# Test Task\n**Task ID:** ${taskNumber}\n**Status:** in-progress\nTest content`),
    getActiveTaskFile: mock(() => `${activeTaskId}.md`),
    getActiveTaskDisplay: mock(() => `${activeTaskId}: Test Task`),
    hasActiveTask: mock(() => true),
    setActiveTask: mock(() => {}),
    clearActiveTask: mock(() => {}),
    getClaudeMdPath: mock(() => '/project/CLAUDE.md'),
  } as unknown as ClaudeMdHelpers;
}

// Type for fileOps in tests
type MockFileOps = {
  existsSync: ReturnType<typeof mock>;
  readFileSync: ReturnType<typeof mock>;
  writeFileSync: ReturnType<typeof mock>;
  unlinkSync: ReturnType<typeof mock>;
  createReadStream?: ReturnType<typeof mock>;
};

describe('stop-review', () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('generateStopOutput', () => {
    test('allows stop when in stop hook regardless of status', () => {
      const review: ReviewResult = {
        status: 'deviation',
        message: 'Major deviation',
        commitMessage: '',
      };

      const output = generateStopOutput(review, true, null);
      expect(output.continue).toBe(true);
      expect(output.systemMessage).toContain('Review: Major deviation');
    });

    test('generates on_track output', () => {
      const review: ReviewResult = {
        status: 'on_track',
        message: 'All good',
        commitMessage: '[wip] Work done',
        details: 'Details here',
      };

      const output = generateStopOutput(review, false);
      expect(output.continue).toBe(true);
      expect(output.systemMessage).toContain('🛤️ Project is on track');
    });

    test('blocks on deviation', () => {
      const review: ReviewResult = {
        status: 'deviation',
        message: 'Wrong direction',
        commitMessage: '',
      };

      const output = generateStopOutput(review, false, null);
      expect(output.decision).toBe('block');
      expect(output.systemMessage).toContain('⚠️ DEVIATION DETECTED');
    });

    test('blocks on needs_verification', () => {
      const review: ReviewResult = {
        status: 'needs_verification',
        message: 'Test your code',
        commitMessage: '',
      };

      const output = generateStopOutput(review, false, null);
      expect(output.decision).toBe('block');
      expect(output.systemMessage).toContain('🔍 VERIFICATION NEEDED');
    });

    test('allows stop on critical_failure', () => {
      const review: ReviewResult = {
        status: 'critical_failure',
        message: 'Deleted important files',
        commitMessage: '',
      };

      const output = generateStopOutput(review, false, null);
      expect(output.continue).toBe(true);
      expect(output.systemMessage).toContain('🚨 CRITICAL ISSUE');
    });
  });

  describe('SessionReviewer', () => {
    describe('review', () => {
      test('handles large diff by compressing and reviewing successfully', async () => {
        const hugeDiff = 'x'.repeat(60000); // Over 50KB limit
        const mockExec = mock((cmd: string) => {
          if (cmd.includes('status')) return 'M file.ts';
          if (cmd.includes('diff')) return hugeDiff;
          return '';
        });

        const fileOps: MockFileOps = {
          readFileSync: mock((path: string) => {
            if (path.includes('CLAUDE.md')) {
              return '## Active Task\n@.claude/tasks/TASK_026.md';
            }
            if (path.includes('TASK_026.md')) {
              return '# Task\n**Task ID:** 026\n**Status:** in-progress\nSome task content';
            }
            return '';
          }),
          existsSync: mock((path: string) => {
            return path.includes('CLAUDE.md') || path.includes('TASK_026.md');
          }),
        };

        const logger = createMockLogger();

        // Create mock DiffSummary that will compress the large diff
        const mockDiffSummary: DiffSummaryInterface = {
          summarizeDiff: mock(async () => '• Large diff compressed successfully'),
          summarizeDiffs: mock(async () => 'Multiple large diffs compressed'),
        };

        // Create a custom mock Claude SDK that returns on_track for compressed diffs
        const mockClaudeSDK = {
          generateCommitMessage: mock(async () => 'feat: compressed large diff successfully'),
          generateBranchName: mock(async () => 'feature/test-branch'),
          prompt: mock(async () => ({
            text: JSON.stringify({
              status: 'on_track',
              message: 'Changes look good',
              commit_message: 'wip: TASK_026 work in progress',
            }),
            success: true,
          })),
        };

        const reviewer = new SessionReviewer('/project', logger, {
          execSync: mockExec as any,
          fileOps: fileOps as any,
          claudeSDK: mockClaudeSDK,
          claudeMdHelpers: createMockClaudeMdHelpers('TASK_026'),
          diffSummary: mockDiffSummary,
        });

        // Mock getRecentMessages to return something
        reviewer.getRecentMessages = mock(async () => 'User: test\nAssistant: testing');

        const result = await reviewer.review('/path/to/transcript');

        // Should handle the large diff successfully by compressing it
        expect(result.status).toBe('on_track');
        expect(result.message).toBe('Changes look good');

        // Verify that DiffSummary was called to compress the diff
        expect(mockDiffSummary.summarizeDiff).toHaveBeenCalled();
      });
    });

    describe('callClaudeForReview', () => {
      test('returns deviation status from Claude', async () => {
        const mockClaudeSDK = createMockClaudeSDK();

        const fileOps: MockFileOps = {
          writeFileSync: mock(() => {}),
          existsSync: mock(() => true),
          readFileSync: mock(() => '@.claude/tasks/TASK_001.md'),
          unlinkSync: mock(() => {}),
        };

        const logger = createMockLogger();

        const reviewer = new SessionReviewer('/project', logger, {
          claudeSDK: mockClaudeSDK,
          fileOps,
        });

        // The mock will return deviation response for prompts containing "deviation"
        const result = await reviewer.callClaudeForReview('Test prompt with deviation content');
        expect(result.status).toBe('deviation');
        expect(result.message).toBe('Breaking changes without tests');
      });

      test('returns on_track status from Claude', async () => {
        const mockClaudeSDK = createMockClaudeSDK();

        const fileOps: MockFileOps = {
          writeFileSync: mock(() => {}),
          existsSync: mock(() => true),
          readFileSync: mock(() => '@.claude/tasks/TASK_001.md'),
          unlinkSync: mock(() => {}),
        };

        const logger = createMockLogger();

        const reviewer = new SessionReviewer('/project', logger, {
          claudeSDK: mockClaudeSDK,
          fileOps,
        });

        const result = await reviewer.callClaudeForReview('Test prompt');
        expect(result.status).toBe('on_track');
        expect(result.commit_message).toContain('[wip] TASK_001');
      });

      test('handles Claude timeout', async () => {
        const mockClaudeSDK = {
          generateCommitMessage: mock(async () => 'chore: save work in progress'),
          generateBranchName: mock(async () => 'feature/test-branch'),
          prompt: mock(async () => {
            const error = new Error('Command timed out');
            (error as { code?: string }).code = 'ETIMEDOUT';
            throw error;
          }),
        };

        const fileOps: MockFileOps = {
          writeFileSync: mock(() => {}),
          existsSync: mock(() => true),
          readFileSync: mock(() => '@.claude/tasks/TASK_001.md'),
          unlinkSync: mock(() => {}),
        };

        const logger = createMockLogger();

        const reviewer = new SessionReviewer('/project', logger, {
          claudeSDK: mockClaudeSDK,
          fileOps,
        });

        const result = await reviewer.callClaudeForReview('Test prompt');
        expect(result.status).toBe('review_failed');
        expect(result.message).toBe('Could not review changes');
      });
    });

    describe('getGitDiff', () => {
      test('returns diff when changes exist', () => {
        const mockExec = mock((cmd: string) => {
          if (cmd.includes('status')) return 'M file.ts';
          if (cmd.includes('diff')) return 'diff content here';
          return '';
        });

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer('/project', logger, { execSync: mockExec });
        const diff = reviewer.getGitDiff();
        expect(diff).toBe('diff content here');
      });

      test('returns empty string when no changes', () => {
        const mockExec = mock(() => '');
        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer('/project', logger, { execSync: mockExec });
        const diff = reviewer.getGitDiff();
        expect(diff).toBe('');
      });
    });

    describe('getFilteredGitDiff', () => {
      test('filters out documentation files', () => {
        const mockExec = mock(
          () => `diff --git a/file.ts b/file.ts
+code change
diff --git a/README.md b/README.md
+doc change
diff --git a/src/test.ts b/src/test.ts
+more code`,
        );

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer('/project', logger, { execSync: mockExec });
        const result = reviewer.getFilteredGitDiff();

        expect(result.hasDocChanges).toBe(true);
        expect(result.docOnlyChanges).toBe(false);
        expect(result.filteredDiff).toContain('file.ts');
        expect(result.filteredDiff).not.toContain('README.md');
        expect(result.filteredDiff).toContain('test.ts');
      });

      test('identifies doc-only changes', () => {
        const mockExec = mock(
          () => `diff --git a/README.md b/README.md
+doc change
diff --git a/docs/guide.md b/docs/guide.md
+more docs`,
        );

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer('/project', logger, { execSync: mockExec });
        const result = reviewer.getFilteredGitDiff();

        expect(result.hasDocChanges).toBe(true);
        expect(result.docOnlyChanges).toBe(true);
        expect(result.filteredDiff).toBe('');
      });

      test('filters out private journal and embedding files', () => {
        const mockExec = mock(
          () => `diff --git a/src/code.ts b/src/code.ts
+code change
diff --git a/.private-journal/2025-09-12/entry.md b/.private-journal/2025-09-12/entry.md
+journal entry
diff --git a/.private-journal/2025-09-12/entry.embedding b/.private-journal/2025-09-12/entry.embedding
+embedding data
diff --git a/some-file.embedding b/some-file.embedding
+other embedding
diff --git a/src/more.ts b/src/more.ts
+more code`,
        );

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer('/project', logger, { execSync: mockExec });
        const result = reviewer.getFilteredGitDiff();

        expect(result.hasDocChanges).toBe(true); // Journal files are treated like docs
        expect(result.docOnlyChanges).toBe(false); // Has code changes too
        expect(result.filteredDiff).toContain('src/code.ts');
        expect(result.filteredDiff).toContain('src/more.ts');
        expect(result.filteredDiff).not.toContain('.private-journal');
        expect(result.filteredDiff).not.toContain('.embedding');
      });
    });

    describe('buildReviewPrompt', () => {
      test('builds prompt with all sections', () => {
        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer('/project', logger);
        const prompt = reviewer.buildReviewPrompt('Task content', 'Recent messages', 'Diff content', false);

        expect(prompt).toContain('Active Task Requirements:');
        expect(prompt).toContain('Recent Conversation');
        expect(prompt).toContain('Git Diff');
        expect(prompt).toContain('Review Categories');
        expect(prompt).toContain('ONLY a valid JSON object');
      });

      test('includes doc note when has doc changes', () => {
        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer('/project', logger);
        const prompt = reviewer.buildReviewPrompt('Task', 'Messages', 'Diff', true);

        expect(prompt).toContain('documentation files have been filtered out');
      });

      test('throws when diff is too large', () => {
        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer('/project', logger);
        const hugeDiff = 'x'.repeat(60000);

        expect(() => {
          reviewer.buildReviewPrompt('Task', 'Messages', hugeDiff, false);
        }).toThrow('Diff too large for review');
      });

      test('handles compressed diff differently in prompt', () => {
        const logger = createMockLogger();
        const reviewer = new SessionReviewer('/project', logger);
        const task = 'Task content';
        const messages = 'Messages';
        const compressedDiff = '### Change Set 1:\n• Added new feature\n\n### Change Set 2:\n• Fixed bug';

        const prompt = reviewer.buildReviewPrompt(task, messages, compressedDiff, false, true);

        expect(prompt).toContain('## Compressed Git Diff Summary (generated by Haiku model):');
        expect(prompt).toContain(compressedDiff);
        expect(prompt).not.toContain('```diff');
        expect(prompt).toContain('The diff has been compressed into summaries to save tokens');
      });

      test('handles raw diff normally', () => {
        const logger = createMockLogger();
        const reviewer = new SessionReviewer('/project', logger);
        const task = 'Task content';
        const messages = 'Messages';
        const rawDiff = 'diff --git a/file.ts\n+new line';

        const prompt = reviewer.buildReviewPrompt(task, messages, rawDiff, false, false);

        expect(prompt).toContain('## Git Diff (code changes only, documentation excluded):');
        expect(prompt).toContain('```diff');
        expect(prompt).not.toContain('compressed into summaries');
      });
    });

    describe('compressDiffForReview', () => {
      test('returns original diff when small', async () => {
        const smallDiff = 'diff --git a/file.ts\n+small change';
        const logger = createMockLogger();
        const reviewer = new SessionReviewer('/project', logger, {});

        const result = await reviewer.compressDiffForReview(smallDiff);

        expect(result).toBe(smallDiff);
        expect(logger.debug).toHaveBeenCalledWith('Diff is small, skipping compression', {
          diffLength: smallDiff.length,
        });
      });

      test('compresses large diff using DiffSummary', async () => {
        const largeDiff = `diff --git a/file1.ts\n${'a'.repeat(6000)}\ndiff --git a/file2.ts\n${'b'.repeat(4000)}`;
        const logger = createMockLogger();
        const mockDiffSummary = createMockDiffSummary();

        const reviewer = new SessionReviewer('/project', logger, { diffSummary: mockDiffSummary });

        const result = await reviewer.compressDiffForReview(largeDiff);

        expect(result).toContain('### Change Set');
        expect(mockDiffSummary.summarizeDiff).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith('Starting diff compression', { originalSize: largeDiff.length });
      });

      test('splits large diffs into chunks', async () => {
        const hugeDiff = `diff --git a/file1.ts\n${'x'.repeat(9000)}\ndiff --git a/file2.ts\n${'y'.repeat(9000)}`;
        const logger = createMockLogger();
        const mockDiffSummary = createMockDiffSummary();

        const reviewer = new SessionReviewer('/project', logger, { diffSummary: mockDiffSummary });

        const result = await reviewer.compressDiffForReview(hugeDiff);

        // Should have created 2 chunks based on file boundaries
        expect(result).toContain('### Change Set 1');
        expect(result).toContain('### Change Set 2');
        expect(mockDiffSummary.summarizeDiff).toHaveBeenCalledTimes(2);
      });

      test('handles compression failure gracefully', async () => {
        const largeDiff = 'x'.repeat(6000);
        const logger = createMockLogger();
        const mockDiffSummary = {
          summarizeDiff: mock(async () => {
            throw new Error('API error');
          }),
        } as unknown as DiffSummary;

        const reviewer = new SessionReviewer('/project', logger, { diffSummary: mockDiffSummary });

        const result = await reviewer.compressDiffForReview(largeDiff);

        // Should fallback to truncated original
        expect(result).toBe(largeDiff.substring(0, 10000));
        expect(logger.warn).toHaveBeenCalledWith('All chunks failed to compress, using truncated original');
      });
    });

    describe('commitChanges', () => {
      test('commits successfully', async () => {
        const commands: string[] = [];
        const mockExec = mock((cmd: string) => {
          commands.push(cmd);
          return '';
        });

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer('/project', logger, { execSync: mockExec });
        const result = await reviewer.commitChanges('[wip] Test commit');

        expect(result).toBe(true);
        expect(commands).toContain('git add -A');
        expect(commands[1]).toContain('[wip] Test commit');
      });

      test('returns false on error', async () => {
        const mockExec = mock(() => {
          throw new Error('Commit failed');
        });

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer('/project', logger, { execSync: mockExec });
        const result = await reviewer.commitChanges('[wip] Test');
        expect(result).toBe(false);
      });
    });

    describe('review', () => {
      test('returns no changes when diff is empty', async () => {
        const mockExec = mock(() => '');
        const fileOps: MockFileOps = {
          existsSync: mock(() => false),
          readFileSync: mock(() => ''),
        };

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer('/project', logger, {
          execSync: mockExec,
          fileOps,
          claudeSDK: createMockClaudeSDK(),
        });
        const result = await reviewer.review('/transcript.jsonl');

        expect(result.status).toBe('on_track');
        expect(result.message).toBe('No changes to commit');
        expect(result.commitMessage).toBe('');
      });

      test('handles doc-only changes without task', async () => {
        const mockExec = mock((cmd: string) => {
          if (cmd.includes('status')) return 'M README.md';
          if (cmd.includes('diff')) return 'diff --git a/README.md b/README.md\n+doc change';
          return '';
        });

        const fileOps: MockFileOps = {
          existsSync: mock(() => false),
          readFileSync: mock(() => ''),
        };

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer('/project', logger, {
          execSync: mockExec,
          fileOps,
          claudeSDK: createMockClaudeSDK(),
        });
        const result = await reviewer.review('/transcript.jsonl');

        expect(result.status).toBe('on_track');
        expect(result.message).toBe('Documentation updates only');
        expect(result.commitMessage).toBe('docs: update project documentation');
      });
    });
  });

  describe('stopReviewHook', () => {
    test('returns early when hook is disabled', async () => {
      const input: HookInput = {
        hook_event_name: 'Stop',
        cwd: '/project',
      };

      const result = await stopReviewHook(input, {
        isHookEnabled: () => false,
      });
      expect(result).toEqual({ continue: true });
    });

    test('returns early when not in git repo', async () => {
      const mockExec = mock(() => {
        throw new Error('Not a git repository');
      });

      const input: HookInput = {
        hook_event_name: 'Stop',
        cwd: '/project',
      };

      const result = await stopReviewHook(input, {
        execSync: mockExec,
        isHookEnabled: () => true,
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('Not a git repository');
    });

    test('returns early when no changes', async () => {
      const mockExec = mock((cmd: string) => {
        if (cmd.includes('rev-parse')) return '.git';
        if (cmd.includes('status')) return '';
        return '';
      });

      const _logger = {
        debug: mock(() => {}),
        info: mock(() => {}),
        error: mock(() => {}),
        exception: mock(() => {}),
      };

      const input: HookInput = {
        hook_event_name: 'Stop',
        cwd: '/project',
      };

      const result = await stopReviewHook(input, {
        execSync: mockExec,
        logger: createMockLogger(),
        isHookEnabled: () => true,
      });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBe('✅ No changes to commit');
    });

    test('handles review and commit successfully', async () => {
      const mockExec = mock((cmd: string) => {
        if (cmd.includes('rev-parse')) return '.git';
        if (cmd.includes('status')) return 'M file.ts';
        if (cmd.includes('diff')) return 'diff content';
        if (cmd.includes('log')) return 'recent commits';
        if (cmd.includes('git add') && cmd.includes('git commit')) return 'Committed';
        return '';
      });

      // Mock file operations for SessionReviewer - MUST include writeFileSync and unlinkSync for Claude temp file
      const fileOps: MockFileOps = {
        existsSync: mock((path: string) => {
          // Return true for temp files so cleanup works
          if (path.includes('stop_review')) return true;
          // Return true for CLAUDE.md and task files to avoid no-task path
          if (path.includes('CLAUDE.md')) return true;
          if (path.includes('TASK')) return true;
          return false;
        }),
        readFileSync: mock((path: string) => {
          // Mock CLAUDE.md to have an active task
          if (path.includes('CLAUDE.md')) {
            return '# Project\n@.claude/tasks/TASK_001.md';
          }
          // Mock task file content
          if (path.includes('TASK')) {
            return '# Task 001\n**Status:** in-progress\n**Task ID:** 001';
          }
          return '';
        }),
        writeFileSync: mock(() => {}), // Critical: mock temp file write for Claude prompt
        unlinkSync: mock(() => {}), // Critical: mock temp file cleanup
        createReadStream: mock(() => {
          // Return a simple mock stream that immediately ends
          const stream = {
            on: mock((event: string, callback: (...args: unknown[]) => void) => {
              if (event === 'end' || event === 'close') {
                // Simulate async end
                setTimeout(() => callback(), 0);
              }
              return stream;
            }),
            pause: mock(() => {}),
            resume: mock(() => {}),
            close: mock(() => {}),
            removeListener: mock(() => stream),
          };
          return stream;
        }),
      };

      const input: HookInput = {
        hook_event_name: 'Stop',
        cwd: '/project',
        session_id: 'test-session',
        // Don't provide transcript_path to avoid readline issues
      };

      // Mock Claude SDK response for review
      const claudeSDK = {
        generateCommitMessage: mock(async () => 'chore: update project configuration'),
        generateBranchName: mock(async () => 'feature/test-branch'),
        prompt: mock(async () => ({
          text: JSON.stringify({
            status: 'on_track',
            message: 'Changes look good',
            commitMessage: '[wip] Working on features',
          }),
          success: true,
        })),
      };

      // Mock GitHelpers to avoid real Claude API calls
      const mockGitHelpers = new GitHelpers(
        mock((cmd: string) => {
          if (cmd.includes('claude')) return 'chore: update project configuration';
          if (cmd.includes('branch --show-current')) return 'main';
          if (cmd.includes('status --porcelain')) return '';
          if (cmd.includes('symbolic-ref')) return 'main';
          return '';
        }),
        undefined,
        {
          generateCommitMessage: mock(async () => 'chore: update project configuration'),
          generateBranchName: mock(async () => 'feature/task-001'),
        },
      );

      const deps: StopReviewDependencies = {
        execSync: mockExec,
        fileOps,
        logger: createMockLogger(),
        isHookEnabled: () => true,
        gitHelpers: mockGitHelpers,
        claudeSDK: claudeSDK as any,
      };

      const result = await stopReviewHook(input, deps);
      expect(result.continue).toBe(true);
    });

    test('blocks on deviation detected from AI review', async () => {
      const commandLog: string[] = [];
      const mockExec = mock(
        (cmd: string, _options?: { cwd?: string; encoding?: string; timeout?: number; shell?: string }) => {
          commandLog.push(cmd);
          console.log('Exec called with:', cmd.substring(0, 100));

          if (cmd.includes('rev-parse')) return '.git';
          if (cmd.includes('status --porcelain')) return 'M file.ts\nM another.ts';
          if (cmd.includes('diff')) return 'diff --git a/file.ts b/file.ts\n+breaking change';
          if (cmd.includes('log')) return 'abc123 Previous commit';
          return '';
        },
      );

      const fileOps: MockFileOps = {
        existsSync: mock((path: string) => {
          if (path.includes('CLAUDE.md')) return true;
          if (path.includes('TASK')) return true;
          if (path.includes('stop_review')) return true; // temp file exists for cleanup
          return false;
        }),
        readFileSync: mock((path: string) => {
          if (path.includes('CLAUDE.md')) return '# Project\n\n@.claude/tasks/TASK_001.md\n';
          if (path.includes('TASK')) return 'Task: Implement feature X\nRequirements:\n- Add tests';
          if (path.includes('transcript')) return ''; // empty transcript
          return '';
        }),
        writeFileSync: mock(() => {}),
        unlinkSync: mock(() => {}),
        createReadStream: mock(() => {
          // Return a simple mock stream that immediately ends
          const stream = {
            on: mock((event: string, callback: (...args: unknown[]) => void) => {
              if (event === 'end') {
                // Simulate async end
                setTimeout(() => callback(), 0);
              }
              return stream;
            }),
            pause: mock(() => {}),
            resume: mock(() => {}),
            close: mock(() => {}),
            removeListener: mock(() => stream),
          };
          return stream;
        }),
      };

      const _logger = {
        debug: mock((...args: unknown[]) => console.log('DEBUG:', ...args)),
        info: mock((...args: unknown[]) => console.log('INFO:', ...args)),
        warn: mock((...args: unknown[]) => console.log('WARN:', ...args)),
        error: mock((...args: unknown[]) => console.log('ERROR:', ...args)),
        exception: mock((msg: string, error: Error) => {
          console.log('EXCEPTION:', msg, error.message, error.stack);
        }),
      } as ReturnType<typeof createLogger>;

      const input: HookInput = {
        hook_event_name: 'Stop',
        cwd: '/project',
        session_id: 'test-session',
        // Don't provide transcript_path to avoid readline issues in test
        // The review will work without transcript messages
      };

      const deps: StopReviewDependencies = {
        execSync: mockExec as any,
        fileOps: fileOps as any,
        claudeMdHelpers: createMockClaudeMdHelpers(),
        logger: createMockLogger(),
        isHookEnabled: () => true,
        claudeSDK: {
          generateCommitMessage: mock(async () => 'wip: work in progress'),
          generateBranchName: mock(async () => 'feature/test-branch'),
          prompt: mock(async () => ({
            text: JSON.stringify({
              status: 'deviation',
              message: 'Breaking changes detected without tests',
              commitMessage: '',
            }),
            success: true,
          })),
        } as any,
      };

      const result = await stopReviewHook(input, deps);
      console.log('Commands executed:', commandLog);
      console.log('Result:', JSON.stringify(result, null, 2));

      expect(result.decision).toBe('block');
      expect(result.systemMessage).toContain('⚠️ DEVIATION DETECTED');
      expect(result.systemMessage).toContain('Breaking changes detected without tests');
    });

    test('blocks on needs_verification from AI review', async () => {
      const mockExec = mock((cmd: string) => {
        if (cmd.includes('rev-parse')) return '.git';
        if (cmd.includes('status')) return 'M file.ts';
        if (cmd.includes('diff')) return 'diff content';
        if (cmd.includes('log')) return '';
        return '';
      });

      const fileOps: MockFileOps = {
        existsSync: mock((path: string) => {
          if (path.includes('stop_review')) return true;
          if (path.includes('CLAUDE.md')) return true;
          if (path.includes('TASK_001')) return true;
          return false;
        }),
        readFileSync: mock((path: string) => {
          if (path.includes('CLAUDE.md')) {
            return '# Project\n@.claude/tasks/TASK_001.md';
          }
          if (path.includes('TASK_001')) {
            return '# Task 001\n**Status:** in-progress';
          }
          return '';
        }),
        writeFileSync: mock(() => {}),
        unlinkSync: mock(() => {}),
        createReadStream: mock(() => {
          // Return a simple mock stream that immediately ends
          const stream = {
            on: mock((event: string, callback: (...args: unknown[]) => void) => {
              if (event === 'end') {
                // Simulate async end
                setTimeout(() => callback(), 0);
              }
              return stream;
            }),
            pause: mock(() => {}),
            resume: mock(() => {}),
            close: mock(() => {}),
            removeListener: mock(() => stream),
          };
          return stream;
        }),
      };

      const input: HookInput = {
        hook_event_name: 'Stop',
        cwd: '/project',
        // Don't provide transcript_path to avoid readline issues
      };

      const result = await stopReviewHook(input, {
        execSync: mockExec as any,
        fileOps: fileOps as any,
        claudeMdHelpers: createMockClaudeMdHelpers(),
        isHookEnabled: () => true,
        claudeSDK: {
          generateCommitMessage: mock(async () => 'wip: work in progress'),
          generateBranchName: mock(async () => 'feature/test-branch'),
          prompt: mock(async () => ({
            text: JSON.stringify({
              status: 'needs_verification',
              message: "Tests haven't been run to verify changes",
              commitMessage: '',
            }),
            success: true,
          })),
        } as any,
      });
      expect(result.decision).toBe('block');
      expect(result.systemMessage).toContain('🔍 VERIFICATION NEEDED');
      expect(result.systemMessage).toContain("Tests haven't been run");
    });

    test('allows stop and commits on on_track status', async () => {
      const commitCommands: string[] = [];
      const mockExec = mock((cmd: string) => {
        if (cmd.includes('git add') || cmd.includes('git commit')) {
          commitCommands.push(cmd);
        }
        if (cmd.includes('rev-parse')) return '.git';
        if (cmd.includes('status')) return 'M file.ts';
        if (cmd.includes('diff')) return 'diff content';
        if (cmd.includes('log')) return '';
        // Mock Claude CLI response - on track
        if (cmd.includes('claude') && cmd.includes('--model sonnet')) {
          return JSON.stringify({
            status: 'on_track',
            message: 'Changes align with requirements',
            commitMessage: '[wip] TASK_001: Implement feature',
            details: 'Added validation logic',
          });
        }
        return '';
      });

      const fileOps: MockFileOps = {
        existsSync: mock((path: string) => {
          if (path.includes('TASK')) return true;
          if (path.includes('stop_review')) return true;
          if (path.includes('CLAUDE.md')) return true;
          return false;
        }),
        readFileSync: mock((path: string) => {
          if (path.includes('CLAUDE.md')) {
            return '# Project\n@.claude/tasks/TASK_001.md';
          }
          if (path.includes('TASK_001')) {
            return '# Task 001\n**Status:** in-progress';
          }
          return '';
        }),
        writeFileSync: mock(() => {}),
        unlinkSync: mock(() => {}),
        createReadStream: mock(() => {
          // Return a simple mock stream that immediately ends
          const stream = {
            on: mock((event: string, callback: (...args: unknown[]) => void) => {
              if (event === 'end') {
                // Simulate async end
                setTimeout(() => callback(), 0);
              }
              return stream;
            }),
            pause: mock(() => {}),
            resume: mock(() => {}),
            close: mock(() => {}),
            removeListener: mock(() => stream),
          };
          return stream;
        }),
      };

      const input: HookInput = {
        hook_event_name: 'Stop',
        cwd: '/project',
        // Don't provide transcript_path to avoid readline issues
      };

      const result = await stopReviewHook(input, {
        execSync: mockExec as any,
        fileOps: fileOps as any,
        claudeMdHelpers: createMockClaudeMdHelpers(),
        isHookEnabled: () => true,
        claudeSDK: {
          generateCommitMessage: mock(async () => '[wip] TASK_001: Implement feature'),
          generateBranchName: mock(async () => 'feature/test-branch'),
          prompt: mock(async () => ({
            text: JSON.stringify({
              status: 'on_track',
              message: 'Changes align with requirements',
              commitMessage: '[wip] TASK_001: Implement feature',
              details: 'Added validation logic',
            }),
            success: true,
          })),
        } as any,
      });

      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('🛤️ Project is on track');
      expect(commitCommands.some((cmd) => cmd.includes('git add'))).toBe(true);
      expect(commitCommands.some((cmd) => cmd.includes('[wip] TASK_001'))).toBe(true);
    });

    test('handles critical_failure from AI review', async () => {
      const mockExec = mock((cmd: string) => {
        if (cmd.includes('rev-parse')) return '.git';
        if (cmd.includes('status')) return 'M file.ts';
        if (cmd.includes('diff')) return 'diff content';
        // Mock Claude CLI response - critical failure
        if (cmd.includes('claude') && cmd.includes('--model sonnet')) {
          return JSON.stringify({
            status: 'critical_failure',
            message: 'Deleted critical authentication logic',
            commitMessage: '',
          });
        }
        return '';
      });

      const fileOps: MockFileOps = {
        existsSync: mock((path: string) => {
          if (path.includes('stop_review')) return true;
          if (path.includes('CLAUDE.md')) return true;
          if (path.includes('TASK_001')) return true;
          return false;
        }),
        readFileSync: mock((path: string) => {
          if (path.includes('CLAUDE.md')) {
            return '# Project\n@.claude/tasks/TASK_001.md';
          }
          if (path.includes('TASK_001')) {
            return '# Task 001\n**Status:** in-progress';
          }
          return '';
        }),
        writeFileSync: mock(() => {}),
        unlinkSync: mock(() => {}),
        createReadStream: mock(() => {
          // Return a simple mock stream that immediately ends
          const stream = {
            on: mock((event: string, callback: (...args: unknown[]) => void) => {
              if (event === 'end') {
                // Simulate async end
                setTimeout(() => callback(), 0);
              }
              return stream;
            }),
            pause: mock(() => {}),
            resume: mock(() => {}),
            close: mock(() => {}),
            removeListener: mock(() => stream),
          };
          return stream;
        }),
      };

      const input: HookInput = {
        hook_event_name: 'Stop',
        cwd: '/project',
        // Don't provide transcript_path to avoid readline issues
      };

      const result = await stopReviewHook(input, {
        execSync: mockExec as any,
        fileOps: fileOps as any,
        claudeMdHelpers: createMockClaudeMdHelpers(),
        isHookEnabled: () => true,
        claudeSDK: {
          generateCommitMessage: mock(async () => 'wip: work in progress'),
          generateBranchName: mock(async () => 'feature/test-branch'),
          prompt: mock(async () => ({
            text: JSON.stringify({
              status: 'critical_failure',
              message: 'Deleted critical authentication logic',
              commitMessage: '',
            }),
            success: true,
          })),
        } as any,
      });

      expect(result.continue).toBe(true); // Allows stop but with warning
      expect(result.systemMessage).toContain('🚨 CRITICAL ISSUE');
      expect(result.systemMessage).toContain('Deleted critical authentication logic');
    });

    test('handles AI review timeout gracefully', async () => {
      const mockExec = mock((cmd: string) => {
        if (cmd.includes('rev-parse')) return '.git';
        if (cmd.includes('status')) return 'M file.ts';
        if (cmd.includes('diff')) return 'diff content';
        // Mock Claude CLI timeout
        if (cmd.includes('claude') && cmd.includes('--model sonnet')) {
          const error = new Error('Command timed out');
          (error as { code?: string }).code = 'ETIMEDOUT';
          throw error;
        }
        return '';
      });

      const fileOps: MockFileOps = {
        existsSync: mock((path: string) => {
          if (path.includes('stop_review')) return true;
          if (path.includes('CLAUDE.md')) return true;
          if (path.includes('TASK_001')) return true;
          return false;
        }),
        readFileSync: mock((path: string) => {
          if (path.includes('CLAUDE.md')) {
            return '# Project\n@.claude/tasks/TASK_001.md';
          }
          if (path.includes('TASK_001')) {
            return '# Task 001\n**Status:** in-progress';
          }
          return '';
        }),
        writeFileSync: mock(() => {}),
        unlinkSync: mock(() => {}),
        createReadStream: mock(() => {
          // Return a simple mock stream that immediately ends
          const stream = {
            on: mock((event: string, callback: (...args: unknown[]) => void) => {
              if (event === 'end') {
                // Simulate async end
                setTimeout(() => callback(), 0);
              }
              return stream;
            }),
            pause: mock(() => {}),
            resume: mock(() => {}),
            close: mock(() => {}),
            removeListener: mock(() => stream),
          };
          return stream;
        }),
      };

      const input: HookInput = {
        hook_event_name: 'Stop',
        cwd: '/project',
        // Don't provide transcript_path to avoid readline issues
      };

      const result = await stopReviewHook(input, {
        execSync: mockExec as any,
        fileOps: fileOps as any,
        claudeMdHelpers: createMockClaudeMdHelpers(),
        isHookEnabled: () => true,
        claudeSDK: {
          generateCommitMessage: mock(async () => 'wip: work in progress'),
          generateBranchName: mock(async () => 'feature/test-branch'),
          prompt: mock(async () => {
            const error = new Error('Command timed out');
            (error as { code?: string }).code = 'ETIMEDOUT';
            throw error;
          }),
        } as any,
      });

      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('Could not review changes');
    });

    test('handles malformed AI response gracefully', async () => {
      const mockExec = mock((cmd: string) => {
        if (cmd.includes('rev-parse')) return '.git';
        if (cmd.includes('status')) return 'M file.ts';
        if (cmd.includes('diff')) return 'diff content';
        if (cmd.includes('log')) return ''; // Add missing log mock
        // Mock Claude CLI with invalid JSON
        if (cmd.includes('claude') && cmd.includes('sonnet')) {
          return 'Not valid JSON response';
        }
        return '';
      });

      const fileOps: MockFileOps = {
        existsSync: mock((path: string) => path.includes('stop_review') || path.includes('CLAUDE.md')),
        readFileSync: mock((path: string) => {
          if (path.includes('CLAUDE.md')) {
            return '# Project\n@.claude/no_active_task.md';
          }
          return '';
        }),
        writeFileSync: mock(() => {}),
        unlinkSync: mock(() => {}),
        createReadStream: mock(() => {
          // Return a simple mock stream that immediately ends
          const stream = {
            on: mock((event: string, callback: (...args: unknown[]) => void) => {
              if (event === 'end' || event === 'close') {
                // Simulate async end
                setTimeout(() => callback(), 0);
              }
              return stream;
            }),
            pause: mock(() => {}),
            resume: mock(() => {}),
            close: mock(() => {}),
            removeListener: mock(() => stream),
          };
          return stream;
        }),
      };

      const input: HookInput = {
        hook_event_name: 'Stop',
        cwd: '/project',
        // Don't provide transcript_path to avoid readline issues
      };

      // Mock GitHelpers to avoid real Claude API calls
      const mockGitHelpers = new GitHelpers(
        mock((cmd: string) => {
          if (cmd.includes('branch --show-current')) return 'main';
          if (cmd.includes('status --porcelain')) return '';
          if (cmd.includes('symbolic-ref')) return 'main';
          return '';
        }),
        undefined,
        {
          generateCommitMessage: mock(async () => 'chore: work in progress'),
          generateBranchName: mock(async () => 'feature/test-branch'),
        },
      );

      const result = await stopReviewHook(input, {
        execSync: mockExec,
        fileOps,
        logger: createMockLogger(),
        isHookEnabled: () => true,
        gitHelpers: mockGitHelpers,
      });

      expect(result.continue).toBe(true);
      // When no active task, doesn't call Claude for review
      expect(result.systemMessage).toContain('Project is on track');
    });
  });
});
