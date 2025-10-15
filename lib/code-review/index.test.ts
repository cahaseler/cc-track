import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createMockLogger } from '../../test-utils/command-mocks';
import { performCodeReview } from './index';
import type { CodeReviewOptions } from './types';

describe('performCodeReview', () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  test('returns error when code review is disabled', async () => {
    const options: CodeReviewOptions = {
      taskId: 'TASK_001',
      taskTitle: 'Test Task',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodeReview(options, {
      isCodeReviewEnabled: () => false,
      getCodeReviewTool: () => 'claude',
      logger: createMockLogger(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Code review is disabled in configuration');
  });

  test('delegates to Claude when configured', async () => {
    const mockPerformClaudeReview = mock(async () => ({
      success: true,
      review: 'Claude review content',
    }));

    const options: CodeReviewOptions = {
      taskId: 'TASK_001',
      taskTitle: 'Test Task',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodeReview(options, {
      isCodeReviewEnabled: () => true,
      getCodeReviewTool: () => 'claude',
      performClaudeReview: mockPerformClaudeReview,
      logger: createMockLogger(),
    });

    expect(result.success).toBe(true);
    expect(result.review).toBe('Claude review content');
    expect(mockPerformClaudeReview).toHaveBeenCalledWith(options);
  });

  test('delegates to CodeRabbit when configured', async () => {
    const mockPerformCodeRabbitReview = mock(async () => ({
      success: true,
      review: 'CodeRabbit review content',
    }));

    const options: CodeReviewOptions = {
      taskId: 'TASK_002',
      taskTitle: 'Test Task 2',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodeReview(options, {
      isCodeReviewEnabled: () => true,
      getCodeReviewTool: () => 'coderabbit',
      performCodeRabbitReview: mockPerformCodeRabbitReview,
      logger: createMockLogger(),
    });

    expect(result.success).toBe(true);
    expect(result.review).toBe('CodeRabbit review content');
    expect(mockPerformCodeRabbitReview).toHaveBeenCalledWith(options);
  });

  test('handles unknown tool gracefully', async () => {
    const options: CodeReviewOptions = {
      taskId: 'TASK_003',
      taskTitle: 'Test Task 3',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodeReview(options, {
      isCodeReviewEnabled: () => true,
      getCodeReviewTool: () => 'unknown-tool' as any,
      logger: createMockLogger(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown code review tool: unknown-tool');
  });

  test('handles tool errors gracefully', async () => {
    const mockPerformClaudeReview = mock(async () => {
      throw new Error('Network timeout');
    });

    const options: CodeReviewOptions = {
      taskId: 'TASK_004',
      taskTitle: 'Test Task 4',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodeReview(options, {
      isCodeReviewEnabled: () => true,
      getCodeReviewTool: () => 'claude',
      performClaudeReview: mockPerformClaudeReview,
      logger: createMockLogger(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Code review failed with claude: Network timeout');
  });
});
