/**
 * Pre-tool validation hook for PreToolUse events
 * Validates edits before they're executed, including:
 * - Task file validation to prevent inappropriate status changes
 * - Branch protection to block edits on protected branches
 */

import { execSync } from 'node:child_process';
import { ClaudeSDK } from '../lib/claude-sdk';
import { getConfig, isHookEnabled } from '../lib/config';
import { GitHelpers } from '../lib/git-helpers';
import { createLogger } from '../lib/logger';
import type { HookInput, HookOutput } from '../types';

const logger = createLogger('pre-tool-validation');

export interface PreToolValidationDependencies {
  claudeSDK?: typeof ClaudeSDK;
  logger?: ReturnType<typeof createLogger>;
  isHookEnabled?: typeof isHookEnabled;
  getConfig?: typeof getConfig;
  gitHelpers?: GitHelpers;
  execSync?: typeof execSync;
}

/**
 * Check if a file is gitignored
 */
export function isGitIgnored(filePath: string, cwd: string, exec: typeof execSync = execSync): boolean {
  try {
    // git check-ignore returns 0 if the file is ignored
    exec(`git check-ignore "${filePath}"`, { cwd, stdio: 'pipe' });
    return true;
  } catch {
    // Non-zero exit code means file is not ignored
    return false;
  }
}

/**
 * Extract file path from tool input
 */
export function extractFilePath(toolName: string, toolInput: unknown): string | null {
  const input = toolInput as { file_path?: string };

  if ((toolName === 'Edit' || toolName === 'Write' || toolName === 'MultiEdit') && input.file_path) {
    return input.file_path;
  }

  return null;
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
1. BLOCK if the edit changes the task status field to "completed" - only the /complete-task command should do this
2. BLOCK if the edit uses weasel words that claim completion WHILE ADMITTING to incomplete work, such as:
   - Marking as complete while saying "Most tests pass" or "majority of tests pass"
   - Marking as complete while saying "Lint/type checks mostly pass" or "acceptable lint issues"
   - Marking as complete while blaming "Environment issues" or "test framework problems" for failures
   - Marking as complete with "Good enough" or "functional enough" or "not critical" language
   - Any language that claims completion while simultaneously admitting work is incomplete

IMPORTANT: Do NOT block legitimate documentation of completed work. If requirements are being marked as complete without any admission of failure or incompleteness, that's normal task documentation and should be ALLOWED.

IMPORTANT: The cc-track library has STRICT requirements:
- 100% of tests must pass when run together
- 100% of lint checks must pass
- 100% of type checks must pass
- No exceptions or excuses are acceptable

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text before or after the JSON. Do not wrap the JSON in markdown code blocks. Output ONLY the raw JSON object.

If the edit violates these rules, output EXACTLY this structure:
{"shouldBlock":true,"reason":"Complete explanation of why this edit is blocked, what should be done instead, and remind that the next step is to fix the issues described or discuss with the user. Emphasize that 100% of tests, lints, and type checks must pass."}

If the edit is acceptable, output EXACTLY this structure:
{"shouldBlock":false,"reason":"Edit is acceptable"}

REMEMBER: Output ONLY the JSON object. No other text. No markdown. Just JSON.`;
}

/**
 * Main pre-tool validation hook function
 */
export async function preToolValidationHook(
  input: HookInput,
  deps: PreToolValidationDependencies = {},
): Promise<HookOutput> {
  const sdk = deps.claudeSDK || ClaudeSDK;
  const log = deps.logger || logger;
  const checkEnabled = deps.isHookEnabled || isHookEnabled;
  const configGetter = deps.getConfig || getConfig;
  const gitHelpers = deps.gitHelpers || new GitHelpers();
  const exec = deps.execSync || execSync;

  try {
    // Check if hook is enabled
    if (!checkEnabled('pre_tool_validation')) {
      return { continue: true };
    }

    // Only process Edit, Write, and MultiEdit tools
    if (input.tool_name !== 'Edit' && input.tool_name !== 'Write' && input.tool_name !== 'MultiEdit') {
      return { continue: true };
    }

    const cwd = input.cwd || process.cwd();
    const config = configGetter();

    // Branch Protection Check (runs first)
    if (config.features?.branch_protection?.enabled) {
      const filePath = extractFilePath(input.tool_name, input.tool_input);

      if (filePath) {
        const currentBranch = gitHelpers.getCurrentBranch(cwd);
        const defaultBranch = gitHelpers.getDefaultBranch(cwd);
        const configuredProtected = config.features.branch_protection.protected_branches || [];

        // Combine configured protected branches with the actual default branch
        const protectedBranches = new Set([...configuredProtected, defaultBranch]);

        if (protectedBranches.has(currentBranch)) {
          // Check if gitignored files are allowed
          const allowGitignored = config.features.branch_protection.allow_gitignored !== false;

          if (!allowGitignored || !isGitIgnored(filePath, cwd, exec)) {
            log.warn('Blocking edit on protected branch', {
              branch: currentBranch,
              filePath,
              tool: input.tool_name,
            });

            return {
              hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny' as const,
                permissionDecisionReason: `🚫 Branch Protection: Cannot edit files on protected branch '${currentBranch}'\n\nYou are currently on a protected branch. To make changes:\n1. Enter planning mode to start a new task (which will create a feature branch)\n2. Or switch to an existing feature branch if you're continuing work\n\n${allowGitignored ? 'Note: Edits to gitignored files are allowed on protected branches.' : ''}`,
              },
            };
          }

          log.debug('Allowing gitignored file edit on protected branch', { filePath, branch: currentBranch });
        }
      }
    }

    // Task Validation Check (only for Edit and MultiEdit, not Write)
    if (input.tool_name !== 'Write') {
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

      // Parse the response (handle various formats)
      let validationResult: { shouldBlock: boolean; reason: string };
      try {
        let jsonText = response.text.trim();

        // Try to extract JSON from the response
        // First, check if it's already valid JSON
        try {
          validationResult = JSON.parse(jsonText);
        } catch {
          // If not, try to extract JSON from various formats

          // Remove markdown code blocks
          if (jsonText.includes('```')) {
            jsonText = jsonText.replace(/```json\s*\n?/g, '').replace(/```\s*\n?/g, '');
          }

          // Find JSON object in the text (looking for {...})
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }

          validationResult = JSON.parse(jsonText);
        }
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
    }
    return { continue: true };
  } catch (error) {
    log.exception('Fatal error in task validation hook', error as Error);
    // Don't block on unexpected errors
    return { continue: true };
  }
}
