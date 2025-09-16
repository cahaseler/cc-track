import { join, resolve } from 'node:path';
import type {
  CanUseTool,
  PermissionResult,
  Query,
  SDKAssistantMessage,
  SDKResultMessage,
} from '@anthropic-ai/claude-code';
// Import necessary functions from claude-sdk
import { createMessageStream, findClaudeCodeExecutable } from '../claude-sdk';
import { createLogger } from '../logger';
import type { CodeReviewOptions, CodeReviewResult } from './types';

export interface ClaudeDeps {
  logger?: ReturnType<typeof createLogger>;
}

/**
 * Perform code review using Claude SDK
 */
export async function performClaudeReview(
  options: CodeReviewOptions,
  deps: ClaudeDeps = {},
): Promise<CodeReviewResult> {
  const { logger = createLogger('claude-review') } = deps;

  const { taskId, taskTitle, taskRequirements, gitDiff, projectRoot } = options;

  const p = `You are performing a comprehensive code review for task ${taskId}.

# Task Information
- **Task ID:** ${taskId}
- **Title:** ${taskTitle}
- **Project Root:** ${projectRoot}

# Task Requirements
${taskRequirements}

# Changes to Review (Git Diff)
${gitDiff}

# Your Review Task

Perform a thorough code review analyzing:
1. **Requirements Alignment:** Do the changes fulfill all task requirements?
2. **Security:** Are there any security vulnerabilities or concerns?
3. **Code Quality:** Is the code well-structured, readable, and maintainable?
4. **Performance:** Are there any performance issues or optimizations needed?
5. **Architecture:** Does the implementation follow project patterns and conventions?
6. **Error Handling:** Is error handling comprehensive and appropriate?
7. **Testing:** Are the changes adequately tested? Are there missing test cases?
8. **Documentation:** Is the code properly documented? Are there missing explanations?

You have access to read any file in the project to understand context and patterns.
You can only write to the code-reviews/ directory.

Write your complete review to a file named: code-reviews/${taskId}_[DATE].md

Use the current UTC timestamp for [DATE] in format: YYYY-MM-DD_HHmm-UTC

Your review should be thorough, actionable, and constructive. Include specific file/line references where applicable.`;

  try {
    // Find Claude Code executable
    const pathToClaudeCodeExecutable = findClaudeCodeExecutable();
    const { query } = await import('@anthropic-ai/claude-code');

    logger.info('Starting Claude code review', { taskId, timeout: 600000, maxTurns: 30 });

    const stream = query({
      prompt: createMessageStream(p),
      options: {
        model: 'sonnet',
        maxTurns: 30,
        allowedTools: ['Read', 'Grep', 'Glob', 'Write'],
        disallowedTools: ['*'], // Only allow the specific tools above
        pathToClaudeCodeExecutable,
        cwd: projectRoot,
        canUseTool: (async (toolName, input, _options) => {
          // Only restrict Write tool to code-reviews directory
          if (toolName === 'Write') {
            const requestedPath = (input as { file_path: string }).file_path;
            // Resolve the path relative to the project root to handle both absolute and relative paths
            const filePath = resolve(projectRoot, requestedPath);
            const allowedDir = join(projectRoot, 'code-reviews');

            if (!filePath.startsWith(allowedDir)) {
              logger.warn('Blocked Write attempt outside code-reviews directory', {
                toolName,
                attemptedPath: filePath,
                requestedPath,
                allowedDir,
              });
              return {
                behavior: 'deny',
                message: `Write access is restricted to ${allowedDir}. You can only write code review files.`,
              } satisfies PermissionResult;
            }
          }

          // Allow all other configured tools
          return {
            behavior: 'allow',
            updatedInput: input,
          } satisfies PermissionResult;
        }) satisfies CanUseTool,
        stderr: (data: string) => {
          try {
            const s = typeof data === 'string' ? data : String(data);
            logger.debug('Claude Code stderr', { data: s.substring(0, 500) });
          } catch {
            // ignore
          }
        },
      },
    });

    let reviewText = '';
    let success = false;
    let error: string | undefined;
    let timedOut = false;

    // 10 minute timeout
    const timeout = setTimeout(() => {
      timedOut = true;
      try {
        // Type assertion is safe here as Query extends AsyncGenerator<SDKMessage, void>
        void (stream as Query).return(undefined);
      } catch {
        // ignore
      }
    }, 600000);

    try {
      for await (const message of stream) {
        if (message.type === 'assistant') {
          const assistantMsg = message as SDKAssistantMessage;
          const content = assistantMsg.message.content[0];
          if (content && 'text' in content) {
            reviewText = content.text;
          }
        }

        if (message.type === 'result') {
          const resultMsg = message as SDKResultMessage;
          if (resultMsg.subtype === 'success' || resultMsg.subtype === 'error_max_turns') {
            success = true;
            logger.info('Claude code review completed', {
              subtype: resultMsg.subtype,
              inputTokens: resultMsg.usage?.input_tokens,
              outputTokens: resultMsg.usage?.output_tokens,
              costUSD: resultMsg.total_cost_usd,
            });
          } else {
            error = `Code review failed: ${resultMsg.subtype}`;
            logger.error('Claude code review failed', { subtype: resultMsg.subtype });
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    if (timedOut) {
      logger.warn('Claude code review timed out after 10 minutes');
      return {
        success: false,
        review: reviewText || 'Code review timed out',
        error: 'timeout after 600000ms',
      };
    }

    return { success, review: reviewText, error };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('Claude code review error', { error: msg });
    return {
      success: false,
      review: '',
      error: msg,
    };
  }
}
