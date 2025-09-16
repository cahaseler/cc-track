import { describe, expect, mock, test } from 'bun:test';
import type { createLogger } from '../lib/logger';
import {
  createPrepareCompletionCommand,
  type PrepareCompletionDeps,
  prepareCompletionAction,
  runCodeReview,
} from './prepare-completion';

function createMockLogger(): ReturnType<typeof createLogger> {
  return {
    debug: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    exception: mock(() => {}),
  } as unknown as ReturnType<typeof createLogger>;
}

describe('prepare-completion command', () => {
  test('has correct name and description', () => {
    const command = createPrepareCompletionCommand();
    expect(command.name()).toBe('prepare-completion');
    expect(command.description()).toBe(
      'Prepare task for completion by running validation and generating fix instructions',
    );
    const handler = (command as unknown as { _actionHandler?: unknown })._actionHandler;
    expect(typeof handler).toBe('function');
  });
});

describe('runCodeReview', () => {
  test('returns empty result when validation has not passed', async () => {
    const result = await runCodeReview('/project', false, {
      isCodeReviewEnabled: mock(() => true),
    });
    expect(result.success).toBeTrue();
    expect(result.messages).toHaveLength(0);
  });

  test('returns empty result when feature disabled', async () => {
    const result = await runCodeReview('/project', true, {
      isCodeReviewEnabled: mock(() => false),
    });
    expect(result.messages).toHaveLength(0);
  });

  test('reports missing active task', async () => {
    const result = await runCodeReview('/project', true, {
      isCodeReviewEnabled: mock(() => true),
      getActiveTaskId: mock(() => null),
    });
    expect(result.messages?.[0]).toContain('### 🔍 Code Review');
    expect(result.messages?.some((msg) => msg.includes('No active task found'))).toBeTrue();
  });

  test('skips when review already exists', async () => {
    const deps: PrepareCompletionDeps = {
      isCodeReviewEnabled: mock(() => true),
      getActiveTaskId: mock(() => 'TASK_001'),
      fileOps: {
        existsSync: mock(() => true),
        readdirSync: mock(() => ['TASK_001_2025-01-01_1200-UTC.md']),
        readFileSync: mock(() => '# Task'),
        mkdirSync: mock(() => {}),
      },
    };
    const result = await runCodeReview('/project', true, deps);
    expect(result.messages?.some((msg) => msg.includes('code-reviews/TASK_001_2025-01-01_1200-UTC.md'))).toBeTrue();
  });

  test('performs review and returns messages', async () => {
    const fileOps = {
      existsSync: mock((path: string) => !path.includes('code-reviews')),
      readdirSync: mock(() => ['TASK_001_2025-01-01_1200-UTC.md']),
      readFileSync: mock((path: string) => {
        if (path.includes('TASK_001.md')) {
          return '# Task Title\n\n## Requirements\nRequirements info';
        }
        return '# Code Review\n\nReview content here';
      }),
      mkdirSync: mock(() => {}),
    };

    const performCodeReview = mock(async () => ({
      success: true,
      review: '# Code Review\n\nReview content here',
    }));

    const logger = createMockLogger();

    const result = await runCodeReview('/project', true, {
      isCodeReviewEnabled: mock(() => true),
      getCodeReviewTool: mock(() => 'claude'),
      getActiveTaskId: mock(() => 'TASK_001'),
      fileOps,
      performCodeReview: performCodeReview as any,
      logger,
      execSync: mock(() => 'git diff content'),
      getCurrentBranch: mock(() => 'feature/test'),
      getDefaultBranch: mock(() => 'main'),
      getMergeBase: mock(() => 'abc123'),
    });

    expect(result.success).toBeTrue();
    expect(result.messages?.some((msg) => msg.includes('Code review completed'))).toBeTrue();
    expect(result.data?.reviewGenerated).toBeTrue();
    expect(result.data?.reviewFile).toContain('code-reviews/TASK_001_2025-01-01_1200-UTC.md');
    expect(performCodeReview).toHaveBeenCalled();
  });

  test('includes warning when review fails', async () => {
    const result = await runCodeReview('/project', true, {
      isCodeReviewEnabled: mock(() => true),
      getCodeReviewTool: mock(() => 'claude'),
      getActiveTaskId: mock(() => 'TASK_001'),
      fileOps: {
        existsSync: mock(() => false),
        readdirSync: mock(() => []),
        readFileSync: mock(() => '# Task'),
        mkdirSync: mock(() => {}),
      },
      performCodeReview: mock(async () => ({ success: false, error: 'API timeout' })) as any,
      execSync: mock(() => ''),
      getCurrentBranch: mock(() => 'main'),
      getDefaultBranch: mock(() => 'main'),
      logger: createMockLogger(),
    });
    expect(result.warnings?.some((msg) => msg.includes('API timeout'))).toBeTrue();
  });

  test('handles exception during review', async () => {
    const result = await runCodeReview('/project', true, {
      isCodeReviewEnabled: mock(() => true),
      getActiveTaskId: mock(() => 'TASK_001'),
      fileOps: {
        existsSync: mock(() => false),
        readdirSync: mock(() => []),
        readFileSync: mock(() => {
          throw new Error('File not found');
        }),
        mkdirSync: mock(() => {}),
      },
      logger: createMockLogger(),
    });
    expect(result.warnings?.some((msg) => msg.includes('Code review error'))).toBeTrue();
  });
});

describe('prepareCompletionAction', () => {
  function createBaseDeps(overrides: Partial<PrepareCompletionDeps> = {}): PrepareCompletionDeps {
    return {
      runValidationChecks: mock(async () => ({
        success: true,
        readyForCompletion: true,
        validation: {},
        git: {},
        task: { status: 'in_progress' },
      })),
      getConfig: mock(() => ({ features: {} })),
      isCodeReviewEnabled: mock(() => false),
      getActiveTaskId: mock(() => null),
      cwd: () => '/project',
      logger: createMockLogger(),
      ...overrides,
    } satisfies PrepareCompletionDeps;
  }

  test('reports validation issues when checks fail', async () => {
    const deps = createBaseDeps({
      runValidationChecks: mock(async () => ({
        success: true,
        readyForCompletion: false,
        validation: {
          typescript: { passed: false, errorCount: 3, errors: 'TS error output' },
          biome: { passed: false, issueCount: 2, errors: 'Biome output' },
          tests: { passed: false, failCount: 1, errors: 'Test failure' },
          knip: { passed: false, unusedFiles: 1, unusedExports: 0, unusedDeps: 0 },
        },
        git: { hasUncommittedChanges: true, modifiedFiles: ['a.ts'], wipCommitCount: 2 },
        task: { status: 'review' },
      })),
    });

    const result = await prepareCompletionAction(deps);
    expect(result.success).toBeTrue();
    expect(result.data?.readyForCompletion).toBeFalse();
    expect(result.messages?.some((msg) => msg.includes('TypeScript Errors'))).toBeTrue();
    expect(result.messages?.some((msg) => msg.includes('Linting Issues'))).toBeTrue();
    expect(result.messages?.some((msg) => msg.includes('Test Failures'))).toBeTrue();
    expect(result.messages?.some((msg) => msg.includes('WIP commits'))).toBeTrue();
  });

  test('includes code review output when enabled', async () => {
    const fileOps = {
      existsSync: mock(() => false),
      mkdirSync: mock(() => {}),
      readFileSync: mock(() => '# Task Title'),
      readdirSync: mock(() => ['TASK_001_review.md']),
    };
    const deps = createBaseDeps({
      isCodeReviewEnabled: mock(() => true),
      getActiveTaskId: mock(() => 'TASK_001'),
      fileOps,
      performCodeReview: mock(async () => ({ success: true })) as any,
      execSync: mock(() => ''),
      getCurrentBranch: mock(() => 'feature/branch'),
      getDefaultBranch: mock(() => 'main'),
      getMergeBase: mock(() => 'abc123'),
    });

    const result = await prepareCompletionAction(deps);
    expect(result.success).toBeTrue();
    expect(result.data?.codeReview?.reviewGenerated).toBeTrue();
    expect(result.messages?.some((msg) => msg.includes('Code review completed'))).toBeTrue();
  });

  test('returns success output when validation passes', async () => {
    const deps = createBaseDeps();
    const result = await prepareCompletionAction(deps);
    expect(result.success).toBeTrue();
    expect(result.data?.readyForCompletion).toBeTrue();
    expect(result.messages?.some((msg) => msg.includes('Task is ready for completion'))).toBeTrue();
  });

  test('captures errors from validation command', async () => {
    const deps = createBaseDeps({
      runValidationChecks: mock(async () => {
        throw new Error('exec failed');
      }),
    });

    const result = await prepareCompletionAction(deps);
    expect(result.success).toBeTrue();
    expect(result.data?.error).toBe('exec failed');
    expect(result.messages?.some((msg) => msg.includes('Validation Check Failed'))).toBeTrue();
  });
});
