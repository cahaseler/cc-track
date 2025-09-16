import { describe, expect, mock, test } from 'bun:test';
import type { ExecSyncOptions } from 'node:child_process';
import path from 'node:path';
import type { createLogger } from '../lib/logger';
import {
  type CompleteTaskDeps,
  type CompleteTaskOptions,
  completeTaskCommand,
  createCompleteTaskCommand,
  runCompleteTask,
} from './complete-task';

function createMockLogger(): ReturnType<typeof createLogger> {
  return {
    debug: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    exception: mock(() => {}),
  } as unknown as ReturnType<typeof createLogger>;
}

interface MockState {
  readonly deps: CompleteTaskDeps;
  files: Map<string, string>;
  execCommands: string[];
  claudeCleared: () => boolean;
  setDeps: (overrides: Partial<CompleteTaskDeps>) => void;
}

function createMockDeps(initialFiles?: Record<string, string>): MockState {
  const files = new Map<string, string>(Object.entries(initialFiles ?? {}));
  const execCommands: string[] = [];
  let claudeCleared = false;

  const baseDeps: CompleteTaskDeps = {
    cwd: () => '/project',
    fs: {
      existsSync: (targetPath: string) => files.has(targetPath),
      readFileSync: (targetPath: string) => {
        const content = files.get(targetPath);
        if (content === undefined) {
          throw new Error(`File not found: ${targetPath}`);
        }
        return content;
      },
      writeFileSync: (targetPath: string, value: string | NodeJS.ArrayBufferView) => {
        files.set(targetPath, value.toString());
      },
    },
    path,
    execSync: mock((command: string | Buffer, _options?: ExecSyncOptions) => {
      const cmd = typeof command === 'string' ? command : command.toString();
      execCommands.push(cmd);
      if (cmd.startsWith('git status --porcelain')) {
        return '';
      }
      if (cmd.startsWith('git diff --name-only')) {
        return 'src/index.ts\n';
      }
      if (cmd.startsWith('git rev-list --count')) {
        return '2';
      }
      if (cmd.startsWith('git rev-parse')) {
        throw new Error('not found');
      }
      return '';
    }) as unknown as CompleteTaskDeps['execSync'],
    getActiveTaskId: mock(() => 'TASK_001'),
    clearActiveTask: mock(() => {
      claudeCleared = true;
      files.set(path.join('/project', 'CLAUDE.md'), '# CLAUDE\n');
    }),
    getConfig: mock(() => ({ features: {} })),
    getGitHubConfig: mock(() => ({ auto_create_prs: false })),
    isGitHubIntegrationEnabled: mock(() => false),
    getCurrentBranch: mock(() => 'main'),
    getDefaultBranch: mock(() => 'main'),
    getMergeBase: mock(() => 'abc123'),
    pushCurrentBranch: mock(() => true),
    runValidationChecks: mock(async () => ({
      success: true,
      readyForCompletion: true,
      task: { exists: true, taskId: 'TASK_001', status: 'in_progress' },
      validation: {},
      git: {
        hasUncommittedChanges: false,
        modifiedFiles: [],
        wipCommitCount: 0,
        currentBranch: 'main',
        isTaskBranch: false,
      },
      warnings: [],
    })),
    todayISO: () => '2025-01-01',
    logger: createMockLogger(),
  } satisfies CompleteTaskDeps;

  let deps = baseDeps;

  return {
    get deps() {
      return deps;
    },
    setDeps(overrides: Partial<CompleteTaskDeps>) {
      deps = { ...deps, ...overrides } as CompleteTaskDeps;
    },
    files,
    execCommands,
    claudeCleared: () => claudeCleared,
  } as unknown as MockState;
}

describe('complete-task command wiring', () => {
  test('has correct name and description', () => {
    expect(completeTaskCommand.name()).toBe('complete-task');
    expect(completeTaskCommand.description()).toBe('Mark the active task as completed');
  });

  test('has expected options', () => {
    const options = completeTaskCommand.options;
    const optionNames = options.map((opt) => opt.long);

    expect(optionNames).toContain('--no-squash');
    expect(optionNames).toContain('--no-branch');
    expect(optionNames).toContain('--skip-validation');
    expect(optionNames).toContain('--message');
  });

  test('factory creates command with action handler', () => {
    const command = createCompleteTaskCommand();
    const handler = (command as unknown as { _actionHandler?: unknown })._actionHandler;
    expect(typeof handler).toBe('function');
  });

  test('command handler sets exit code on failure', async () => {
    const messages: string[] = [];
    const errors: string[] = [];
    let exitCode: number | undefined;

    const command = createCompleteTaskCommand({
      console: {
        log: (...args: unknown[]) => {
          messages.push(args.join(' '));
        },
        error: (...args: unknown[]) => {
          errors.push(args.join(' '));
        },
        warn: () => {},
      },
      process: {
        cwd: () => '/project',
        env: {},
        getExitCode: () => exitCode,
        setExitCode: (code: number) => {
          exitCode = code;
        },
      },
      fs: {
        existsSync: () => false,
        readFileSync: () => '',
        writeFileSync: () => {},
        appendFileSync: () => {},
        mkdirSync: () => {},
        readdirSync: () => [],
        unlinkSync: () => {},
        copyFileSync: () => {},
      },
      logger: () => createMockLogger(),
    });

    command.exitOverride();
    await command.parseAsync(['node', 'test', '--skip-validation'], { from: 'node' });

    expect(exitCode).toBe(1);
    const combined = [...messages, ...errors];
    expect(combined.some((line) => line.includes('Task Completion Failed'))).toBeTrue();
    expect(combined.join(' ')).toContain('CLAUDE.md not found');
  });
});

describe('runCompleteTask', () => {
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
    const state = createMockDeps(createInitialFiles());
    state.setDeps({
      runValidationChecks: mock(async () => ({
        success: true,
        readyForCompletion: false,
        task: { exists: true, taskId: 'TASK_001', status: 'in_progress' },
        validation: {
          typescript: { passed: false, errorCount: 2, errors: 'TS errors' },
          biome: { passed: false, issueCount: 1, errors: 'Biome issue' },
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

  test('completes task without branching', async () => {
    const state = createMockDeps(createInitialFiles());

    const options: CompleteTaskOptions = { skipValidation: true, noSquash: true, noBranch: true };
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

  test('reverts changes if push fails during PR workflow', async () => {
    const taskContentExtra = '<!-- branch: feature/TASK_001 -->\n<!-- github_issue: 42 -->\n';
    const state = createMockDeps(createInitialFiles(taskContentExtra));

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
    const state = createMockDeps(createInitialFiles(taskContentExtra));

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

  test('updates metadata when existing PR is detected', async () => {
    const taskContentExtra = '<!-- branch: feature/TASK_001 -->\n<!-- github_issue: 42 -->\n';
    const state = createMockDeps(createInitialFiles(taskContentExtra));

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
