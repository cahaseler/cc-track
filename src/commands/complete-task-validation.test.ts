import { describe, expect, mock, test } from 'bun:test';
import path from 'node:path';
import { createMockCompleteTaskDeps } from '../test-utils/command-mocks';
import { runCompleteTask } from './complete-task';

describe('runCompleteTask - validation scenarios', () => {
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

  test('fails when validation reports issues', async () => {
    const state = createMockCompleteTaskDeps(createInitialFiles());
    state.setDeps({
      runValidationChecks: mock(async () => ({
        success: true,
        readyForCompletion: false,
        task: { exists: true, taskId: 'TASK_001', status: 'in_progress' },
        validation: {
          typescript: { passed: false, errorCount: 2, errors: 'TS errors' },
          lint: { passed: false, issueCount: 1, errors: 'Lint issue' },
          tests: { passed: false, failCount: 1, errors: 'Test failure' },
          knip: { passed: false, unusedFiles: 1, unusedExports: 0, unusedDeps: 0 },
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

    const result = await runCompleteTask({}, state.deps);

    expect(result.success).toBeFalse();
    if (result.success) return;
    expect(result.error).toContain('Pre-flight validation failed');
    expect(result.data?.validation.typescript).toBe('2 errors');
    expect(state.files.get(taskPath)).toContain('**Status:** in_progress');
  });

  test('completes task without branching when validation passes', async () => {
    const state = createMockCompleteTaskDeps(createInitialFiles());

    const options = { skipValidation: true, noSquash: true, noBranch: true };
    const result = await runCompleteTask(options, state.deps);

    expect(result.success).toBeTrue();
    if (!result.success) return;
    expect(result.data?.updates.taskFile).toBe('updated');
    const taskContent = state.files.get(taskPath) ?? '';
    expect(taskContent).toContain('**Status:** completed');
    expect(taskContent).toContain('Task completed on 2025-01-01');
    expect(state.claudeCleared()).toBeTrue();
    const noActiveContent = state.files.get(noActiveTaskPath) ?? '';
    expect(noActiveContent).toContain('- TASK_001: Task 001: Example');
  });
});
