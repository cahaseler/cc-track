#!/usr/bin/env bun

import { execSync } from 'node:child_process';
import { createReadStream, existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { isHookEnabled } from '../lib/config';
import { generateCommitMessage } from '../lib/git-helpers';
import { createLogger } from '../lib/logger';

interface StopInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: string;
  stop_hook_active?: boolean;
}

interface ReviewResult {
  status: 'on_track' | 'deviation' | 'needs_verification' | 'critical_failure' | 'review_failed';
  message: string;
  commitMessage: string;
  details?: string;
}

class SessionReviewer {
  private projectRoot: string;
  private claudeDir: string;
  private logger;

  constructor(projectRoot: string, logger: ReturnType<typeof createLogger>) {
    this.projectRoot = projectRoot;
    this.claudeDir = join(projectRoot, '.claude');
    this.logger = logger;
  }

  async review(transcriptPath: string): Promise<ReviewResult> {
    // Get active task
    const activeTask = this.getActiveTask();
    if (!activeTask) {
      // Get git diff for generating a meaningful commit message
      const gitDiff = this.getGitDiff();

      if (!gitDiff || gitDiff.trim().length === 0) {
        return {
          status: 'on_track',
          message: 'No changes to commit',
          commitMessage: '',
        };
      }

      // Generate a meaningful commit message using Haiku
      let commitMessage: string;
      try {
        commitMessage = await generateCommitMessage(gitDiff, this.projectRoot);
      } catch {
        // Fallback to generic message if generation fails
        commitMessage = 'chore: exploratory work and improvements';
      }

      return {
        status: 'on_track',
        message: 'No active task - exploratory work',
        commitMessage,
      };
    }

    // Get recent messages from transcript
    const recentMessages = await this.getRecentMessages(transcriptPath);

    // Get git diff since last commit
    const gitDiff = this.getGitDiff();

    // If no changes, no need to commit
    if (!gitDiff || gitDiff.trim().length === 0) {
      return {
        status: 'on_track',
        message: 'No changes to commit',
        commitMessage: '',
      };
    }

    // Prepare review prompt
    const reviewPrompt = this.buildReviewPrompt(activeTask, recentMessages, gitDiff);

    // Use Claude CLI to review
    const review = await this.callClaudeForReview(reviewPrompt);

    return review;
  }

  private getActiveTask(): string | null {
    const claudeMdPath = join(this.projectRoot, 'CLAUDE.md');
    if (!existsSync(claudeMdPath)) return null;

    const content = readFileSync(claudeMdPath, 'utf-8');
    const taskMatch = content.match(/@\.claude\/tasks\/(TASK_\d+\.md)/);
    if (!taskMatch) return null;

    const taskPath = join(this.claudeDir, 'tasks', taskMatch[1]);
    if (!existsSync(taskPath)) return null;

    return readFileSync(taskPath, 'utf-8');
  }

  private async getRecentMessages(transcriptPath: string, limit: number = 10): Promise<string> {
    const messages: string[] = [];

    return new Promise((resolve) => {
      const fileStream = createReadStream(transcriptPath);
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

  private getGitDiff(): string {
    try {
      // Check for uncommitted changes
      const status = execSync('git status --porcelain', {
        encoding: 'utf-8',
        cwd: this.projectRoot,
      });

      if (!status.trim()) {
        return '';
      }

      // Get diff of staged and unstaged changes
      const diff = execSync('git diff HEAD', {
        encoding: 'utf-8',
        cwd: this.projectRoot,
        maxBuffer: 1024 * 1024 * 5, // 5MB
      });

      return diff;
    } catch (e) {
      console.error('Error getting git diff:', e);
      return '';
    }
  }

  private buildReviewPrompt(task: string, messages: string, diff: string): string {
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

    const prompt = `You are reviewing an AI assistant's work on a coding task. Analyze if the work is on track or has deviated.

## Active Task Requirements:
${task.substring(0, 2000)}

## Recent Conversation (last 10 messages):
${messages.substring(0, 2000)}

## Git Diff (changes made):
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

CRITICAL: You MUST respond with ONLY a valid JSON object. No other text before or after.
The response MUST be valid JSON that can be parsed with JSON.parse().

Output EXACTLY this format (no markdown, no explanation, just the JSON):
{
  "status": "on_track|deviation|needs_verification|critical_failure",
  "message": "Brief explanation for the user",
  "commitMessage": "Git commit message starting with [wip] TASK_XXX:",
  "details": "Optional detailed explanation"
}

Example valid response:
{"status":"on_track","message":"Fixed logging bug","commitMessage":"[wip] TASK_003: Fixed undefined logFile variable","details":"Bug fix for stop hook implementation"}

Be strict about deviations - if the changes don't directly address the task requirements, it's a deviation.
REMEMBER: Output ONLY the JSON object, nothing else!`;

    this.logger.debug(`Final prompt length: ${prompt.length} characters`);

    // Also save the full prompt for inspection if it's huge
    if (prompt.length > 20000) {
      const debugFile = `/tmp/stop_review_prompt_${Date.now()}.txt`;
      writeFileSync(debugFile, prompt);
      this.logger.info(`Large prompt saved to: ${debugFile}`);
    }

    return prompt;
  }

  private async callClaudeForReview(prompt: string): Promise<ReviewResult> {
    try {
      const tempFile = `/tmp/stop_review_${Date.now()}.txt`;
      writeFileSync(tempFile, prompt);

      const response = execSync(`claude --model sonnet --output-format json < "${tempFile}"`, {
        encoding: 'utf-8',
        timeout: 120000, // 2 minutes - plenty of time for Claude to think
        shell: '/bin/bash',
        cwd: '/tmp', // Run in /tmp to avoid triggering our own Stop hook!
      }).trim();

      // Clean up temp file
      if (existsSync(tempFile)) {
        unlinkSync(tempFile);
      }

      // Log the raw response for debugging
      this.logger.debug(`Claude raw response: ${response.substring(0, 500)}`);

      let result = JSON.parse(response);

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
      console.error('Claude review failed:', errorMsg);
      // Return review failure status
      return {
        status: 'review_failed',
        message: 'Could not review changes',
        commitMessage: '[wip] Work in progress - review failed',
        details: `Claude CLI error: ${errorMsg}`,
      };
    }
  }

  async commitChanges(message: string): Promise<boolean> {
    try {
      // Stage all changes
      execSync('git add -A', { cwd: this.projectRoot });

      // Commit with the message
      execSync(`git commit -m "${message}"`, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      });

      return true;
    } catch (e) {
      console.error('Git commit failed:', e);
      return false;
    }
  }

  checkRecentNonTaskCommits(): number {
    try {
      // Get recent commit messages (last 10)
      const recentCommits = execSync('git log --oneline -10', {
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

async function main() {
  const logger = createLogger('stop_review');

  try {
    // Check if hook is enabled
    if (!isHookEnabled('stop_review')) {
      // Silent exit
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    logger.info('=== HOOK STARTED ===');

    const input = await Bun.stdin.text();
    const data: StopInput = JSON.parse(input);

    logger.debug('Session info', {
      session_id: data.session_id,
      stop_hook_active: data.stop_hook_active,
    });

    // If already in a stop hook, still do review/commit but always allow stop
    const inStopHook = data.stop_hook_active;

    // Get project root
    const projectRoot = data.cwd;

    // Check if git repo
    try {
      execSync('git rev-parse --git-dir', { cwd: projectRoot });
    } catch {
      // Not a git repo, skip
      console.log(
        JSON.stringify({
          success: true,
          message: 'Not a git repository - skipping auto-commit',
        }),
      );
      process.exit(0);
    }

    // Quick check for changes before doing any review
    try {
      const status = execSync('git status --porcelain', {
        encoding: 'utf-8',
        cwd: projectRoot,
      });

      if (!status.trim()) {
        // No changes, skip everything
        logger.info('No changes detected, exiting early');
        const output = {
          continue: true,
          systemMessage: '✅ No changes to commit',
        };
        logger.debug('Sending output', output);
        console.log(JSON.stringify(output));
        process.exit(0);
      }
    } catch {
      // If git status fails, continue with review
    }

    // Review the session
    const reviewer = new SessionReviewer(projectRoot, logger);
    const review = await reviewer.review(data.transcript_path);

    // Handle based on review status
    const output: { continue?: boolean; decision?: string; reason?: string; systemMessage?: string } = {};
    let nonTaskSuggestion: string | null = null;

    if (review.commitMessage) {
      // Commit the changes
      const committed = await reviewer.commitChanges(review.commitMessage);
      if (committed) {
        console.error(`Auto-committed: ${review.commitMessage}`);

        // Check if this was a non-task commit and check recent history
        if (!review.commitMessage.includes('TASK_')) {
          const nonTaskCount = reviewer.checkRecentNonTaskCommits();
          // We just made a commit, so if there were 2+ before, we now have 3+
          if (nonTaskCount >= 2) {
            nonTaskSuggestion = `💡 I notice you've made ${nonTaskCount + 1} commits without an active task. Consider using planning mode (shift-tab) to create a task for better tracking.`;
          }
        }
      }
    }

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
      console.log(JSON.stringify(output));
      process.exit(0);
    }

    // Provide feedback based on status
    logger.info('Review complete', { status: review.status, message: review.message });
    switch (review.status) {
      case 'on_track':
        // Allow stop - work is good
        output.continue = true;
        output.systemMessage = `✅ Work appears on track. ${review.message}`;
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
        // Unexpected status - log it and allow stop
        logger.warn(`Unexpected review status: ${review.status}`);
        output.continue = true;
        output.systemMessage = `⚠️ Unexpected review status: ${review.status} - ${review.message}`;
        break;
    }

    logger.debug('Sending output', { output_preview: JSON.stringify(output).substring(0, 100) });
    console.log(JSON.stringify(output));
    process.exit(0);
  } catch (error) {
    logger.exception('Error in stop_review hook', error as Error);
    // Don't block on errors
    console.log(JSON.stringify({ success: true }));
    process.exit(0);
  }
}

main();
