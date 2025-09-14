import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getActiveTaskId } from '../lib/claude-md';
import { isHookEnabled } from '../lib/config';
import { ClaudeLogParser } from '../lib/log-parser';
import { createLogger } from '../lib/logger';
import type { HookInput, HookOutput } from '../types';

export interface PreCompactDependencies {
  isHookEnabled?: typeof isHookEnabled;
  logger?: ReturnType<typeof createLogger>;
  getActiveTaskId?: typeof getActiveTaskId;
  logParser?: {
    parse: (options: {
      format?: string;
      limit?: number;
      simplifyResults?: boolean;
      includeTools?: boolean;
    }) => Promise<string[] | string>;
  };
  claudeSDK?: {
    prompt: (
      text: string,
      model: 'haiku' | 'sonnet' | 'opus',
      options?: {
        maxTurns?: number;
        allowedTools?: string[];
        disallowedTools?: string[];
        timeoutMs?: number;
        cwd?: string;
      },
    ) => Promise<{ text: string; success: boolean; error?: string }>;
  };
}

/**
 * Main pre-compact hook function
 * Updates active task file with recent progress from transcript
 */
export async function preCompactHook(input: HookInput, deps: PreCompactDependencies = {}): Promise<HookOutput> {
  const checkEnabled = deps.isHookEnabled || isHookEnabled;
  const log = deps.logger || createLogger('pre_compact');
  const getTaskId = deps.getActiveTaskId || getActiveTaskId;

  try {
    // Check if hook is enabled
    if (!checkEnabled('pre_compact')) {
      return {
        continue: true,
        success: true,
        message: 'Hook disabled',
      };
    }

    log.info('Pre-compact hook started');

    const transcriptPath = input.transcript_path;
    const projectRoot = input.cwd || process.cwd();

    if (!transcriptPath || !existsSync(transcriptPath)) {
      return {
        continue: true,
        success: false,
        message: 'No transcript found',
      };
    }

    // Check for active task
    const taskId = getTaskId(projectRoot);
    if (!taskId) {
      log.info('No active task - skipping task update');
      return {
        continue: true,
        success: true,
        message: 'No active task to update',
      };
    }

    log.info(`Active task found: ${taskId}`);
    const taskFilePath = join(projectRoot, '.claude', 'tasks', `${taskId}.md`);

    // Parse recent transcript messages
    let recentMessages: string;
    try {
      const parser = deps.logParser || new ClaudeLogParser(transcriptPath);
      const parsed = await parser.parse({
        format: 'plaintext',
        limit: 50,
        simplifyResults: true,
        includeTools: false,
      });

      if (!parsed || (Array.isArray(parsed) && parsed.length === 0)) {
        log.warn('No messages found in transcript');
        return {
          continue: true,
          success: true,
          message: 'No messages to analyze',
        };
      }

      recentMessages = Array.isArray(parsed) ? parsed.join('\n') : String(parsed);
      log.info(`Parsed ${Array.isArray(parsed) ? parsed.length : 1} recent messages`);
    } catch (error) {
      log.error('Failed to parse transcript', { error });
      return {
        continue: true,
        success: false,
        message: 'Failed to parse transcript',
      };
    }

    // Prepare prompt for Claude SDK
    const prompt = `You are updating a task file to reflect recent progress based on transcript messages.

TASK FILE PATH: ${taskFilePath}

RECENT TRANSCRIPT (last 50 messages):
${recentMessages}

INSTRUCTIONS:
1. Read the current task file at the path above
2. Analyze the recent transcript to identify progress made on the task
3. Update ONLY the following sections if they exist:
   - "Recent Progress" section - Add bullet points for work completed
   - "Current Focus" section - Update with what's currently being worked on
   - Requirements checklist - Mark items as [x] if completed
   - Success Criteria checklist - Mark items as [x] if achieved

CRITICAL RULES:
- NEVER change the Status field (e.g., from "planning" to "completed")
- ONLY edit the specific task file mentioned above
- Do NOT create new files or edit any other files
- If the task file doesn't exist or can't be read, do nothing
- Focus on factual progress updates based on the transcript
- Keep updates concise and relevant to the task

Begin by reading the task file, then make appropriate updates based on the transcript.`;

    // Call Claude SDK to update the task
    try {
      const claudeSDK = deps.claudeSDK || (await import('../lib/claude-sdk')).ClaudeSDK;

      const response = await claudeSDK.prompt(prompt, 'sonnet', {
        maxTurns: 20, // Allow many turns for thorough investigation
        allowedTools: ['Read', 'Grep', 'Edit'],
        disallowedTools: ['Write', 'MultiEdit', 'Bash', 'TodoWrite'],
        timeoutMs: 120000, // 2 minutes
        cwd: projectRoot,
      });

      if (!response.success) {
        log.warn('Claude SDK failed to update task', { error: response.error });
        return {
          continue: true,
          success: false,
          message: `Failed to update task: ${response.error}`,
        };
      }

      log.debug('Claude response', {
        text: response.text.substring(0, 500), // Log first 500 chars
        fullLength: response.text.length,
      });
      log.info('Task file updated successfully');
      return {
        continue: true,
        success: true,
        message: `Updated task ${taskId} with recent progress`,
      };
    } catch (error) {
      log.error('Error calling Claude SDK', { error });
      return {
        continue: true,
        success: false,
        message: `Claude SDK error: ${error}`,
      };
    }
  } catch (error) {
    log.exception('Error in pre_compact hook', error as Error);
    return {
      continue: true,
      success: false,
      message: `Error: ${error}`,
    };
  }
}
