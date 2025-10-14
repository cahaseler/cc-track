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
 * Get current year from environment or system
 */
export function getCurrentYear(): number {
  // Get from environment date if available
  const envDate = process.env.TODAY_DATE || new Date().toISOString();
  const year = new Date(envDate).getFullYear();
  return year;
}

/**
 * Detect if a WebSearch query has an outdated year
 * Returns: { isOutdated: boolean, detectedYear: number | null, suggestedQuery: string | null }
 */
export function detectOutdatedYear(query: string): {
  isOutdated: boolean;
  detectedYear: number | null;
  suggestedQuery: string | null;
  reason: string | null;
} {
  const currentYear = getCurrentYear();
  const lastYear = currentYear - 1;

  // Pattern 1: "topic 2024" at end (most common case)
  const endYearPattern = new RegExp(`\\b(${lastYear})\\s*$`);
  const endMatch = query.match(endYearPattern);
  if (endMatch) {
    return {
      isOutdated: true,
      detectedYear: lastYear,
      suggestedQuery: query.replace(endYearPattern, currentYear.toString()),
      reason: `Query ends with "${lastYear}" but current year is ${currentYear}`,
    };
  }

  // Pattern 2: "2024 topic" at start
  const startYearPattern = new RegExp(`^(${lastYear})\\b`);
  const startMatch = query.match(startYearPattern);
  if (startMatch) {
    return {
      isOutdated: true,
      detectedYear: lastYear,
      suggestedQuery: query.replace(startYearPattern, currentYear.toString()),
      reason: `Query starts with "${lastYear}" but current year is ${currentYear}`,
    };
  }

  // Pattern 3: "latest 2024" or "current 2024" (implies wanting recent info)
  const latestPattern = new RegExp(`\\b(latest|current|newest|recent)\\s+(${lastYear})\\b`, 'i');
  const latestMatch = query.match(latestPattern);
  if (latestMatch) {
    return {
      isOutdated: true,
      detectedYear: lastYear,
      suggestedQuery: query.replace(latestPattern, `$1 ${currentYear}`),
      reason: `Query uses "latest/current ${lastYear}" but current year is ${currentYear}`,
    };
  }

  // Pattern 4: "YYYY documentation/guide/tutorial" where YYYY is last year
  const docPattern = new RegExp(`\\b(${lastYear})\\s+(documentation|guide|tutorial|docs|practices|features)\\b`, 'i');
  const docMatch = query.match(docPattern);
  if (docMatch) {
    return {
      isOutdated: true,
      detectedYear: lastYear,
      suggestedQuery: query.replace(docPattern, `${currentYear} $2`),
      reason: `Query searches for "${lastYear} documentation" but current year is ${currentYear}`,
    };
  }

  // No outdated pattern detected
  return {
    isOutdated: false,
    detectedYear: null,
    suggestedQuery: null,
    reason: null,
  };
}

/**
 * Check if a query is a legitimate historical search
 */
export function isHistoricalSearch(query: string): boolean {
  const currentYear = getCurrentYear();
  const lastYear = currentYear - 1;

  // Patterns that indicate intentional historical reference
  const historicalPatterns = [
    /\b(compare|vs|versus|difference)\b.*\b\d{4}\b/i, // "compare 2024 vs 2025"
    /\b\d{4}\s+\w*\s*(election|vote|campaign)\b/i, // "2024 election results", "2024 presidential campaign"
    /\b(election|vote|campaign)\b.*\b\d{4}\b/i, // "election in 2024"
    /\b(history|historical|archive)\b/i, // explicit historical context
    /\b(in|during|from)\s+\d{4}\b/i, // "in 2024" (temporal reference)
    new RegExp(`\\b${lastYear}\\b.*\\b${currentYear}\\b`, 'i'), // mentions both years (comparison)
  ];

  return historicalPatterns.some((pattern) => pattern.test(query));
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
 * Check if a file path is in the specs directory
 */
export function isSpecFile(filePath: string): boolean {
  return /\.claude\/specs\//.test(filePath);
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

    const cwd = input.cwd || process.cwd();
    const config = configGetter();

    // WebSearch Year Validation (runs first, before file-based checks)
    if (input.tool_name === 'WebSearch' && config.features?.websearch_validation?.enabled !== false) {
      const toolInput = input.tool_input as { query?: string };
      const query = toolInput?.query;

      if (query) {
        log.debug('WebSearch validation triggered', { query });

        // Skip validation for historical searches
        if (isHistoricalSearch(query)) {
          log.debug('Allowing historical search', { query });
          return { continue: true };
        }

        // Check for outdated year patterns
        const yearCheck = detectOutdatedYear(query);
        if (yearCheck.isOutdated && yearCheck.suggestedQuery) {
          const currentYear = getCurrentYear();
          log.warn('Blocking outdated WebSearch query', {
            query,
            detectedYear: yearCheck.detectedYear,
            suggestedQuery: yearCheck.suggestedQuery,
          });

          return {
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: 'deny' as const,
              permissionDecisionReason: `🔍 Outdated Search Year Detected

Your search query uses ${yearCheck.detectedYear} but the current year is ${currentYear} (today is ${new Date().toISOString().split('T')[0]}).

${yearCheck.reason}

**Suggested query:**
\`\`\`
${yearCheck.suggestedQuery}
\`\`\`

Please update your search to use ${currentYear} for the most current information.

Note: If you genuinely need historical ${yearCheck.detectedYear} information, try adding temporal context like "in ${yearCheck.detectedYear}" or "historical" to your query.`,
            },
          };
        }
      }
    }

    // Only process Edit, Write, and MultiEdit tools for file-based validations
    if (input.tool_name !== 'Edit' && input.tool_name !== 'Write' && input.tool_name !== 'MultiEdit') {
      return { continue: true };
    }

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

    // Specs Directory Protection Check
    const filePath = extractFilePath(input.tool_name, input.tool_input);
    if (filePath && isSpecFile(filePath)) {
      const currentBranch = gitHelpers.getCurrentBranch(cwd);
      const defaultBranch = gitHelpers.getDefaultBranch(cwd);

      // Block edits to specs/ files when not on a feature branch
      if (currentBranch === defaultBranch) {
        log.warn('Blocking spec file edit on main branch', {
          branch: currentBranch,
          filePath,
          tool: input.tool_name,
        });

        return {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny' as const,
            permissionDecisionReason: `🚫 Specs Directory Protection: Cannot edit spec files on main branch '${currentBranch}'\n\nSpec files should only be modified on feature branches during active task work.\n\nTo make changes:\n1. Use /specify to start a new task (creates feature branch automatically)\n2. Or switch to the feature branch for the task you're working on\n\nSpec files are managed through the spec-driven workflow commands (/specify, /clarify, /plan, /tasks).`,
          },
        };
      }

      log.debug('Allowing spec file edit on feature branch', { filePath, branch: currentBranch });
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
