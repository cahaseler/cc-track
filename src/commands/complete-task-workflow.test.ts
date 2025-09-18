import { describe, expect, mock, test } from 'bun:test';
import type { ExecSyncOptions } from 'node:child_process';
import path from 'node:path';
import { createMockCompleteTaskDeps } from '../test-utils/command-mocks';
import { runCompleteTask } from './complete-task';

describe('runCompleteTask - git workflow scenarios', () => {
  const claudePath = path.join('/project', 'CLAUDE.md');
  const taskPath = path.join('/project', '.claude', 'tasks', 'TASK_001.md');
  const noActiveTaskPath = path.join('/project', '.claude', 'no_active_task.md');

  function createInitialFiles(extraTaskContent?: string): Record<string, string> {
    const branchSection = extraTaskContent ? `${extraTaskContent}\n` : '';
    const baseTask = `# Task 001: Example\n\n${branchSection}**Status:** in_progress\n\n## Current Focus\n\nDo the work\n`;
    const taskWithExtras = baseTask;
    return {
      [claudePath]: '# CLAUDE\n@.claude/tasks/TASK_001.md\n',
      [taskPath]: taskWithExtras,
      [noActiveTaskPath]: 'The following tasks are being tracked in this project:\n',
    };
  }

  test('reverts changes if push fails during PR workflow', async () => {
    const taskContentExtra = '<!-- branch: feature/TASK_001 -->\n<!-- github_issue: 42 -->\n';
    const state = createMockCompleteTaskDeps(createInitialFiles(taskContentExtra));

    state.setDeps({
      isGitHubIntegrationEnabled: mock(() => true),
      getGitHubConfig: mock(() => ({ auto_create_prs: true })),
      getCurrentBranch: mock(() => 'feature/TASK_001'),
      pushCurrentBranch: mock(() => false),
      execSync: mock((command: string | Buffer, _options?: ExecSyncOptions) => {
        const cmd = typeof command === 'string' ? command : command.toString();
        state.execCommands.push(cmd);
        if (cmd.startsWith('git status --porcelain')) return '';
        if (cmd.startsWith('gh pr list')) return '[]';
        if (cmd.startsWith('git rev-parse')) {
          throw new Error('not found');
        }
        if (cmd.startsWith('git diff --name-only')) return 'src/index.ts\n';
        if (cmd.startsWith('git rev-list --count')) return '2';
        return '';
      }) as unknown as CompleteTaskDeps['execSync'],
    });

    const result = await runCompleteTask({ skipValidation: true }, state.deps);

    expect(result.success).toBeFalse();
    if (result.success) return;
    expect(result.data?.git.reverted).toBeTrue();
    expect(state.files.get(taskPath)).toContain('**Status:** in_progress');
    expect(state.files.get(claudePath)).toContain('@.claude/tasks/TASK_001.md');
  });

  test('skips squashing when remote branch already has commits', async () => {
    const taskContentExtra = '<!-- branch: feature/TASK_001 -->\n';
    const state = createMockCompleteTaskDeps(createInitialFiles(taskContentExtra));

    const execMock = mock((command: string | Buffer) => {
      const cmd = typeof command === 'string' ? command : command.toString();
      state.execCommands.push(cmd);
      if (cmd.startsWith('git rev-parse --verify')) {
        return 'origin/feature/TASK_001\n';
      }
      if (cmd.startsWith('git merge-base')) {
        return 'base123\n';
      }
      if (cmd.startsWith('git rev-list')) {
        return 'sha1\nsha2\n';
      }
      if (cmd.startsWith('git status --porcelain')) {
        return '';
      }
      return '';
    }) as unknown as CompleteTaskDeps['execSync'];

    state.setDeps({
      execSync: execMock,
      getCurrentBranch: mock(() => 'feature/TASK_001'),
      getDefaultBranch: mock(() => 'main'),
      getMergeBase: mock(() => 'base123'),
      getGitHubConfig: mock(() => ({ auto_create_prs: false })),
      isGitHubIntegrationEnabled: mock(() => false),
    });

    const result = await runCompleteTask({ skipValidation: true, noBranch: true }, state.deps);

    expect(result.success).toBeTrue();
    if (!result.success) return;
    expect(result.data?.git.squashed).toBeFalsy();
    expect(result.data?.git.notes).toBe('Remote branch has commits - skipping squash to preserve history');
    expect(state.execCommands.some((cmd) => cmd.includes('git rev-list base123..origin/feature/TASK_001'))).toBeTrue();
  });

  test('skips push when not on task branch', async () => {
    const taskContentExtra = '<!-- branch: feature/TASK_001 -->\n<!-- github_issue: 42 -->\n';
    const state = createMockCompleteTaskDeps(createInitialFiles(taskContentExtra));

    state.setDeps({
      isGitHubIntegrationEnabled: mock(() => true),
      getGitHubConfig: mock(() => ({ auto_create_prs: true })),
      getCurrentBranch: mock(() => 'main'), // We're on main, not feature/TASK_001
      getDefaultBranch: mock(() => 'main'),
      pushCurrentBranch: mock(() => true),
    });

    const result = await runCompleteTask({ skipValidation: true }, state.deps);

    expect(result.success).toBeTrue();
    if (!result.success) return;
    // Should NOT have called pushCurrentBranch since we're on wrong branch
    expect(state.deps.pushCurrentBranch).not.toHaveBeenCalled();
    expect(result.warnings?.some((w) => w.includes('Not on task branch'))).toBeTrue();
    expect(result.data?.git.notes).toContain('not currently checked out');
  });

  test('updates metadata when existing PR is detected', async () => {
    const taskContentExtra = '<!-- branch: feature/TASK_001 -->\n<!-- github_issue: 42 -->\n';
    const state = createMockCompleteTaskDeps(createInitialFiles(taskContentExtra));

    const execMock = mock((command: string | Buffer) => {
      const cmd = typeof command === 'string' ? command : command.toString();
      state.execCommands.push(cmd);
      if (cmd.startsWith('gh pr list')) {
        return '[{"number":42,"url":"https://example.com/pr/42","state":"OPEN"}]';
      }
      if (cmd.startsWith('git status --porcelain')) {
        return '';
      }
      if (cmd.startsWith('git rev-parse --verify')) {
        return 'origin/feature/TASK_001\n';
      }
      if (cmd.startsWith('git merge-base')) {
        return 'base123\n';
      }
      if (cmd.startsWith('git rev-list')) {
        return '';
      }
      return '';
    }) as unknown as CompleteTaskDeps['execSync'];

    const pushMock = mock(() => true);

    state.setDeps({
      execSync: execMock,
      getCurrentBranch: mock(() => 'feature/TASK_001'),
      getDefaultBranch: mock(() => 'main'),
      pushCurrentBranch: pushMock,
      isGitHubIntegrationEnabled: mock(() => true),
      getGitHubConfig: mock(() => ({ auto_create_prs: true })),
    });

    const result = await runCompleteTask({ skipValidation: true }, state.deps);

    expect(result.success).toBeTrue();
    if (!result.success) return;
    expect(result.data?.github?.prExists).toBeTrue();
    expect(result.data?.github?.prUrl).toBe('https://example.com/pr/42');
    expect(result.data?.git.branchSwitched).toBeTrue();
    expect(result.messages?.some((line) => line.includes('Pull Request Updated'))).toBeTrue();
  });
});
