/**
 * Pre-Tool Validation Hook (PreToolUse)
 *
 * Runs BEFORE Edit, Write, MultiEdit, or WebSearch tools execute.
 * Returns hookSpecificOutput.permissionDecision: 'deny' to ACTUALLY BLOCK
 * the tool call - the operation never happens.
 *
 * Validations performed:
 * 1. Startup checks: Bun installed, npm conflicts, plugin dependencies
 * 2. WebSearch year validation: Blocks queries with outdated year
 * 3. Branch protection: Blocks edits on main/master branches
 * 4. Specs directory protection: Blocks spec edits on main branch
 * 5. Metadata file protection: Blocks direct edits to .metadata.json files
 *
 * Unlike PostToolUse hooks (see edit-validation.ts), this hook provides
 * true prevention - denied operations never execute.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { getConfig, isCcTrackConfigured, isHookEnabled } from '../skills/cc-track-tools/lib/config';
import { detectNpmPackage, verifyBunInstalled, verifyPluginDependencies } from '../skills/cc-track-tools/lib/detection';
import {
  getBunNotInstalledMessage,
  getMissingDependenciesMessage,
  getNpmPluginConflictMessage,
} from '../skills/cc-track-tools/lib/error-messages';
import { GitHelpers } from '../skills/cc-track-tools/lib/git-helpers';
import { createLogger } from '../skills/cc-track-tools/lib/logger';
import type { HookInput, HookOutput } from '../types';

const logger = createLogger('pre-tool-validation');

export interface PreToolValidationDependencies {
  logger?: ReturnType<typeof createLogger>;
  isCcTrackConfigured?: typeof isCcTrackConfigured;
  isHookEnabled?: typeof isHookEnabled;
  getConfig?: typeof getConfig;
  gitHelpers?: GitHelpers;
  execSync?: typeof execSync;
  existsSync?: typeof existsSync;
  detectNpmPackage?: typeof detectNpmPackage;
  verifyBunInstalled?: typeof verifyBunInstalled;
  verifyPluginDependencies?: typeof verifyPluginDependencies;
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
 * Check if a file path is in the specs directory
 */
export function isSpecFile(filePath: string): boolean {
  // Normalize to forward slashes for cross-platform regex matching
  const normalized = filePath.replace(/\\/g, '/');
  return /\.cc-track\/specs\//.test(normalized);
}

/**
 * Check if a file path is a metadata file (.metadata.json inside a spec directory)
 */
export function isMetadataFile(filePath: string): boolean {
  // Normalize to forward slashes for cross-platform regex matching
  const normalized = filePath.replace(/\\/g, '/');
  return /\.cc-track\/specs\/\d{3}-[^/]+\/\.metadata\.json$/.test(normalized);
}

/**
 * Main pre-tool validation hook function
 */
export async function preToolValidationHook(
  input: HookInput,
  deps: PreToolValidationDependencies = {},
): Promise<HookOutput> {
  const log = deps.logger || logger;
  const checkConfigured = deps.isCcTrackConfigured || isCcTrackConfigured;
  const checkEnabled = deps.isHookEnabled || isHookEnabled;
  const configGetter = deps.getConfig || getConfig;
  const gitHelpers = deps.gitHelpers || new GitHelpers();
  const exec = deps.execSync || execSync;
  const fsExists = deps.existsSync || existsSync;
  const npmDetect = deps.detectNpmPackage || detectNpmPackage;
  const bunVerify = deps.verifyBunInstalled || verifyBunInstalled;
  const depsVerify = deps.verifyPluginDependencies || verifyPluginDependencies;

  try {
    // Exit early if cc-track is not configured in this project
    // This prevents the plugin from interfering with non-cc-track projects
    const cwd = input.cwd || process.cwd();
    if (!checkConfigured(cwd)) {
      return { continue: true };
    }

    // Check if hook is enabled
    if (!checkEnabled('pre_tool_validation')) {
      return { continue: true };
    }

    const config = configGetter();

    // STARTUP CHECKS - Informational only (non-blocking)
    // These checks help Claude understand installation issues and potentially fix them
    const startupWarnings: string[] = [];

    // Check 1: Detect npm/plugin conflict (T060)
    const npmCheck = npmDetect(exec);
    if (npmCheck.detected) {
      log.warn('npm/plugin conflict detected', { message: npmCheck.message });
      startupWarnings.push(getNpmPluginConflictMessage());
    }

    // Check 2: Verify Bun is installed (T061)
    const bunCheck = bunVerify(exec);
    if (!bunCheck.detected) {
      log.warn('Bun runtime not found', { message: bunCheck.message });
      startupWarnings.push(getBunNotInstalledMessage());
    }

    // Check 3: Verify plugin dependencies are installed (T062)
    const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
    if (pluginRoot) {
      const depsCheck = depsVerify(pluginRoot, fsExists);
      if (!depsCheck.detected) {
        log.warn('Plugin dependencies not installed', { message: depsCheck.message, pluginRoot });
        startupWarnings.push(getMissingDependenciesMessage(pluginRoot));
      }
    }

    // If there are startup warnings, inform Claude but don't block
    if (startupWarnings.length > 0) {
      return {
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext: `⚠️ cc-track startup warnings:\n\n${startupWarnings.join('\n\n')}\n\nThese issues should be resolved for cc-track to function properly, but this tool call will proceed.`,
        },
      };
    }

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
                permissionDecisionReason: `🚫 Branch Protection: Cannot edit files on protected branch '${currentBranch}'\n\nYou are currently on a protected branch. To make changes:\n1. Use /cc-track:specify to start a new task (creates a feature branch automatically)\n2. Or create a feature branch manually: git checkout -b feature/your-feature-name\n\n${allowGitignored ? 'Note: Edits to gitignored files are allowed on protected branches.' : ''}`,
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

    // Metadata File Protection Check
    const metadataFilePath = extractFilePath(input.tool_name, input.tool_input);
    if (metadataFilePath && isMetadataFile(metadataFilePath)) {
      log.warn('Blocking metadata file edit', {
        filePath: metadataFilePath,
        tool: input.tool_name,
      });

      return {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny' as const,
          permissionDecisionReason: `🚫 Metadata Protection: Cannot directly modify .metadata.json files

Metadata files track task status and should only be modified by cc-track commands:
- /cc-track:complete-task - marks task as completed
- /cc-track:prepare-completion - validates before completion

These commands run scripts that properly update metadata with validation.`,
        },
      };
    }

    return { continue: true };
  } catch (error) {
    log.exception('Fatal error in task validation hook', error as Error);
    // Don't block on unexpected errors
    return { continue: true };
  }
}

// CLI entrypoint for hook execution
if (import.meta.main) {
  const chunks: Buffer[] = [];
  process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
  process.stdin.on('end', async () => {
    try {
      const input = JSON.parse(Buffer.concat(chunks).toString()) as HookInput;
      const output = await preToolValidationHook(input);
      console.log(JSON.stringify(output));
      process.exit(0);
    } catch (_error) {
      console.error(JSON.stringify({ continue: true }));
      process.exit(0);
    }
  });
}
