// ABOUTME: Comprehensive integration tests for runCompleteTask function
// ABOUTME: Tests full workflow paths, failure scenarios with rollback, option flags, and edge cases

import { describe, expect, mock, test } from 'bun:test';
import type { ExecSyncOptions } from 'node:child_process';
import path from 'node:path';
import type { CompleteTaskDeps } from '../../commands/scripts/complete-task';
import { runCompleteTask } from '../../commands/scripts/complete-task';
import { createMockCompleteTaskDeps } from '../../test-utils/command-mocks';

describe('runCompleteTask - comprehensive integration tests', () => {
  const claudePath = path.join('/project', 'CLAUDE.md');
  const specDir = path.join('/project', '.claude', 'specs', '001-example-task');
  const specPath = path.join(specDir, 'spec.md');
  const metadataPath = path.join(specDir, '.metadata.json');
  const noActiveTaskPath = path.join('/project', '.claude', 'no_active_task.md');

  function createInitialFiles(metadata?: Partial<Record<string, unknown>>): Record<string, string> {
    const defaultMetadata = {
      task_id: '001',
      feature_name: 'example-task',
      branch: 'feature/001-example-task',
      status: 'in_progress',
      started: '2025-01-01T00:00:00.000Z',
      ...metadata,
    };

    return {
      [claudePath]: '# CLAUDE\n## Active Task\n@.claude/specs/001-example-task/spec.md\n',
      [specPath]: '# Task 001: Example Feature\n\nTask description...\n',
      [metadataPath]: JSON.stringify(defaultMetadata),
      [noActiveTaskPath]:
        '# No active task\n\nThe following tasks are being tracked in this project:\n\n## Completed Tasks:\n',
    };
  }

  function addSpecMocks(state: ReturnType<typeof createMockCompleteTaskDeps>) {
    state.setDeps({
      getActiveSpecDirectory: mock(() => specDir),
      getActiveMetadata: mock(() => {
        const content = state.files.get(metadataPath);
        return content ? JSON.parse(content) : null;
      }),
      readSpecFile: mock((dir: string, filename: string) => {
        const filePath = path.join(dir, filename);
        return state.files.get(filePath) ?? null;
      }),
      updateMetadata: mock((_dir: string, updates: Record<string, unknown>) => {
        const existingContent = state.files.get(metadataPath);
        const existing = existingContent ? JSON.parse(existingContent) : {};
        const updated = { ...existing, ...updates };
        state.files.set(metadataPath, JSON.stringify(updated));
      }),
    });
  }

  describe('Full Success Path', () => {
    test('completes task with all features: validation → squash → PR → cleanup', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      const execMock = mock((command: string | Buffer, _options?: ExecSyncOptions) => {
        const cmd = typeof command === 'string' ? command : command.toString();
        state.execCommands.push(cmd);

        // Validation passed (skipValidation: false)
        if (cmd.startsWith('git status --porcelain')) return '';
        if (cmd.startsWith('git diff --name-only')) return 'src/feature.ts\nsrc/feature.test.ts\n';

        // Squashing
        if (cmd.startsWith('git rev-list --count')) return '5';
        if (cmd.startsWith('git reset --soft')) return '';
        if (cmd.startsWith('git commit -m')) return '';

        // PR workflow
        if (cmd.startsWith('gh pr list')) return '[]';
        if (cmd.startsWith('git rev-parse')) throw new Error('not found');
        if (cmd.startsWith('gh pr create')) return 'https://github.com/owner/repo/pull/42';
        if (cmd.startsWith('git checkout main')) return '';
        if (cmd.startsWith('git pull origin main')) return '';

        return '';
      }) as unknown as CompleteTaskDeps['execSync'];

      state.setDeps({
        execSync: execMock,
        getCurrentBranch: mock(() => 'feature/001-example-task'),
        getDefaultBranch: mock(() => 'main'),
        getMergeBase: mock(() => 'abc123'),
        pushCurrentBranch: mock(() => true),
        isGitHubIntegrationEnabled: mock(() => true),
        getGitHubConfig: mock(() => ({ auto_create_prs: true })),
      });

      const result = await runCompleteTask({ skipValidation: true }, state.deps);

      expect(result.success).toBeTrue();
      if (!result.success) return;

      // Verify full workflow
      expect(result.data?.validation.preflightPassed).toBeTrue();
      expect(result.data?.git.squashed).toBeTrue();
      expect(result.data?.git.wipCommitCount).toBe(5);
      expect(result.data?.git.branchPushed).toBeTrue();
      expect(result.data?.github?.prCreated).toBeTrue();
      expect(result.data?.github?.prUrl).toBe('https://github.com/owner/repo/pull/42');
      expect(result.data?.git.branchSwitched).toBeTrue();
      expect(result.data?.git.defaultBranch).toBe('main');

      // Verify state changes
      const metadata = JSON.parse(state.files.get(metadataPath) ?? '{}');
      expect(metadata.status).toBe('completed');
      expect(metadata.completed).toBe('2025-01-01');

      const claudeMd = state.files.get(claudePath);
      expect(claudeMd).toContain('@.claude/no_active_task.md');
      expect(claudeMd).not.toContain('@.claude/specs/001-example-task/spec.md');

      const noActiveTask = state.files.get(noActiveTaskPath);
      expect(noActiveTask).toContain('- 001: Task 001: Example Feature');

      // Verify git commands executed
      expect(state.execCommands.some((cmd) => cmd.includes('git reset --soft'))).toBeTrue();
      expect(state.execCommands.some((cmd) => cmd.includes('gh pr create'))).toBeTrue();
      expect(state.execCommands.some((cmd) => cmd.includes('git checkout main'))).toBeTrue();
    });
  });

  describe('Failure Paths with Rollback', () => {
    test('reverts all changes when push fails', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      // Store original state
      const originalClaudeMd = state.files.get(claudePath);
      const originalMetadata = state.files.get(metadataPath);
      const originalNoActiveTask = state.files.get(noActiveTaskPath);

      state.setDeps({
        getCurrentBranch: mock(() => 'feature/001-example-task'),
        getDefaultBranch: mock(() => 'main'),
        getMergeBase: mock(() => 'abc123'),
        pushCurrentBranch: mock(() => false), // Push fails
        isGitHubIntegrationEnabled: mock(() => true),
        getGitHubConfig: mock(() => ({ auto_create_prs: true })),
        execSync: mock((command: string | Buffer) => {
          const cmd = typeof command === 'string' ? command : command.toString();
          state.execCommands.push(cmd);
          if (cmd.startsWith('git status --porcelain')) return '';
          if (cmd.startsWith('gh pr list')) return '[]';
          if (cmd.startsWith('git rev-parse')) throw new Error('not found');
          if (cmd.startsWith('git rev-list --count')) return '3';
          if (cmd.startsWith('git diff --name-only')) return 'src/feature.ts\n';
          return '';
        }) as unknown as CompleteTaskDeps['execSync'],
      });

      const result = await runCompleteTask({ skipValidation: true }, state.deps);

      expect(result.success).toBeFalse();
      if (result.success) return;

      // Verify rollback
      expect(result.data?.git.reverted).toBeTrue();
      expect(result.error).toContain('Failed to push branch to origin');

      // Verify all files reverted
      expect(state.files.get(claudePath)).toBe(originalClaudeMd);
      expect(state.files.get(metadataPath)).toBe(originalMetadata);
      expect(state.files.get(noActiveTaskPath)).toBe(originalNoActiveTask);

      // Task should still be in_progress
      const metadata = JSON.parse(state.files.get(metadataPath) ?? '{}');
      expect(metadata.status).toBe('in_progress');
    });

    test('fails validation with detailed error messages', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      state.setDeps({
        runValidationChecks: mock(async () => ({
          success: true,
          readyForCompletion: false,
          task: { exists: true, taskId: '001', status: 'in_progress' },
          validation: {
            typescript: { passed: false, errorCount: 3, errors: 'TS errors' },
            lint: { passed: false, issueCount: 5, errors: 'Lint issues' },
            tests: { passed: false, failCount: 2, errors: 'Test failures' },
            knip: { passed: false, unusedFiles: 1, unusedExports: 4, unusedDeps: 2 },
          },
          git: {
            hasUncommittedChanges: false,
            modifiedFiles: [],
            wipCommitCount: 0,
            currentBranch: 'main',
            isTaskBranch: false,
          },
          warnings: [],
        })),
      });

      const result = await runCompleteTask({}, state.deps); // validation not skipped

      expect(result.success).toBeFalse();
      if (result.success) return;

      expect(result.error).toContain('Pre-flight validation failed');
      expect(result.data?.validation.typescript).toBe('3 errors');
      expect(result.data?.validation.lint).toBe('5 issues');
      expect(result.data?.validation.tests).toBe('2 tests failing');
      expect(result.data?.validation.knip).toBe('1 unused files, 4 unused exports, 2 unused dependencies');

      // Task should remain in_progress
      const metadata = JSON.parse(state.files.get(metadataPath) ?? '{}');
      expect(metadata.status).toBe('in_progress');
    });

    test('handles validation check exception gracefully', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      state.setDeps({
        runValidationChecks: mock(async () => {
          throw new Error('Validation tooling crashed');
        }),
      });

      const result = await runCompleteTask({}, state.deps);

      expect(result.success).toBeFalse();
      if (result.success) return;

      expect(result.error).toContain('Pre-flight validation check failed');
      expect(result.error).toContain('Validation tooling crashed');
      expect(result.messages?.some((msg) => msg.includes('validation tooling issues'))).toBeTrue();
    });

    test('fails when CLAUDE.md not found', async () => {
      const state = createMockCompleteTaskDeps({});

      const result = await runCompleteTask({ skipValidation: true }, state.deps);

      expect(result.success).toBeFalse();
      if (result.success) return;

      expect(result.error).toBe('CLAUDE.md not found');
      expect(result.messages?.some((msg) => msg.includes('CLAUDE.md not found'))).toBeTrue();
    });

    test('fails when no active task found', async () => {
      const state = createMockCompleteTaskDeps({
        [claudePath]: '# CLAUDE\n@.claude/no_active_task.md\n',
      });

      state.setDeps({
        getActiveSpecDirectory: mock(() => null),
        getActiveMetadata: mock(() => null),
      });

      const result = await runCompleteTask({ skipValidation: true }, state.deps);

      expect(result.success).toBeFalse();
      if (result.success) return;

      expect(result.error).toBe('No active task found in CLAUDE.md');
      expect(result.messages?.some((msg) => msg.includes('No active task found'))).toBeTrue();
    });
  });

  describe('Option Flag Combinations', () => {
    test('--no-squash: skips squashing but completes task', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      state.setDeps({
        getCurrentBranch: mock(() => 'feature/001-example-task'),
        getDefaultBranch: mock(() => 'main'),
        execSync: mock((command: string | Buffer) => {
          const cmd = typeof command === 'string' ? command : command.toString();
          state.execCommands.push(cmd);
          if (cmd.startsWith('git status --porcelain')) return 'M src/file.ts\n'; // Has uncommitted changes
          if (cmd.startsWith('git add -A')) return '';
          if (cmd.startsWith('git commit -m')) return '';
          return '';
        }) as unknown as CompleteTaskDeps['execSync'],
      });

      const result = await runCompleteTask({ skipValidation: true, noSquash: true, noBranch: true }, state.deps);

      expect(result.success).toBeTrue();
      if (!result.success) return;

      expect(result.data?.git.squashed).toBeFalsy();
      expect(result.data?.git.notes).toContain('Squashing disabled by --no-squash flag');

      // Should still commit final changes when there are uncommitted files
      expect(result.data?.git.safetyCommit).toBeTrue();

      // Task should be marked completed
      const metadata = JSON.parse(state.files.get(metadataPath) ?? '{}');
      expect(metadata.status).toBe('completed');
    });

    test('--no-branch: skips all git workflow but completes task', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      const result = await runCompleteTask({ skipValidation: true, noBranch: true }, state.deps);

      expect(result.success).toBeTrue();
      if (!result.success) return;

      expect(result.data?.git.branchPushed).toBeFalsy();
      expect(result.data?.github).toBeUndefined();

      // Task should still be marked completed
      const metadata = JSON.parse(state.files.get(metadataPath) ?? '{}');
      expect(metadata.status).toBe('completed');
    });

    test('--skip-validation: bypasses validation checks', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      // Validation would fail, but should be skipped
      state.setDeps({
        runValidationChecks: mock(async () => ({
          success: true,
          readyForCompletion: false,
          task: { exists: true, taskId: '001', status: 'in_progress' },
          validation: {
            typescript: { passed: false, errorCount: 10, errors: 'Many errors' },
          },
          git: {
            hasUncommittedChanges: false,
            modifiedFiles: [],
            wipCommitCount: 0,
            currentBranch: 'main',
            isTaskBranch: false,
          },
          warnings: [],
        })),
      });

      const result = await runCompleteTask({ skipValidation: true, noBranch: true }, state.deps);

      expect(result.success).toBeTrue();
      if (!result.success) return;

      expect(result.data?.validation.preflightPassed).toBeTrue();
      expect(state.deps.runValidationChecks).not.toHaveBeenCalled();
    });

    test('--message: uses custom commit message', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      const execMock = mock((command: string | Buffer) => {
        const cmd = typeof command === 'string' ? command : command.toString();
        state.execCommands.push(cmd);
        if (cmd.startsWith('git status --porcelain')) return 'M src/file.ts\n';
        if (cmd.startsWith('git add -A')) return '';
        if (cmd.startsWith('git commit -m')) return '';
        if (cmd.startsWith('git rev-list --count')) return '3';
        if (cmd.startsWith('git reset --soft')) return '';
        if (cmd.startsWith('git diff --name-only')) return 'src/file.ts\n';
        return '';
      }) as unknown as CompleteTaskDeps['execSync'];

      state.setDeps({
        execSync: execMock,
        getCurrentBranch: mock(() => 'feature/001-example-task'),
        getDefaultBranch: mock(() => 'main'),
        getMergeBase: mock(() => 'abc123'),
      });

      const customMessage = 'feat: custom completion message';
      const result = await runCompleteTask(
        { skipValidation: true, message: customMessage, noBranch: true },
        state.deps,
      );

      expect(result.success).toBeTrue();
      if (!result.success) return;

      expect(result.data?.git.commitMessage).toBe(customMessage);
      expect(state.execCommands.some((cmd) => cmd.includes(customMessage))).toBeTrue();
    });
  });

  describe('Edge Cases', () => {
    test('handles existing PR without creating new one', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      const execMock = mock((command: string | Buffer) => {
        const cmd = typeof command === 'string' ? command : command.toString();
        state.execCommands.push(cmd);
        if (cmd.startsWith('gh pr list')) {
          return '[{"number":99,"url":"https://github.com/owner/repo/pull/99","state":"OPEN"}]';
        }
        if (cmd.startsWith('git status --porcelain')) return '';
        if (cmd.startsWith('git rev-parse --verify')) return 'origin/feature/001-example-task\n';
        if (cmd.startsWith('git merge-base')) return 'base123\n';
        if (cmd.startsWith('git rev-list')) return '';
        if (cmd.startsWith('git checkout main')) return '';
        if (cmd.startsWith('git pull')) return '';
        return '';
      }) as unknown as CompleteTaskDeps['execSync'];

      state.setDeps({
        execSync: execMock,
        getCurrentBranch: mock(() => 'feature/001-example-task'),
        getDefaultBranch: mock(() => 'main'),
        pushCurrentBranch: mock(() => true),
        isGitHubIntegrationEnabled: mock(() => true),
        getGitHubConfig: mock(() => ({ auto_create_prs: true })),
      });

      const result = await runCompleteTask({ skipValidation: true }, state.deps);

      expect(result.success).toBeTrue();
      if (!result.success) return;

      expect(result.data?.github?.prExists).toBeTrue();
      expect(result.data?.github?.prCreated).toBeFalsy();
      expect(result.data?.github?.prUrl).toBe('https://github.com/owner/repo/pull/99');
      expect(result.data?.git.squashed).toBeFalsy(); // No squashing when PR exists
      expect(result.data?.git.notes).toContain('Updated existing PR');
    });

    test('handles single commit (no squashing needed)', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      state.setDeps({
        getCurrentBranch: mock(() => 'feature/001-example-task'),
        getDefaultBranch: mock(() => 'main'),
        getMergeBase: mock(() => 'abc123'),
        execSync: mock((command: string | Buffer) => {
          const cmd = typeof command === 'string' ? command : command.toString();
          state.execCommands.push(cmd);
          if (cmd.startsWith('git status --porcelain')) return '';
          if (cmd.startsWith('git rev-list --count')) return '1'; // Only 1 commit
          if (cmd.startsWith('git diff --name-only')) return 'src/file.ts\n';
          return '';
        }) as unknown as CompleteTaskDeps['execSync'],
      });

      const result = await runCompleteTask({ skipValidation: true, noBranch: true }, state.deps);

      expect(result.success).toBeTrue();
      if (!result.success) return;

      expect(result.data?.git.squashed).toBeFalsy();
      expect(result.data?.git.notes).toBe('Only one commit on branch - no squashing needed');
    });

    test('handles no commits on branch', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      state.setDeps({
        getCurrentBranch: mock(() => 'feature/001-example-task'),
        getDefaultBranch: mock(() => 'main'),
        getMergeBase: mock(() => 'abc123'),
        execSync: mock((command: string | Buffer) => {
          const cmd = typeof command === 'string' ? command : command.toString();
          state.execCommands.push(cmd);
          if (cmd.startsWith('git status --porcelain')) return '';
          if (cmd.startsWith('git rev-list --count')) return '0'; // No commits
          return '';
        }) as unknown as CompleteTaskDeps['execSync'],
      });

      const result = await runCompleteTask({ skipValidation: true, noBranch: true }, state.deps);

      expect(result.success).toBeTrue();
      if (!result.success) return;

      expect(result.data?.git.notes).toBe('No commits to squash on this branch');
    });

    test('handles task with wrong status (not in_progress) with warning', async () => {
      const wrongStatusMetadata = {
        task_id: '001',
        feature_name: 'example-task',
        branch: 'feature/001-example-task',
        status: 'completed', // Already completed
        started: '2025-01-01T00:00:00.000Z',
      };

      const state = createMockCompleteTaskDeps({
        ...createInitialFiles(),
        [metadataPath]: JSON.stringify(wrongStatusMetadata),
      });
      addSpecMocks(state);

      const result = await runCompleteTask({ skipValidation: true, noBranch: true }, state.deps);

      expect(result.success).toBeTrue();
      if (!result.success) return;

      expect(result.warnings).toContain('Task status is completed, not in_progress - continuing anyway');
    });

    test('handles missing no_active_task.md gracefully', async () => {
      const filesWithoutNoActiveTask = createInitialFiles();
      delete filesWithoutNoActiveTask[noActiveTaskPath];

      const state = createMockCompleteTaskDeps(filesWithoutNoActiveTask);
      addSpecMocks(state);

      const result = await runCompleteTask({ skipValidation: true, noBranch: true }, state.deps);

      expect(result.success).toBeTrue();
      if (!result.success) return;

      expect(result.warnings).toContain('no_active_task.md not found');
    });

    test('handles diverged branches (remote has commits)', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      const execMock = mock((command: string | Buffer) => {
        const cmd = typeof command === 'string' ? command : command.toString();
        state.execCommands.push(cmd);
        if (cmd.startsWith('git rev-parse --verify')) return 'origin/feature/001-example-task\n';
        if (cmd.startsWith('git merge-base')) return 'base123\n';
        if (cmd.startsWith('git rev-list')) return 'commit1\ncommit2\ncommit3\n'; // Remote has commits
        if (cmd.startsWith('git status --porcelain')) return '';
        return '';
      }) as unknown as CompleteTaskDeps['execSync'];

      state.setDeps({
        execSync: execMock,
        getCurrentBranch: mock(() => 'feature/001-example-task'),
        getDefaultBranch: mock(() => 'main'),
        getMergeBase: mock(() => 'base123'),
      });

      const result = await runCompleteTask({ skipValidation: true, noBranch: true }, state.deps);

      expect(result.success).toBeTrue();
      if (!result.success) return;

      expect(result.data?.git.squashed).toBeFalsy();
      expect(result.data?.git.notes).toBe('Remote branch has commits - skipping squash to preserve history');
    });

    test('handles PR creation failure gracefully', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      const execMock = mock((command: string | Buffer) => {
        const cmd = typeof command === 'string' ? command : command.toString();
        state.execCommands.push(cmd);
        if (cmd.startsWith('gh pr list')) return '[]';
        if (cmd.startsWith('gh pr create')) throw new Error('PR creation failed: network error');
        if (cmd.startsWith('git status --porcelain')) return '';
        if (cmd.startsWith('git rev-parse')) throw new Error('not found');
        if (cmd.startsWith('git checkout main')) return '';
        if (cmd.startsWith('git pull')) return '';
        return '';
      }) as unknown as CompleteTaskDeps['execSync'];

      state.setDeps({
        execSync: execMock,
        getCurrentBranch: mock(() => 'feature/001-example-task'),
        getDefaultBranch: mock(() => 'main'),
        pushCurrentBranch: mock(() => true),
        isGitHubIntegrationEnabled: mock(() => true),
        getGitHubConfig: mock(() => ({ auto_create_prs: true })),
      });

      const result = await runCompleteTask({ skipValidation: true }, state.deps);

      expect(result.success).toBeTrue(); // Still succeeds, just warns
      if (!result.success) return;

      expect(result.data?.github?.prCreated).toBeFalsy();
      expect(result.warnings?.some((w) => w.includes('Failed to create PR'))).toBeTrue();
      expect(result.data?.git.notes).toContain('ready for manual PR creation');
    });
  });

  describe('Squashing Edge Cases', () => {
    test('handles squash failure gracefully', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      state.setDeps({
        getCurrentBranch: mock(() => 'feature/001-example-task'),
        getDefaultBranch: mock(() => 'main'),
        getMergeBase: mock(() => 'abc123'),
        execSync: mock((command: string | Buffer) => {
          const cmd = typeof command === 'string' ? command : command.toString();
          state.execCommands.push(cmd);
          if (cmd.startsWith('git status --porcelain')) return '';
          if (cmd.startsWith('git rev-list --count')) return '3';
          if (cmd.startsWith('git reset --soft')) throw new Error('Reset failed');
          return '';
        }) as unknown as CompleteTaskDeps['execSync'],
      });

      const result = await runCompleteTask({ skipValidation: true, noBranch: true }, state.deps);

      expect(result.success).toBeTrue();
      if (!result.success) return;

      expect(result.warnings?.some((w) => w.includes('Failed to squash commits'))).toBeTrue();
      expect(result.data?.git.notes).toBe('Squash attempted but failed');
    });

    test('handles unable to determine merge base', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      state.setDeps({
        getCurrentBranch: mock(() => 'feature/001-example-task'),
        getDefaultBranch: mock(() => 'main'),
        getMergeBase: mock(() => null), // No merge base found
      });

      const result = await runCompleteTask({ skipValidation: true, noBranch: true }, state.deps);

      expect(result.success).toBeTrue();
      if (!result.success) return;

      expect(result.data?.git.notes).toBe('Could not determine merge base with default branch');
    });

    test('handles already on default branch', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      state.setDeps({
        getCurrentBranch: mock(() => 'main'),
        getDefaultBranch: mock(() => 'main'),
        execSync: mock((command: string | Buffer) => {
          const cmd = typeof command === 'string' ? command : command.toString();
          state.execCommands.push(cmd);
          if (cmd.startsWith('git status --porcelain')) return '';
          if (cmd.startsWith('git diff --name-only')) return 'README.md\n';
          return '';
        }) as unknown as CompleteTaskDeps['execSync'],
      });

      const result = await runCompleteTask({ skipValidation: true, noBranch: true }, state.deps);

      expect(result.success).toBeTrue();
      if (!result.success) return;

      expect(result.data?.git.notes).toBe('Already on default branch - no squashing needed');
      expect(result.data?.filesChanged).toEqual(['README.md']);
    });
  });

  describe('Message Sanitization', () => {
    test('escapes single quotes in commit messages', async () => {
      const state = createMockCompleteTaskDeps(createInitialFiles());
      addSpecMocks(state);

      const execMock = mock((command: string | Buffer) => {
        const cmd = typeof command === 'string' ? command : command.toString();
        state.execCommands.push(cmd);
        if (cmd.startsWith('git status --porcelain')) return 'M src/file.ts\n';
        if (cmd.startsWith('git add -A')) return '';
        if (cmd.startsWith('git commit -m')) return '';
        if (cmd.startsWith('git rev-list --count')) return '2';
        if (cmd.startsWith('git reset --soft')) return '';
        if (cmd.startsWith('git diff --name-only')) return 'src/file.ts\n';
        return '';
      }) as unknown as CompleteTaskDeps['execSync'];

      state.setDeps({
        execSync: execMock,
        getCurrentBranch: mock(() => 'feature/001-example-task'),
        getDefaultBranch: mock(() => 'main'),
        getMergeBase: mock(() => 'abc123'),
      });

      const messageWithQuotes = "feat: add user's profile feature";
      const result = await runCompleteTask(
        { skipValidation: true, message: messageWithQuotes, noBranch: true },
        state.deps,
      );

      expect(result.success).toBeTrue();
      if (!result.success) return;

      // Should escape quotes
      const commitCommand = state.execCommands.find((cmd) => cmd.includes('git commit -m'));
      expect(commitCommand).toContain("user'\\''s"); // Escaped quote
    });
  });
});
