import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { HookInput, HookOutput } from '../types';
import { isHookEnabled } from '../lib/config';
import { createLogger } from '../lib/logger';

export interface PostCompactDependencies {
  fileOps?: {
    existsSync: typeof existsSync;
    readFileSync: typeof readFileSync;
  };
  logger?: ReturnType<typeof createLogger>;
}

/**
 * Extract active task file from CLAUDE.md content
 */
export function extractActiveTaskFile(claudeMdContent: string): string {
  const taskMatch = claudeMdContent.match(/@\.claude\/tasks\/(TASK_\d+\.md)/);
  return taskMatch ? taskMatch[1] : '';
}

/**
 * Extract and read imported files from CLAUDE.md
 */
export function readImportedFiles(
  claudeMdContent: string,
  projectRoot: string,
  fileOps: PostCompactDependencies['fileOps']
): string {
  const fs = fileOps || { existsSync, readFileSync };
  const importPattern = /@(\.claude\/[^\s]+)/g;
  const imports = [...claudeMdContent.matchAll(importPattern)];

  let importedContent = '';
  for (const match of imports) {
    const importPath = join(projectRoot, match[1]);
    if (fs.existsSync(importPath)) {
      const content = fs.readFileSync(importPath, 'utf-8');
      const fileName = match[1].split('/').pop();
      importedContent += `\n## ${fileName}:\n\`\`\`markdown\n${content}\n\`\`\`\n`;
    }
  }
  
  return importedContent;
}

/**
 * Generate post-compaction instructions for Claude
 */
export function generatePostCompactionInstructions(
  claudeMdContent: string,
  importedContent: string,
  activeTaskFile: string
): string {
  let instructions = `📋 POST-COMPACTION CONTEXT RESTORATION

## Current CLAUDE.md Contents:
\`\`\`markdown
${claudeMdContent}
\`\`\`

## Imported Context Files:
${importedContent}

Now that you can see the current state of the project documentation:

1. First, review your recent journal entries to recall important context:
   - Use mcp__private-journal__list_recent_entries to see your last 5-10 entries
   - Pay special attention to technical_insights, project_notes, and user_context
   - Note any struggles, breakthroughs, or important realizations

2. Review the compaction summary above combined with your journal insights
   
3. Update the project documentation to reflect the current state:`;

  if (activeTaskFile) {
    instructions += `
   
   a) Review the active task file shown above (${activeTaskFile})
   b) Update it to reflect progress:
      - Check off completed requirements (change - [ ] to - [x])
      - Update the Status field if appropriate
      - Add a "## Recent Progress" section with a brief summary of what was done
      - Update "## Current Focus" with what to work on next
      - Update "## Open Questions & Blockers" if any were resolved or discovered`;
  }

  instructions += `
   
   c) If any significant technical decisions were made (check your journal!), append them to .claude/decision_log.md
   d) If any new patterns or conventions were established, update .claude/system_patterns.md
   e) If the task is now complete, update its status to "completed" and create a summary entry in .claude/progress_log.md
   f) Consider if any journal insights should be formalized in the project documentation

4. After updating the documentation, provide a brief summary of:
   - What you updated
   - Key insights from your journal that influenced the updates
   - Any unresolved issues or concerns noted in your journal

Please do this now before proceeding with any new work.`;

  return instructions;
}

/**
 * Main post-compact hook function
 */
export async function postCompactHook(
  input: HookInput,
  deps: PostCompactDependencies = {}
): Promise<HookOutput> {
  const fileOps = deps.fileOps || { existsSync, readFileSync };
  const logger = deps.logger || createLogger('post_compact');

  // Check if hook is enabled
  if (!isHookEnabled('post_compact')) {
    return { continue: true };
  }

  logger.debug('SessionStart hook called', { data: input });

  // Only run after compaction (both manual and auto)
  // According to docs: "compact" - Invoked from auto or manual compact
  if (input.source !== 'compact') {
    logger.debug(`Skipping - source is not 'compact' (got: ${input.source})`);
    return { continue: true };
  }

  logger.info('Post-compaction context restoration starting');

  try {
    // Get project root
    const projectRoot = input.cwd || process.cwd();

    // Read CLAUDE.md if it exists
    const claudeMdPath = join(projectRoot, 'CLAUDE.md');
    let claudeMdContent = '';
    let activeTaskFile = '';

    if (fileOps.existsSync(claudeMdPath)) {
      claudeMdContent = fileOps.readFileSync(claudeMdPath, 'utf-8');
      activeTaskFile = extractActiveTaskFile(claudeMdContent);
    }

    // Read all imported files
    const importedContent = readImportedFiles(claudeMdContent, projectRoot, fileOps);

    // Generate instructions
    const instructions = generatePostCompactionInstructions(
      claudeMdContent,
      importedContent,
      activeTaskFile
    );

    // SessionStart hooks should use both systemMessage and hookSpecificOutput
    return {
      continue: true,
      systemMessage: instructions,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: instructions,
      },
    };
  } catch (error) {
    logger.error('Error in post_compact hook', { error });
    // Don't block session start on errors
    return { continue: true };
  }
}