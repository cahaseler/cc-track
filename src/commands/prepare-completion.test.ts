import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { createLogger } from '../lib/logger';
import {
  createPrepareCompletionCommand,
  type PrepareCompletionDeps,
  prepareCompletionAction,
  runCodeReview,
} from './prepare-completion';

// Create mock logger
function createMockLogger(): ReturnType<typeof createLogger> {
  return {
    debug: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    exception: mock(() => {}),
  } as unknown as ReturnType<typeof createLogger>;
}

// Create mock for performCodeReview
function createMockPerformCodeReview(success = true) {
  if (success) {
    return mock(async () => ({
      success: true,
      review: '# Code Review\n\nReview content here',
    }));
  }
  return mock(async () => ({
    success: false,
    review: '',
    error: 'Review failed',
  }));
}

describe('prepare-completion command', () => {
  test('has correct name and description', () => {
    const command = createPrepareCompletionCommand();
    expect(command.name()).toBe('prepare-completion');
    expect(command.description()).toBe(
      'Prepare task for completion by running validation and generating fix instructions',
    );
  });

  test('has no options', () => {
    const command = createPrepareCompletionCommand();
    const options = command.options;
    expect(options).toHaveLength(0);
  });
});

describe('runCodeReview', () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  test('skips review when validation failed', async () => {
    const mockConsole = {
      log: mock(() => {}),
    };

    const deps: PrepareCompletionDeps = {
      console: mockConsole as any,
      isCodeReviewEnabled: mock(() => true),
    };

    await runCodeReview('/project', false, deps);

    // Should not log anything when validation failed
    expect(mockConsole.log).not.toHaveBeenCalled();
  });

  test('skips review when feature is disabled', async () => {
    const mockConsole = {
      log: mock(() => {}),
    };

    const deps: PrepareCompletionDeps = {
      console: mockConsole as any,
      isCodeReviewEnabled: mock(() => false),
    };

    await runCodeReview('/project', true, deps);

    // Should not log anything when feature is disabled
    expect(mockConsole.log).not.toHaveBeenCalled();
  });

  test('handles missing active task', async () => {
    const mockConsole = {
      log: mock(() => {}),
    };

    const deps: PrepareCompletionDeps = {
      console: mockConsole as any,
      isCodeReviewEnabled: mock(() => true),
      getActiveTaskId: mock(() => null),
    };

    await runCodeReview('/project', true, deps);

    expect(mockConsole.log).toHaveBeenCalledWith('### 🔍 Code Review\n');
    expect(mockConsole.log).toHaveBeenCalledWith('⚠️ Could not run code review: No active task found\n');
  });

  test('skips review when review already exists', async () => {
    const mockConsole = {
      log: mock(() => {}),
    };

    const mockFileOps = {
      existsSync: mock(() => true),
      readdirSync: mock(() => ['TASK_001_2025-01-01_1200-UTC.md']),
      readFileSync: mock(() => 'task content'),
      mkdirSync: mock(() => {}),
    };

    const deps: PrepareCompletionDeps = {
      console: mockConsole as any,
      isCodeReviewEnabled: mock(() => true),
      getActiveTaskId: mock(() => 'TASK_001'),
      fileOps: mockFileOps as any,
    };

    await runCodeReview('/project', true, deps);

    expect(mockConsole.log).toHaveBeenCalledWith('### 🔍 Code Review\n');
    expect(mockConsole.log).toHaveBeenCalledWith(
      '✅ Code review already exists: code-reviews/TASK_001_2025-01-01_1200-UTC.md',
    );
    expect(mockConsole.log).toHaveBeenCalledWith('Skipping code review generation (only one review per task).\n');
  });

  test('performs code review successfully', async () => {
    const mockConsole = {
      log: mock(() => {}),
    };

    const mockFileOps = {
      existsSync: mock((path: string) => {
        // code-reviews dir doesn't exist initially
        return !path.includes('code-reviews');
      }),
      readdirSync: mock(() => ['TASK_001_2025-01-01_1200-UTC.md']),
      readFileSync: mock((path: string) => {
        if (path.includes('TASK_001.md')) {
          return '# Task Title\n\n## Requirements\n\nTest requirements';
        }
        if (path.includes('TASK_001_2025-01-01_1200-UTC.md')) {
          return '# Code Review\n\nReview content here';
        }
        return '';
      }),
      mkdirSync: mock(() => {}),
    };

    const mockPerformCodeReview = mock(async () => ({
      success: true,
      review: '# Code Review\n\nReview content here',
    }));

    const mockLogger = createMockLogger();

    const deps: PrepareCompletionDeps = {
      console: mockConsole as any,
      isCodeReviewEnabled: mock(() => true),
      getCodeReviewTool: mock(() => 'claude'),
      getActiveTaskId: mock(() => 'TASK_001'),
      fileOps: mockFileOps as any,
      performCodeReview: mockPerformCodeReview,
      logger: mockLogger,
      execSync: mock(() => 'git diff content'),
      getCurrentBranch: mock(() => 'feature/test'),
      getDefaultBranch: mock(() => 'main'),
      getMergeBase: mock(() => 'abc123'),
    };

    await runCodeReview('/project', true, deps);

    expect(mockConsole.log).toHaveBeenCalledWith('### 🔍 Code Review\n');
    expect(mockConsole.log).toHaveBeenCalledWith('Running comprehensive code review with Claude SDK...');
    expect(mockPerformCodeReview).toHaveBeenCalledWith({
      taskId: 'TASK_001',
      taskTitle: 'Task Title',
      taskRequirements: '# Task Title\n\n## Requirements\n\nTest requirements',
      gitDiff: 'git diff content',
      projectRoot: '/project',
      mergeBase: 'abc123',
    });
    expect(mockConsole.log).toHaveBeenCalledWith(
      '✅ Code review completed: code-reviews/TASK_001_2025-01-01_1200-UTC.md\n',
    );
    expect(mockConsole.log).toHaveBeenCalledWith('### 📄 Code Review Results\n');
    expect(mockConsole.log).toHaveBeenCalledWith('```markdown');
    expect(mockConsole.log).toHaveBeenCalledWith('# Code Review\n\nReview content here');
    expect(mockConsole.log).toHaveBeenCalledWith('```\n');
  });

  test('handles code review failure gracefully', async () => {
    const mockConsole = {
      log: mock(() => {}),
    };

    const mockFileOps = {
      existsSync: mock(() => false),
      readdirSync: mock(() => []),
      readFileSync: mock(() => '# Task Title\n\n## Requirements\n\nTest requirements'),
      mkdirSync: mock(() => {}),
    };

    const mockPerformCodeReview = mock(async () => ({
      success: false,
      review: '',
      error: 'API timeout',
    }));

    const mockLogger = createMockLogger();

    const deps: PrepareCompletionDeps = {
      console: mockConsole as any,
      isCodeReviewEnabled: mock(() => true),
      getCodeReviewTool: mock(() => 'claude'),
      getActiveTaskId: mock(() => 'TASK_001'),
      fileOps: mockFileOps as any,
      performCodeReview: mockPerformCodeReview,
      logger: mockLogger,
      execSync: mock(() => 'git diff content'),
      getCurrentBranch: mock(() => 'main'),
      getDefaultBranch: mock(() => 'main'),
    };

    await runCodeReview('/project', true, deps);

    expect(mockConsole.log).toHaveBeenCalledWith('⚠️ Code review failed: API timeout');
    expect(mockConsole.log).toHaveBeenCalledWith('You can proceed without the code review.\n');
  });

  test('handles exception during code review', async () => {
    const mockConsole = {
      log: mock(() => {}),
    };

    const mockFileOps = {
      existsSync: mock(() => false),
      readdirSync: mock(() => []),
      readFileSync: mock(() => {
        throw new Error('File not found');
      }),
      mkdirSync: mock(() => {}),
    };

    const mockLogger = createMockLogger();

    const deps: PrepareCompletionDeps = {
      console: mockConsole as any,
      isCodeReviewEnabled: mock(() => true),
      getActiveTaskId: mock(() => 'TASK_001'),
      fileOps: mockFileOps as any,
      logger: mockLogger,
    };

    await runCodeReview('/project', true, deps);

    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockConsole.log).toHaveBeenCalledWith('⚠️ Code review error: File not found');
    expect(mockConsole.log).toHaveBeenCalledWith('You can proceed without the code review.\n');
  });
});

describe('prepareCompletionAction', () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  test('handles validation failure', async () => {
    const mockConsole = {
      log: mock(() => {}),
    };

    const mockProcess = {
      cwd: mock(() => '/project'),
      exit: mock(() => {}),
    };

    const mockRunValidation = mock(async () => ({
      success: false,
      readyForCompletion: false,
      task: { exists: false },
      validation: {},
      git: {
        hasUncommittedChanges: false,
        modifiedFiles: [],
        wipCommitCount: 0,
        currentBranch: 'main',
        isTaskBranch: false,
      },
      warnings: [],
      error: 'Validation failed',
    }));

    const deps: PrepareCompletionDeps = {
      console: mockConsole as any,
      process: mockProcess as any,
      runValidationChecks: mockRunValidation,
    };

    await prepareCompletionAction(deps);

    expect(mockConsole.log).toHaveBeenCalledWith('## ❌ Validation Check Failed\n');
    expect(mockConsole.log).toHaveBeenCalledWith('Error running validation checks: Validation failed\n');
    expect(mockProcess.exit).toHaveBeenCalledWith(0);
  });

  test('shows validation issues when found', async () => {
    const mockConsole = {
      log: mock(() => {}),
    };

    const mockProcess = {
      cwd: mock(() => '/project'),
      exit: mock(() => {}),
    };

    const mockRunValidation = mock(async () => ({
      success: true,
      readyForCompletion: false,
      task: { exists: true, taskId: 'TASK_001', status: 'in_progress' },
      validation: {
        typescript: { passed: false, errorCount: 5, errors: 'TypeScript errors here' },
        biome: { passed: false, issueCount: 3, errors: 'Linting issues here' },
      },
      git: {
        hasUncommittedChanges: false,
        modifiedFiles: [],
        wipCommitCount: 0,
        currentBranch: 'main',
        isTaskBranch: false,
      },
      warnings: [],
    }));

    const deps: PrepareCompletionDeps = {
      console: mockConsole as any,
      process: mockProcess as any,
      runValidationChecks: mockRunValidation,
      getConfig: mock(() => ({ features: {} })),
    };

    await prepareCompletionAction(deps);

    expect(mockConsole.log).toHaveBeenCalledWith('### ⚠️ Validation Issues Found\n');
    expect(mockConsole.log).toHaveBeenCalledWith('#### TypeScript Errors');
    expect(mockConsole.log).toHaveBeenCalledWith('Found 5 TypeScript errors.\n');
    expect(mockConsole.log).toHaveBeenCalledWith('#### Linting Issues');
    expect(mockConsole.log).toHaveBeenCalledWith('Found 3 Biome issues.\n');
    expect(mockProcess.exit).toHaveBeenCalledWith(0);
  });

  test('shows success when validation passes', async () => {
    const mockConsole = {
      log: mock(() => {}),
    };

    const mockProcess = {
      cwd: mock(() => '/project'),
      exit: mock(() => {}),
    };

    const mockRunValidation = mock(async () => ({
      success: true,
      readyForCompletion: true,
      task: { exists: true, taskId: 'TASK_001', status: 'in_progress' },
      validation: {
        typescript: { passed: true },
        biome: { passed: true },
      },
      git: {
        hasUncommittedChanges: false,
        modifiedFiles: [],
        wipCommitCount: 0,
        currentBranch: 'main',
        isTaskBranch: false,
      },
      warnings: [],
    }));

    // Mock the runCodeReview dependency too
    const mockPerformCodeReview = createMockPerformCodeReview(true);

    const deps: PrepareCompletionDeps = {
      console: mockConsole as any,
      process: mockProcess as any,
      runValidationChecks: mockRunValidation,
      getConfig: mock(() => ({ features: { code_review: { enabled: false } } })),
      isCodeReviewEnabled: mock(() => false),
      performCodeReview: mockPerformCodeReview,
    };

    await prepareCompletionAction(deps);

    expect(mockConsole.log).toHaveBeenCalledWith('### ✅ Validation Passed\n');
    expect(mockConsole.log).toHaveBeenCalledWith('All validation checks have passed successfully!\n');
    expect(mockConsole.log).toHaveBeenCalledWith('### Documentation Updates\n');
    expect(mockConsole.log).toHaveBeenCalledWith('**✅ Task is ready for completion!**\n');
    expect(mockProcess.exit).toHaveBeenCalledWith(0);
  });
});
