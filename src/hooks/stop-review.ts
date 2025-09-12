import { execSync } from 'node:child_process';
import { createReadStream, type existsSync, type readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { ClaudeMdHelpers } from '../lib/claude-md';
import { ClaudeSDK as DefaultClaudeSDK } from '../lib/claude-sdk';
import type { ClaudeSDKInterface } from '../lib/git-helpers';
import { isHookEnabled } from '../lib/config';
import { GitHelpers } from '../lib/git-helpers';
import { createLogger } from '../lib/logger';
import type { HookInput, HookOutput } from '../types';

export interface StopReviewDependencies {
  execSync?: typeof execSync;
  fileOps?: {
    existsSync: typeof existsSync;
    readFileSync: typeof readFileSync;
    writeFileSync: typeof writeFileSync;
    createReadStream: typeof createReadStream;
  };
  gitHelpers?: GitHelpers;
  claudeMdHelpers?: ClaudeMdHelpers;
  claudeSDK?: ClaudeSDKInterface & {
    prompt: (text: string, model: 'haiku' | 'sonnet' | 'opus') => Promise<{ text: string; success: boolean; error?: string }>;
  };
  logger?: ReturnType<typeof createLogger>;
  isHookEnabled?: typeof isHookEnabled;
}

export interface ReviewResult {
  status: 'on_track' | 'deviation' | 'needs_verification' | 'critical_failure' | 'review_failed';
  message: string;
  commitMessage: string;
  details?: string;
}

export class SessionReviewer {
  private projectRoot: string;
  private logger: ReturnType<typeof createLogger>;
  private deps: StopReviewDependencies;

  constructor(projectRoot: string, logger: ReturnType<typeof createLogger>, deps: StopReviewDependencies = {}) {
    this.projectRoot = projectRoot;
    this.logger = logger;
    this.deps = deps;
  }

  async review(transcriptPath: string): Promise<ReviewResult> {
    // Get active task
    const activeTask = this.getActiveTask();
    if (!activeTask) {
      // Get filtered git diff for generating a meaningful commit message
      const { fullDiff, filteredDiff, docOnlyChanges } = this.getFilteredGitDiff();

      if (!fullDiff || fullDiff.trim().length === 0) {
        return {
          status: 'on_track',
          message: 'No changes to commit',
          commitMessage: '',
        };
      }

      // Handle documentation-only changes
      if (docOnlyChanges) {
        const taskId = this.getActiveTaskId();
        const commitMessage = taskId ? `docs: update ${taskId} documentation` : 'docs: update project documentation';
        return {
          status: 'on_track',
          message: 'Documentation updates only',
          commitMessage,
        };
      }

      // Generate a meaningful commit message using Haiku (use filtered diff to focus on code)
      let commitMessage: string;
      try {
        const gitHelpers = this.deps.gitHelpers || new GitHelpers();
        const taskId = this.getActiveTaskId();
        commitMessage = await gitHelpers.generateCommitMessage(
          filteredDiff || fullDiff,
          this.projectRoot,
          taskId || undefined,
        );
      } catch {
        // Fallback to generic message if generation fails
        const taskId = this.getActiveTaskId();
        commitMessage = taskId
          ? `wip: ${taskId} exploratory work and improvements`
          : 'chore: exploratory work and improvements';
      }

      return {
        status: 'on_track',
        message: 'No active task - exploratory work',
        commitMessage,
      };
    }

    // Get recent messages from transcript
    const recentMessages = await this.getRecentMessages(transcriptPath);

    // Get filtered git diff
    const { fullDiff, filteredDiff, hasDocChanges, docOnlyChanges } = this.getFilteredGitDiff();

    // If no changes, no need to commit
    if (!fullDiff || fullDiff.trim().length === 0) {
      return {
        status: 'on_track',
        message: 'No changes to commit',
        commitMessage: '',
      };
    }

    // If documentation-only changes with an active task, auto-approve
    if (docOnlyChanges) {
      // Extract task ID for commit message
      const taskIdMatch = activeTask.match(/Task ID:\*\* (\d+)/);
      const taskId = taskIdMatch ? `TASK_${taskIdMatch[1]}` : 'TASK';

      return {
        status: 'on_track',
        message: 'Documentation updates only - auto-approved',
        commitMessage: `docs: update ${taskId} documentation`,
      };
    }

    // If we have code changes (with or without doc changes), review them
    if (!filteredDiff || filteredDiff.trim().length === 0) {
      // This shouldn't happen if docOnlyChanges is false, but handle it anyway
      this.logger.warn('No code changes to review despite docOnlyChanges being false');
      const taskId = this.getActiveTaskId();
      const commitMessage = taskId ? `wip: ${taskId} work in progress` : 'wip: work in progress';
      return {
        status: 'on_track',
        message: 'No code changes to review',
        commitMessage,
      };
    }

    // Prepare review prompt with filtered diff (code changes only)
    try {
      const reviewPrompt = this.buildReviewPrompt(activeTask, recentMessages, filteredDiff, hasDocChanges);

      // Use Claude CLI to review
      const review = await this.callClaudeForReview(reviewPrompt);

      return review;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      this.logger.warn('Review preparation failed', { error: errorMsg });

      // Extract task ID for commit message
      const taskIdMatch = activeTask.match(/Task ID:\*\* (\d+)/);
      const taskId = taskIdMatch ? `TASK_${taskIdMatch[1]}` : 'TASK';

      // Return a review_failed status with a commit message so work is preserved
      return {
        status: 'review_failed',
        message: 'Could not review changes - diff too large or review failed',
        commitMessage: `wip: ${taskId} work in progress - review skipped`,
        details: errorMsg,
      };
    }
  }

  private getActiveTask(): string | null {
    const claudeMdHelpers = this.deps.claudeMdHelpers || new ClaudeMdHelpers();
    return claudeMdHelpers.getActiveTaskContent(this.projectRoot);
  }

  getActiveTaskId(): string | null {
    const claudeMdHelpers = this.deps.claudeMdHelpers || new ClaudeMdHelpers();
    return claudeMdHelpers.getActiveTaskId(this.projectRoot);
  }

  async getRecentMessages(transcriptPath: string, limit: number = 10): Promise<string> {
    const fs = this.deps.fileOps || { createReadStream };
    const messages: string[] = [];

    return new Promise((resolve) => {
      const fileStream = fs.createReadStream(transcriptPath);
      const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      const allMessages: Array<{ message?: { role?: string; content?: unknown } }> = [];

      rl.on('line', (line) => {
        try {
          const entry = JSON.parse(line);
          if (entry.message?.role) {
            allMessages.push(entry);
          }
        } catch (_e) {
          // Skip malformed lines
        }
      });

      rl.on('close', () => {
        // Get last N messages
        const recent = allMessages.slice(-limit);
        for (const entry of recent) {
          if (entry.message?.role === 'user') {
            messages.push(`User: ${this.extractMessageContent(entry.message.content)}`);
          } else if (entry.message?.role === 'assistant') {
            messages.push(`Assistant: ${this.extractMessageContent(entry.message.content)}`);
          }
        }
        resolve(messages.join('\n'));
      });

      rl.on('error', () => {
        resolve('');
      });
    });
  }

  private extractMessageContent(content: unknown): string {
    if (typeof content === 'string') return content.substring(0, 200);
    if (Array.isArray(content)) {
      for (const item of content) {
        if (item.type === 'text' && item.text) {
          return item.text.substring(0, 200);
        }
      }
    }
    return '[complex content]';
  }

  getGitDiff(): string {
    const exec = this.deps.execSync || execSync;
    try {
      // Check for uncommitted changes
      const status = exec('git status --porcelain', {
        encoding: 'utf-8',
        cwd: this.projectRoot,
      });

      if (!status.trim()) {
        return '';
      }

      // Get diff of staged and unstaged changes
      const diff = exec('git diff HEAD', {
        encoding: 'utf-8',
        cwd: this.projectRoot,
        maxBuffer: 1024 * 1024 * 5, // 5MB
      });

      return diff;
    } catch (e) {
      this.logger.error('Error getting git diff', { error: e });
      return '';
    }
  }

  getFilteredGitDiff(): {
    fullDiff: string;
    filteredDiff: string;
    hasDocChanges: boolean;
    docOnlyChanges: boolean;
  } {
    const fullDiff = this.getGitDiff();

    if (!fullDiff) {
      return { fullDiff: '', filteredDiff: '', hasDocChanges: false, docOnlyChanges: false };
    }

    // Parse diff to filter out .md files
    const lines = fullDiff.split('\n');
    const filteredLines: string[] = [];
    let currentFile = '';
    let skipCurrentFile = false;
    let hasDocChanges = false;
    let hasCodeChanges = false;

    for (const line of lines) {
      // Detect file headers in diff format: diff --git a/file b/file
      if (line.startsWith('diff --git')) {
        const fileMatch = line.match(/b\/(.+)$/);
        currentFile = fileMatch ? fileMatch[1] : '';

        // Check if this is a documentation file or private journal file
        skipCurrentFile =
          currentFile.endsWith('.md') ||
          currentFile.endsWith('.markdown') ||
          currentFile.endsWith('.rst') ||
          currentFile.endsWith('.txt') ||
          currentFile.includes('/docs/') ||
          currentFile.includes('README') ||
          currentFile.includes('.private-journal/') ||
          currentFile.endsWith('.embedding');

        if (skipCurrentFile) {
          hasDocChanges = true;
          this.logger.debug(`Filtering out file from review: ${currentFile}`);
        } else {
          hasCodeChanges = true;
        }

        // Don't include the diff header for filtered files
        if (skipCurrentFile) {
          continue;
        }
      }

      // Skip all lines for filtered files
      if (!skipCurrentFile) {
        filteredLines.push(line);
      }
    }

    const result = {
      fullDiff,
      filteredDiff: filteredLines.join('\n'),
      hasDocChanges,
      docOnlyChanges: hasDocChanges && !hasCodeChanges,
    };

    this.logger.debug('Diff filtering results', {
      fullDiffLength: fullDiff.length,
      filteredDiffLength: result.filteredDiff.length,
      hasDocChanges: result.hasDocChanges,
      docOnlyChanges: result.docOnlyChanges,
    });

    return result;
  }

  buildReviewPrompt(task: string, messages: string, diff: string, hasDocChanges: boolean = false): string {
    // Log prompt size for debugging
    const sizes = {
      task: task.length,
      messages: messages.length,
      diff: diff.length,
      total: task.length + messages.length + diff.length,
    };
    this.logger.debug('Building review prompt', sizes);

    // If diff is too large, don't even try
    if (diff.length > 50000) {
      this.logger.warn(`Diff too large for review: ${diff.length} characters`);
      throw new Error(`Diff too large for review: ${diff.length} characters`);
    }

    const docNote = hasDocChanges
      ? '\n\n## Important Note:\nChanges to .md (markdown) documentation files have been filtered out from the diff below and are always acceptable. Focus only on the code changes shown.'
      : '';

    const prompt = `You are reviewing an AI assistant's work on a coding task. Analyze if the work is on track or has deviated.
${docNote}

## Active Task Requirements:
${task.substring(0, 2000)}

## Recent Conversation (last 10 messages):
${messages.substring(0, 2000)}

## Git Diff (code changes only, documentation excluded):
\`\`\`diff
${diff.substring(0, 10000)}
\`\`\`

## Review Categories:
1. **on_track**: Work aligns with task requirements, waiting for user input
2. **deviation**: Work has deviated from requirements (especially if trying to "simplify")
3. **needs_verification**: Claims completion but hasn't tested/verified  
4. **critical_failure**: Broke something important (deleted files, broke build, etc)

## Red Flags to Watch For:
- Any mention of "simplifying" or "simple solution" when stuck
- Claiming things work without testing
- Making changes unrelated to the current task
- Deleting or overwriting important files

## IMPORTANT:
- Documentation updates (.md files) are ALWAYS acceptable and have been filtered out
- Focus only on code changes when determining if work is on track
- Updates to files like learned_mistakes.md, progress_log.md, etc. are normal and expected

CRITICAL: You MUST respond with ONLY a valid JSON object. No other text before or after.
The response MUST be valid JSON that can be parsed with JSON.parse().

Output EXACTLY this format (no markdown, no explanation, just the JSON):
{
  "status": "on_track|deviation|needs_verification|critical_failure",
  "message": "Brief explanation for the user",
  "commitMessage": "Conventional commit message (e.g., 'wip: TASK_XXX work in progress'):",
  "details": "Optional detailed explanation"
}

Example valid response:
{"status":"on_track","message":"Fixed logging bug","commitMessage":"fix: resolve undefined logFile variable","details":"Bug fix for stop hook implementation"}

Be strict about deviations - if the changes don't directly address the task requirements, it's a deviation.
REMEMBER: Output ONLY the JSON object, nothing else!`;

    this.logger.debug(`Final prompt length: ${prompt.length} characters`);

    // Also save the full prompt for inspection if it's huge
    if (prompt.length > 20000) {
      const fs = this.deps.fileOps || { writeFileSync };
      const debugFile = `/tmp/stop_review_prompt_${Date.now()}.txt`;
      fs.writeFileSync(debugFile, prompt);
      this.logger.info(`Large prompt saved to: ${debugFile}`);
    }

    return prompt;
  }

  async callClaudeForReview(prompt: string): Promise<ReviewResult> {
    const claudeSDK = this.deps.claudeSDK || DefaultClaudeSDK;
    
    try {
      // Use SDK to call Claude - no temp files needed!
      const response = await claudeSDK.prompt(prompt, 'sonnet');

      if (!response.success) {
        throw new Error(response.error || 'SDK call failed');
      }

      // Log the raw response for debugging
      this.logger.debug(`Claude raw response: ${response.text.substring(0, 500)}`);

      let result = JSON.parse(response.text);

      // Handle Claude CLI wrapper format
      if (result.type === 'result' && result.result) {
        // The actual content is in result.result, need to parse that too
        this.logger.debug('Unwrapping Claude CLI result field');

        // The result field contains the actual JSON response as a string
        const innerContent = result.result;

        // Try to extract JSON from the response (in case there's extra text)
        const jsonMatch = innerContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]);
            this.logger.debug('Successfully extracted JSON from response');
          } catch (_e) {
            this.logger.error(`Failed to parse extracted JSON: ${jsonMatch[0].substring(0, 200)}`);
            throw new Error('Could not parse JSON from Claude response');
          }
        } else {
          this.logger.error(`No JSON found in response: ${innerContent.substring(0, 200)}`);
          throw new Error('Claude did not return JSON despite explicit instructions');
        }
      }

      // Check if the response has the expected structure
      if (!result.status || !result.message) {
        this.logger.warn(`Invalid response structure: ${JSON.stringify(result).substring(0, 200)}`);
      }

      return result as ReviewResult;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      this.logger.error('Claude review failed', { error: errorMsg });
      // Return review failure status
      const taskId = this.getActiveTaskId();
      const commitMessage = taskId
        ? `wip: ${taskId} work in progress - review failed`
        : 'wip: work in progress - review failed';
      return {
        status: 'review_failed',
        message: 'Could not review changes',
        commitMessage,
        details: `Claude CLI error: ${errorMsg}`,
      };
    }
  }

  async commitChanges(message: string): Promise<boolean> {
    const exec = this.deps.execSync || execSync;
    try {
      // Stage all changes
      exec('git add -A', { cwd: this.projectRoot });

      // Commit with the message
      exec(`git commit -m "${message}"`, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      });

      return true;
    } catch (e) {
      this.logger.error('Git commit failed', { error: e });
      return false;
    }
  }

  checkRecentNonTaskCommits(): number {
    const exec = this.deps.execSync || execSync;
    try {
      // Get recent commit messages (last 10)
      const recentCommits = exec('git log --oneline -10', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      }).trim();

      if (!recentCommits) return 0;

      // Count consecutive non-task commits from most recent
      const commits = recentCommits.split('\n');
      let count = 0;

      for (const commit of commits) {
        if (!commit.includes('TASK_')) {
          count++;
        } else {
          // Stop counting when we hit a task commit
          break;
        }
      }

      return count;
    } catch {
      return 0;
    }
  }
}

/**
 * Check if in a git repository
 */
export function isGitRepository(projectRoot: string, exec: typeof execSync = execSync): boolean {
  try {
    exec('git rev-parse --git-dir', { cwd: projectRoot });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate stop hook output based on review
 */
export function generateStopOutput(
  review: ReviewResult,
  inStopHook: boolean,
  nonTaskSuggestion: string | null,
): HookOutput {
  const output: HookOutput = {};

  // If already in a stop hook, always allow stop regardless of review
  if (inStopHook) {
    output.continue = true;
    output.systemMessage = `📝 Review: ${review.message}`;
    if (review.details) {
      output.systemMessage += `\n\nDetails: ${review.details}`;
    }
    if (nonTaskSuggestion) {
      output.systemMessage += `\n\n${nonTaskSuggestion}`;
    }
    return output;
  }

  // Provide feedback based on status
  switch (review.status) {
    case 'on_track':
      // Allow stop - work is good
      output.continue = true;
      output.systemMessage = `🛤️ Project is on track. ${review.message}`;
      if (review.details) {
        output.systemMessage += `\n\nDetails: ${review.details}`;
      }
      if (nonTaskSuggestion) {
        output.systemMessage += `\n\n${nonTaskSuggestion}`;
      }
      break;

    case 'deviation':
      // Block stop - needs correction
      output.decision = 'block';
      output.reason = `Deviation detected: ${review.message}. Please fix the issues and align with the task requirements.`;
      output.systemMessage = `⚠️ DEVIATION DETECTED: ${review.message}`;
      if (review.details) {
        output.systemMessage += `\n\nDetails: ${review.details}`;
      }
      break;

    case 'needs_verification':
      // Block stop - needs testing
      output.decision = 'block';
      output.reason = `Verification needed: ${review.message}. Please test your changes before proceeding.`;
      output.systemMessage = `🔍 VERIFICATION NEEDED: ${review.message}`;
      if (review.details) {
        output.systemMessage += `\n\nDetails: ${review.details}`;
      }
      break;

    case 'critical_failure':
      // Allow stop - too dangerous to continue
      output.continue = true;
      output.systemMessage = `🚨 CRITICAL ISSUE: ${review.message}\n\nWork has been stopped. Please review the changes.`;
      if (review.details) {
        output.systemMessage += `\n\nDetails: ${review.details}`;
      }
      break;

    case 'review_failed':
      // Allow stop but indicate review system failure
      output.continue = true;
      output.systemMessage = `⚠️ REVIEW SYSTEM ERROR: ${review.message}`;
      if (review.details) {
        output.systemMessage += `\n\n${review.details}`;
      }
      break;

    default:
      // Unexpected status - allow stop
      output.continue = true;
      output.systemMessage = `⚠️ Unexpected review status: ${review.status} - ${review.message}`;
      break;
  }

  return output;
}

/**
 * Main stop review hook function
 */
export async function stopReviewHook(input: HookInput, deps: StopReviewDependencies = {}): Promise<HookOutput> {
  const logger = deps.logger || createLogger('stop_review');
  const exec = deps.execSync || execSync;
  const checkEnabled = deps.isHookEnabled || isHookEnabled;

  // Check if hook is enabled
  if (!checkEnabled('stop_review')) {
    return { continue: true };
  }

  logger.info('=== HOOK STARTED ===');
  logger.debug('Session info', {
    session_id: input.session_id,
    stop_hook_active: input.stop_hook_active,
  });

  // If already in a stop hook, still do review/commit but always allow stop
  const inStopHook = Boolean(input.stop_hook_active) || false;

  // Get project root
  const projectRoot = input.cwd || process.cwd();

  // Check if git repo
  if (!isGitRepository(projectRoot, exec)) {
    return {
      success: true,
      message: 'Not a git repository - skipping auto-commit',
    };
  }

  // Add any untracked files first
  try {
    const untrackedFiles = exec('git ls-files --others --exclude-standard', {
      encoding: 'utf-8',
      cwd: projectRoot,
    }).trim();

    if (untrackedFiles) {
      const files = untrackedFiles.split('\n').filter((f) => f.length > 0);
      logger.debug('Adding untracked files', { count: files.length });

      // Add each untracked file
      for (const file of files) {
        try {
          exec(`git add "${file}"`, {
            encoding: 'utf-8',
            cwd: projectRoot,
          });
        } catch (e) {
          logger.warn('Failed to add file', { file, error: e });
        }
      }
    }
  } catch (e) {
    logger.warn('Failed to check for untracked files', { error: e });
  }

  // Quick check for changes after adding untracked files
  try {
    const status = exec('git status --porcelain', { cwd: projectRoot }).toString().trim();
    if (!status) {
      logger.info('No changes detected, exiting early');
      return {
        continue: true,
        systemMessage: '✅ No changes to commit',
      };
    }
  } catch {
    logger.info('Failed to check git status, exiting early');
    return {
      continue: true,
      systemMessage: '✅ No changes to commit',
    };
  }

  try {
    // Review the session
    const reviewer = new SessionReviewer(projectRoot, logger, deps);
    const review = await reviewer.review(input.transcript_path || '');

    // Handle commit if needed
    let nonTaskSuggestion: string | null = null;
    if (review.commitMessage) {
      const committed = await reviewer.commitChanges(review.commitMessage);
      if (committed) {
        logger.info(`Auto-committed: ${review.commitMessage}`);

        // Only suggest creating a task if there's NO active task
        // Check if this was a non-task commit and check recent history
        const activeTaskId = reviewer.getActiveTaskId();
        if (!activeTaskId && !review.commitMessage.includes('TASK_')) {
          const nonTaskCount = reviewer.checkRecentNonTaskCommits();
          // We just made a commit, so if there were 2+ before, we now have 3+
          if (nonTaskCount >= 2) {
            nonTaskSuggestion = `💡 I notice you've made ${nonTaskCount + 1} commits without an active task. Consider using planning mode (shift-tab) to create a task for better tracking.`;
          }
        }
      }
    }

    // Generate output based on review
    const output = generateStopOutput(review, inStopHook, nonTaskSuggestion);

    logger.info('Review complete', { status: review.status, message: review.message });
    logger.debug('Sending output', { output_preview: JSON.stringify(output).substring(0, 100) });

    return output;
  } catch (error) {
    logger.exception('Error in stop_review hook', error as Error);
    // Don't block on errors
    return { success: true };
  }
}
