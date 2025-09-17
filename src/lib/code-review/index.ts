import { getCodeReviewTool, isCodeReviewEnabled } from '../config';
import { createLogger } from '../logger';
import { performClaudeReview } from './claude';
import { performCodeRabbitReview } from './coderabbit';
import type { CodeReviewOptions, CodeReviewResult, CodeReviewTool } from './types';

export type { CodeReviewIssue, CodeReviewOptions, CodeReviewResult, CodeReviewTool } from './types';

export interface CodeReviewDeps {
  isCodeReviewEnabled?: typeof isCodeReviewEnabled;
  getCodeReviewTool?: typeof getCodeReviewTool;
  performClaudeReview?: typeof performClaudeReview;
  performCodeRabbitReview?: typeof performCodeRabbitReview;
  logger?: ReturnType<typeof createLogger>;
}

/**
 * Perform code review using the configured tool
 */
export async function performCodeReview(
  options: CodeReviewOptions,
  deps: CodeReviewDeps = {},
): Promise<CodeReviewResult> {
  const {
    isCodeReviewEnabled: checkEnabled = isCodeReviewEnabled,
    getCodeReviewTool: getTool = getCodeReviewTool,
    performClaudeReview: claudeReview = performClaudeReview,
    performCodeRabbitReview: codeRabbitReview = performCodeRabbitReview,
    logger = createLogger('code-review'),
  } = deps;

  // Check if code review is enabled
  if (!checkEnabled()) {
    logger.debug('Code review is disabled');
    return {
      success: false,
      error: 'Code review is disabled in configuration',
    };
  }

  // Get configured tool
  const tool = getTool() as CodeReviewTool;

  logger.info('Starting code review', {
    tool,
    taskId: options.taskId,
  });

  try {
    switch (tool) {
      case 'claude':
        return await claudeReview(options);

      case 'coderabbit':
        return await codeRabbitReview(options);

      default:
        logger.error('Unknown code review tool', { tool });
        return {
          success: false,
          error: `Unknown code review tool: ${tool}`,
        };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Code review failed', { error: errorMsg, tool });
    return {
      success: false,
      error: `Code review failed with ${tool}: ${errorMsg}`,
    };
  }
}
