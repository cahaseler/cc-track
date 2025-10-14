import { describe, expect, mock, test } from 'bun:test';
import type { ExecSyncOptions } from 'node:child_process';
import path from 'node:path';
import { createMockCompleteTaskDeps } from '../test-utils/command-mocks';
import { runCompleteTask } from './complete-task';

describe('runCompleteTask - git workflow scenarios', () => {
  const claudePath = path.join('/project', 'CLAUDE.md');
  const specDir = path.join('/project', '.claude', 'specs', '001-example-task');
  const specPath = path.join(specDir, 'spec.md');
  const metadataPath = path.join(specDir, '.metadata.json');
  const noActiveTaskPath = path.join('/project', '.claude', 'no_active_task.md');

  function createInitialFiles(metadata?: Partial<Record<string, unknown>>): Record<string, string> {
    const defaultMetadata = {
      task_id: '001',
      feature_name: 'example-task',
      branch: 'feature/TASK_001',
      status: 'in_progress',
      started: '2025-01-01T00:00:00.000Z',
      ...metadata,
    };

    return {
      [claudePath]: '# CLAUDE\n@.claude/specs/001-example-task/spec.md\n',
      [specPath]: '# Task 001: Example\n\nTask description...\n',
      [metadataPath]: JSON.stringify(defaultMetadata),
      [noActiveTaskPath]: 'The following tasks are being tracked in this project:\n',
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

  test('reverts changes if push fails during PR workflow', async () => {
    const state = createMockCompleteTaskDeps(
      createInitialFiles({ github: { issue: 42, url: 'https://example.com/issues/42' } }),
    );
    addSpecMocks(state);

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
    // The key assertion is that the result indicates revert happened
    // In a real scenario, git would revert the metadata changes, but in tests with mocks
    // we just verify that the revert flag is set, indicating the error was handled correctly
    expect(state.files.get(claudePath)).toContain('@.claude/specs/001-example-task/spec.md');
  });

  test('skips squashing when remote branch already has commits', async () => {
    const state = createMockCompleteTaskDeps(createInitialFiles());
    addSpecMocks(state);

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

  test('pushes current branch regardless of task file branch', async () => {
    const state = createMockCompleteTaskDeps(
      createInitialFiles({ github: { issue: 42, url: 'https://example.com/issues/42' } }),
    );
    addSpecMocks(state);

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
    expect(state.deps.pushCurrentBranch).toHaveBeenCalled();
  });

  test('updates metadata when existing PR is detected', async () => {
    const state = createMockCompleteTaskDeps(
      createInitialFiles({ github: { issue: 42, url: 'https://example.com/issues/42' } }),
    );
    addSpecMocks(state);

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
