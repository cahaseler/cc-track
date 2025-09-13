/**
 * Task validation hook for PreToolUse events
 * Validates edits to task files to prevent inappropriate status changes
 * and weasel-word completions
 */

import { ClaudeSDK } from '../lib/claude-sdk';
import { isHookEnabled } from '../lib/config';
import { createLogger } from '../lib/logger';
import type { HookInput, HookOutput } from '../types';

const logger = createLogger('task-validation');

export interface TaskValidationDependencies {
  claudeSDK?: typeof ClaudeSDK;
  logger?: ReturnType<typeof createLogger>;
  isHookEnabled?: typeof isHookEnabled;
}

/**
 * Check if a file path is a task file
 */
export function isTaskFile(filePath: string): boolean {
  return /\.claude\/tasks\/TASK_\d+\.md$/.test(filePath);
}

/**
 * Extract the diff information from Edit/MultiEdit tool input
 */
export function extractDiffInfo(
  toolName: string,
  toolInput: unknown,
): { filePath: string; oldContent: string; newContent: string } | null {
  const input = toolInput as {
    file_path?: string;
    old_string?: string;
    new_string?: string;
    edits?: Array<{ old_string: string; new_string: string }>;
  };

  if (!input.file_path) return null;

  if (toolName === 'Edit' && input.old_string !== undefined && input.new_string !== undefined) {
    return {
      filePath: input.file_path,
      oldContent: input.old_string,
      newContent: input.new_string,
    };
  }

  if (toolName === 'MultiEdit' && input.edits && input.edits.length > 0) {
    // For MultiEdit, combine all edits to show the cumulative change
    const oldParts: string[] = [];
    const newParts: string[] = [];

    for (const edit of input.edits) {
      oldParts.push(edit.old_string);
      newParts.push(edit.new_string);
    }

    return {
      filePath: input.file_path,
      oldContent: oldParts.join('\n---\n'),
      newContent: newParts.join('\n---\n'),
    };
  }

  return null;
}

/**
 * Build the validation prompt for Claude
 */
export function buildValidationPrompt(filePath: string, oldContent: string, newContent: string): string {
  return `You are a strict task file validator for the cc-track system. Review this edit to a task file and determine if it should be blocked.

TASK FILE: ${filePath}

OLD CONTENT:
${oldContent}

NEW CONTENT:
${newContent}

VALIDATION RULES:
1. BLOCK if the edit changes the task status to "completed" - only the /complete-task command should do this
2. BLOCK if the edit uses weasel words to claim completion without finishing work, such as:
   - "Most tests pass" or "majority of tests pass" (ALL tests must pass)
   - "Lint/type checks mostly pass" or "acceptable lint issues" (ALL checks must pass)
   - "Environment issues" or "test framework problems" as excuses for failures
   - "Good enough" or "functional enough" or "not critical" for incomplete work
   - Any language that implies partial completion is acceptable

IMPORTANT: The cc-track library has STRICT requirements:
- 100% of tests must pass when run together
- 100% of lint checks must pass
- 100% of type checks must pass
- No exceptions or excuses are acceptable

If the edit violates these rules, respond with JSON:
{
  "shouldBlock": true,
  "reason": "Complete explanation of why this edit is blocked, what should be done instead, and remind that the next step is to fix the issues described or discuss with the user. Emphasize that 100% of tests, lints, and type checks must pass."
}

If the edit is acceptable, respond with JSON:
{
  "shouldBlock": false,
  "reason": "Edit is acceptable"
}`;
}

/**
 * Main task validation hook function
 */
export async function taskValidationHook(input: HookInput, deps: TaskValidationDependencies = {}): Promise<HookOutput> {
  const sdk = deps.claudeSDK || ClaudeSDK;
  const log = deps.logger || logger;
  const checkEnabled = deps.isHookEnabled || isHookEnabled;

  try {
    // Check if hook is enabled
    if (!checkEnabled('task_validation')) {
      return { continue: true };
    }

    // Only process Edit and MultiEdit tools
    if (input.tool_name !== 'Edit' && input.tool_name !== 'MultiEdit') {
      return { continue: true };
    }

    log.debug('Task validation triggered', {
      tool_name: input.tool_name,
      has_tool_input: !!input.tool_input,
    });

    // Extract diff information
    const diffInfo = extractDiffInfo(input.tool_name, input.tool_input);
    if (!diffInfo) {
      log.debug('No diff information found');
      return { continue: true };
    }

    // Check if this is a task file
    if (!isTaskFile(diffInfo.filePath)) {
      log.debug('Not a task file, skipping validation', { filePath: diffInfo.filePath });
      return { continue: true };
    }

    log.info('Validating task file edit', { filePath: diffInfo.filePath });

    // Build validation prompt
    const prompt = buildValidationPrompt(diffInfo.filePath, diffInfo.oldContent, diffInfo.newContent);

    // Call Claude SDK for validation
    const response = await sdk.prompt(prompt, 'sonnet', {
      maxTurns: 1,
      timeoutMs: 15000,
    });

    if (!response.success) {
      log.error('Claude SDK validation failed', { error: response.error });
      // On error, allow the edit to proceed
      return { continue: true };
    }

    // Parse the response (handle markdown code blocks if present)
    let validationResult: { shouldBlock: boolean; reason: string };
    try {
      // Remove markdown code blocks if present
      let jsonText = response.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      validationResult = JSON.parse(jsonText);
    } catch (parseError) {
      log.error('Failed to parse validation response', {
        response: response.text,
        error: parseError,
      });
      // On parse error, allow the edit to proceed
      return { continue: true };
    }

    // If validation says to block, return the appropriate PreToolUse response
    if (validationResult.shouldBlock) {
      log.warn('Blocking task file edit', {
        filePath: diffInfo.filePath,
        reason: validationResult.reason,
      });

      // PreToolUse hooks use hookSpecificOutput with permissionDecision
      return {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny' as const,
          permissionDecisionReason: validationResult.reason,
        },
      };
    }

    log.debug('Task file edit validated successfully');
    return { continue: true };
  } catch (error) {
    log.exception('Fatal error in task validation hook', error as Error);
    // Don't block on unexpected errors
    return { continue: true };
  }
}
