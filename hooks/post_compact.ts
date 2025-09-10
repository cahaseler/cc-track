#!/usr/bin/env bun

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { isHookEnabled } from '../.claude/lib/config';
import { createLogger } from '../.claude/lib/logger';

interface SessionStartInput {
  session_id: string;
  transcript_path?: string;
  cwd: string;
  hook_event_name: string;
  source?: string; // 'startup' | 'resume' | 'clear' | 'compact'
}

interface HookOutput {
  continue?: boolean;
  systemMessage?: string;
}

async function main() {
  const logger = createLogger('post_compact');
  
  try {
    // Check if hook is enabled
    if (!isHookEnabled('post_compact')) {
      // Silent exit
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }
    
    const input = await Bun.stdin.text();
    const data: SessionStartInput = JSON.parse(input);
    
    logger.debug('SessionStart hook called', { data });
    
    // Only run after compaction (both manual and auto)
    // According to docs: "compact" - Invoked from auto or manual compact
    if (data.source !== 'compact') {
      logger.debug(`Skipping - source is not 'compact' (got: ${data.source})`);
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }
    
    logger.info('Post-compaction context restoration starting');
    
    // Get project root
    const projectRoot = data.cwd;
    const claudeDir = join(projectRoot, '.claude');
    
    // Check if there's an active task
    const claudeMdPath = join(projectRoot, 'CLAUDE.md');
    let activeTaskFile = '';
    
    if (existsSync(claudeMdPath)) {
      const claudeMd = readFileSync(claudeMdPath, 'utf-8');
      const taskMatch = claudeMd.match(/@\.claude\/tasks\/(TASK_\d+\.md)/);
      if (taskMatch) {
        activeTaskFile = taskMatch[1];
      }
    }
    
    // First, inject the current CLAUDE.md content so Claude knows what exists
    let claudeMdContent = '';
    if (existsSync(claudeMdPath)) {
      claudeMdContent = readFileSync(claudeMdPath, 'utf-8');
    }
    
    // Parse CLAUDE.md to find all @imports and read them
    const importPattern = /@(\.claude\/[^\s]+)/g;
    const imports = [...claudeMdContent.matchAll(importPattern)];
    
    // Read all imported files
    let importedContent = '';
    for (const match of imports) {
      const importPath = join(projectRoot, match[1]);
      if (existsSync(importPath)) {
        const content = readFileSync(importPath, 'utf-8');
        const fileName = match[1].split('/').pop();
        importedContent += `\n## ${fileName}:\n\`\`\`markdown\n${content}\n\`\`\`\n`;
      }
    }
    
    // Construct instructions for Claude
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
    
    // SessionStart hooks should use hookSpecificOutput for additional context
    const output = {
      continue: true,
      systemMessage: instructions,
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: instructions
      }
    };
    
    console.log(JSON.stringify(output));
    process.exit(0);
    
  } catch (error) {
    console.error(`Error in post_compact hook: ${error}`);
    // Don't block session start on errors
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }
}

main();