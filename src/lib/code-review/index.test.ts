import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { performCodeReview } from './index';
import type { CodeReviewOptions } from './types';

describe('performCodeReview', () => {
  beforeEach(() => {
    mock.restore();
  });

  test('returns error when code review is disabled', async () => {
    mock.module('../config', () => ({
      isCodeReviewEnabled: mock(() => false),
      getCodeReviewTool: mock(() => 'claude'),
    }));

    const options: CodeReviewOptions = {
      taskId: 'TASK_001',
      taskTitle: 'Test Task',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodeReview(options);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Code review is disabled in configuration');
  });

  test('delegates to Claude when configured', async () => {
    const mockPerformClaudeReview = mock(async () => ({
      success: true,
      review: 'Claude review content',
    }));

    mock.module('../config', () => ({
      isCodeReviewEnabled: mock(() => true),
      getCodeReviewTool: mock(() => 'claude'),
    }));

    mock.module('./claude', () => ({
      performClaudeReview: mockPerformClaudeReview,
    }));

    const options: CodeReviewOptions = {
      taskId: 'TASK_001',
      taskTitle: 'Test Task',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodeReview(options);

    expect(result.success).toBe(true);
    expect(result.review).toBe('Claude review content');
    expect(mockPerformClaudeReview).toHaveBeenCalledWith(options);
  });

  test('delegates to CodeRabbit when configured', async () => {
    const mockPerformCodeRabbitReview = mock(async () => ({
      success: true,
      review: 'CodeRabbit review content',
    }));

    mock.module('../config', () => ({
      isCodeReviewEnabled: mock(() => true),
      getCodeReviewTool: mock(() => 'coderabbit'),
    }));

    mock.module('./coderabbit', () => ({
      performCodeRabbitReview: mockPerformCodeRabbitReview,
    }));

    const options: CodeReviewOptions = {
      taskId: 'TASK_002',
      taskTitle: 'Test Task 2',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodeReview(options);

    expect(result.success).toBe(true);
    expect(result.review).toBe('CodeRabbit review content');
    expect(mockPerformCodeRabbitReview).toHaveBeenCalledWith(options);
  });

  test('handles unknown tool gracefully', async () => {
    mock.module('../config', () => ({
      isCodeReviewEnabled: mock(() => true),
      getCodeReviewTool: mock(() => 'unknown-tool' as any),
    }));

    const options: CodeReviewOptions = {
      taskId: 'TASK_003',
      taskTitle: 'Test Task 3',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodeReview(options);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown code review tool: unknown-tool');
  });

  test('handles tool errors gracefully', async () => {
    mock.module('../config', () => ({
      isCodeReviewEnabled: mock(() => true),
      getCodeReviewTool: mock(() => 'claude'),
    }));

    mock.module('./claude', () => ({
      performClaudeReview: mock(async () => {
        throw new Error('Network timeout');
      }),
    }));

    const options: CodeReviewOptions = {
      taskId: 'TASK_004',
      taskTitle: 'Test Task 4',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodeReview(options);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Code review failed with claude: Network timeout');
  });
});
