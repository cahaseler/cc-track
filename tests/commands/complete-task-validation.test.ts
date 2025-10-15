import { describe, expect, mock, test } from 'bun:test';
import path from 'node:path';
import { runCompleteTask } from '../../commands/scripts/complete-task';
import { createMockCompleteTaskDeps } from '../../test-utils/command-mocks';

describe('runCompleteTask - validation scenarios', () => {
  const claudePath = path.join('/project', 'CLAUDE.md');
  const specDir = path.join('/project', '.claude', 'specs', '001-example-task');
  const specPath = path.join(specDir, 'spec.md');
  const metadataPath = path.join(specDir, '.metadata.json');
  const noActiveTaskPath = path.join('/project', '.claude', 'no_active_task.md');

  function createInitialFiles(): Record<string, string> {
    return {
      [claudePath]: '# CLAUDE\n@.claude/specs/001-example-task/spec.md\n',
      [specPath]: '# Task 001: Example\n\nTask description...\n',
      [metadataPath]: JSON.stringify({
        task_id: '001',
        feature_name: 'example-task',
        branch: '001-example-task',
        status: 'in_progress',
        started: '2025-01-01T00:00:00.000Z',
      }),
      [noActiveTaskPath]: 'The following tasks are being tracked in this project:\n',
    };
  }

  test('fails when validation reports issues', async () => {
    const state = createMockCompleteTaskDeps(createInitialFiles());
    state.setDeps({
      runValidationChecks: mock(async () => ({
        success: true,
        readyForCompletion: false,
        task: { exists: true, taskId: '001', status: 'in_progress' },
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
    const metadata = JSON.parse(state.files.get(metadataPath) ?? '{}');
    expect(metadata.status).toBe('in_progress');
  });

  test('completes task without branching when validation passes', async () => {
    const state = createMockCompleteTaskDeps(createInitialFiles());

    // Override spec-related mocks to support new structure
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

    const options = { skipValidation: true, noSquash: true, noBranch: true };
    const result = await runCompleteTask(options, state.deps);

    if (!result.success) {
      console.error('Test failed with error:', result.error);
      console.error('Messages:', result.messages);
    }
    expect(result.success).toBeTrue();
    if (!result.success) return;
    expect(result.data?.updates.taskFile).toBe('metadata updated');
    const metadata = JSON.parse(state.files.get(metadataPath) ?? '{}');
    expect(metadata.status).toBe('completed');
    expect(metadata.completed).toBe('2025-01-01');
  });
});
