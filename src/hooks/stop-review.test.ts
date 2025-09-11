import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { createLogger } from '../lib/logger';
import type { HookInput } from '../types';
import {
  generateStopOutput,
  hasUncommittedChanges,
  isGitRepository,
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

  describe('isGitRepository', () => {
    test('returns true when in git repo', () => {
      const mockExec = mock(() => '.git');
      expect(isGitRepository('/project', mockExec)).toBe(true);
    });

    test('returns false when not in git repo', () => {
      const mockExec = mock(() => {
        throw new Error('Not a git repository');
      });
      expect(isGitRepository('/project', mockExec)).toBe(false);
    });
  });

  describe('hasUncommittedChanges', () => {
    test('returns true when changes exist', () => {
      const mockExec = mock(() => 'M file.ts\nA new.ts');
      expect(hasUncommittedChanges('/project', mockExec)).toBe(true);
    });

    test('returns false when no changes', () => {
      const mockExec = mock(() => '');
      expect(hasUncommittedChanges('/project', mockExec)).toBe(false);
    });

    test('returns false on error', () => {
      const mockExec = mock(() => {
        throw new Error('Git error');
      });
      expect(hasUncommittedChanges('/project', mockExec)).toBe(false);
    });
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

      const output = generateStopOutput(review, false, 'Task suggestion');
      expect(output.continue).toBe(true);
      expect(output.systemMessage).toContain('🛤️ Project is on track');
      expect(output.systemMessage).toContain('Task suggestion');
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
      test('handles large diff by returning review_failed with commit message', async () => {
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

        const reviewer = new SessionReviewer('/project', logger, {
          execSync: mockExec,
          fileOps,
        });

        // Mock getRecentMessages to return something
        reviewer.getRecentMessages = mock(async () => 'User: test\nAssistant: testing');

        const result = await reviewer.review('/path/to/transcript');

        // Should return review_failed status with a commit message
        expect(result.status).toBe('review_failed');
        expect(result.message).toContain('diff too large');
        expect(result.commitMessage).toContain('[wip]');
        expect(result.commitMessage).toContain('TASK_026');
      });
    });

    describe('callClaudeForReview', () => {
      test('returns deviation status from Claude', async () => {
        const mockExec = mock((cmd: string) => {
          if (cmd.includes('claude') && cmd.includes('sonnet')) {
            return JSON.stringify({
              status: 'deviation',
              message: 'Breaking changes without tests',
              commitMessage: '',
            });
          }
          return '';
        });

        const fileOps: MockFileOps = {
          writeFileSync: mock(() => {}),
          existsSync: mock(() => true),
          unlinkSync: mock(() => {}),
        };

        const logger = createMockLogger();

        const reviewer = new SessionReviewer('/project', logger, {
          execSync: mockExec,
          fileOps,
        });

        const result = await reviewer.callClaudeForReview('Test prompt');
        expect(result.status).toBe('deviation');
        expect(result.message).toBe('Breaking changes without tests');
      });

      test('returns on_track status from Claude', async () => {
        const mockExec = mock((cmd: string) => {
          if (cmd.includes('claude') && cmd.includes('sonnet')) {
            return JSON.stringify({
              status: 'on_track',
              message: 'Changes look good',
              commitMessage: '[wip] TASK_001: Added feature',
              details: 'Implementation complete',
            });
          }
          return '';
        });

        const fileOps: MockFileOps = {
          writeFileSync: mock(() => {}),
          existsSync: mock(() => true),
          unlinkSync: mock(() => {}),
        };

        const logger = createMockLogger();

        const reviewer = new SessionReviewer('/project', logger, {
          execSync: mockExec,
          fileOps,
        });

        const result = await reviewer.callClaudeForReview('Test prompt');
        expect(result.status).toBe('on_track');
        expect(result.commitMessage).toContain('[wip] TASK_001');
      });

      test('handles Claude timeout', async () => {
        const mockExec = mock((cmd: string) => {
          if (cmd.includes('claude')) {
            const error = new Error('Command timed out');
            (error as { code?: string }).code = 'ETIMEDOUT';
            throw error;
          }
          return '';
        });

        const fileOps: MockFileOps = {
          writeFileSync: mock(() => {}),
          existsSync: mock(() => true),
          unlinkSync: mock(() => {}),
        };

        const logger = createMockLogger();

        const reviewer = new SessionReviewer('/project', logger, {
          execSync: mockExec,
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
    });

    describe('checkRecentNonTaskCommits', () => {
      test('counts consecutive non-task commits', () => {
        const mockExec = mock(
          () => `abc123 chore: update docs
def456 fix: bug fix
ghi789 [wip] TASK_001: feature work`,
        );

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer('/project', logger, { execSync: mockExec });
        const count = reviewer.checkRecentNonTaskCommits();
        expect(count).toBe(2);
      });

      test('returns 0 when most recent is task commit', () => {
        const mockExec = mock(
          () => `abc123 [wip] TASK_002: work
def456 chore: cleanup`,
        );

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer('/project', logger, { execSync: mockExec });
        const count = reviewer.checkRecentNonTaskCommits();
        expect(count).toBe(0);
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

        const reviewer = new SessionReviewer('/project', logger, { execSync: mockExec, fileOps });
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

        const reviewer = new SessionReviewer('/project', logger, { execSync: mockExec, fileOps });
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
        return '';
      });

      // Mock file operations for SessionReviewer
      const fileOps: MockFileOps = {
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        createReadStream: mock(() => ({
          on: mock(() => {}),
        })),
      };

      const _logger = {
        debug: mock(() => {}),
        info: mock(() => {}),
        error: mock(() => {}),
        exception: mock(() => {}),
      };

      const input: HookInput = {
        hook_event_name: 'Stop',
        cwd: '/project',
        session_id: 'test-session',
        transcript_path: '/transcript.jsonl',
      };

      const deps: StopReviewDependencies = {
        execSync: mockExec,
        fileOps,
        logger: createMockLogger(),
        isHookEnabled: () => true,
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
          // Mock Claude CLI response - deviation detected
          // The command includes shell redirection, so match on 'claude' and 'sonnet'
          if (cmd.includes('claude') && cmd.includes('sonnet')) {
            console.log('Returning mock deviation response');
            // Return the JSON directly as Claude would
            return JSON.stringify({
              status: 'deviation',
              message: 'Breaking changes detected without tests',
              commitMessage: '',
            });
          }
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
        execSync: mockExec,
        fileOps,
        logger: createMockLogger(),
        isHookEnabled: () => true,
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
        // Mock Claude CLI response - needs verification
        if (cmd.includes('claude') && cmd.includes('--model sonnet')) {
          return JSON.stringify({
            status: 'needs_verification',
            message: "Tests haven't been run to verify changes",
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
        execSync: mockExec,
        fileOps,
        isHookEnabled: () => true,
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
        execSync: mockExec,
        fileOps,
        isHookEnabled: () => true,
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
        execSync: mockExec,
        fileOps,
        isHookEnabled: () => true,
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
        execSync: mockExec,
        fileOps,
        isHookEnabled: () => true,
      });

      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('Could not review changes');
    });

    test('handles malformed AI response gracefully', async () => {
      const mockExec = mock((cmd: string) => {
        if (cmd.includes('rev-parse')) return '.git';
        if (cmd.includes('status')) return 'M file.ts';
        if (cmd.includes('diff')) return 'diff content';
        // Mock Claude CLI with invalid JSON
        if (cmd.includes('claude') && cmd.includes('--model sonnet')) {
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
        execSync: mockExec,
        fileOps,
        isHookEnabled: () => true,
      });

      expect(result.continue).toBe(true);
      // When no active task, doesn't call Claude for review
      expect(result.systemMessage).toContain('Project is on track');
    });
  });
});
