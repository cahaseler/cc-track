import { getCodeReviewTool, isCodeReviewEnabled } from '../config';
import { createLogger } from '../logger';
import { performClaudeReview } from './claude';
import { performCodeRabbitReview } from './coderabbit';
import type { CodeReviewOptions, CodeReviewResult, CodeReviewTool } from './types';

export type { CodeReviewIssue, CodeReviewOptions, CodeReviewResult, CodeReviewTool } from './types';

/**
 * Perform code review using the configured tool
 */
export async function performCodeReview(options: CodeReviewOptions): Promise<CodeReviewResult> {
  const logger = createLogger('code-review');

  // Check if code review is enabled
  if (!isCodeReviewEnabled()) {
    logger.debug('Code review is disabled');
    return {
      success: false,
      error: 'Code review is disabled in configuration',
    };
  }

  // Get configured tool
  const tool = getCodeReviewTool() as CodeReviewTool;

  logger.info('Starting code review', {
    tool,
    taskId: options.taskId,
  });

  try {
    switch (tool) {
      case 'claude':
        return await performClaudeReview(options);

      case 'coderabbit':
        return await performCodeRabbitReview(options);

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
