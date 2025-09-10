#!/usr/bin/env bun

import { readFileSync, existsSync, writeFileSync, unlinkSync, appendFileSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { createReadStream } from 'fs';
import { isHookEnabled } from '../.claude/lib/config';
import { generateCommitMessage } from '../.claude/lib/git-helpers';

interface StopInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: string;
  stop_hook_active?: boolean;
}

interface HookOutput {
  success: boolean;
  message?: string;
  systemMessage?: string;
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
  
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.claudeDir = join(projectRoot, '.claude');
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
          commitMessage: ''
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
        commitMessage
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
        commitMessage: ''
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
        crlfDelay: Infinity
      });
      
      const allMessages: any[] = [];
      
      rl.on('line', (line) => {
        try {
          const entry = JSON.parse(line);
          if (entry.message && entry.message.role) {
            allMessages.push(entry);
          }
        } catch (e) {
          // Skip malformed lines
        }
      });
      
      rl.on('close', () => {
        // Get last N messages
        const recent = allMessages.slice(-limit);
        for (const entry of recent) {
          if (entry.message.role === 'user') {
            messages.push(`User: ${this.extractMessageContent(entry.message.content)}`);
          } else if (entry.message.role === 'assistant') {
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
  
  private extractMessageContent(content: any): string {
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
        cwd: this.projectRoot 
      });
      
      if (!status.trim()) {
        return '';
      }
      
      // Get diff of staged and unstaged changes
      const diff = execSync('git diff HEAD', { 
        encoding: 'utf-8',
        cwd: this.projectRoot,
        maxBuffer: 1024 * 1024 * 5 // 5MB
      });
      
      return diff;
    } catch (e) {
      console.error('Error getting git diff:', e);
      return '';
    }
  }
  
  private buildReviewPrompt(task: string, messages: string, diff: string): string {
    // Log prompt size for debugging
    const logFile = '/tmp/stop_review_debug.log';
    const sizes = {
      task: task.length,
      messages: messages.length,
      diff: diff.length,
      total: task.length + messages.length + diff.length
    };
    const logMsg = `[${new Date().toISOString()}] Prompt sizes: task=${sizes.task}, messages=${sizes.messages}, diff=${sizes.diff}, total=${sizes.total}\n`;
    appendFileSync(logFile, logMsg);
    
    // If diff is too large, don't even try
    if (diff.length > 50000) {
      appendFileSync(logFile, `[${new Date().toISOString()}] Diff too large (${diff.length} chars), skipping review\n`);
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
    
    appendFileSync(logFile, `[${new Date().toISOString()}] Final prompt length: ${prompt.length} characters\n`);
    
    // Also save the full prompt for inspection if it's huge
    if (prompt.length > 20000) {
      const debugFile = `/tmp/stop_review_prompt_${Date.now()}.txt`;
      writeFileSync(debugFile, prompt);
      appendFileSync(logFile, `[${new Date().toISOString()}] Large prompt saved to: ${debugFile}\n`);
    }
    
    return prompt;
  }
  
  private async callClaudeForReview(prompt: string): Promise<ReviewResult> {
    const logFile = '/tmp/stop_review_debug.log';
    try {
      const tempFile = `/tmp/stop_review_${Date.now()}.txt`;
      writeFileSync(tempFile, prompt);
      
      const response = execSync(
        `claude --model sonnet --output-format json < "${tempFile}"`,
        { 
          encoding: 'utf-8',
          timeout: 120000,  // 2 minutes - plenty of time for Claude to think
          shell: '/bin/bash',
          cwd: '/tmp'  // Run in /tmp to avoid triggering our own Stop hook!
        }
      ).trim();
      
      // Clean up temp file
      if (existsSync(tempFile)) {
        unlinkSync(tempFile);
      }
      
      // Log the raw response for debugging
      appendFileSync(logFile, `[${new Date().toISOString()}] Claude raw response: ${response.substring(0, 500)}\n`);
      
      let result = JSON.parse(response);
      
      // Handle Claude CLI wrapper format
      if (result.type === 'result' && result.result) {
        // The actual content is in result.result, need to parse that too
        appendFileSync(logFile, `[${new Date().toISOString()}] Unwrapping Claude CLI result field\n`);
        
        // The result field contains the actual JSON response as a string
        const innerContent = result.result;
        
        // Try to extract JSON from the response (in case there's extra text)
        const jsonMatch = innerContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]);
            appendFileSync(logFile, `[${new Date().toISOString()}] Successfully extracted JSON from response\n`);
          } catch (e) {
            appendFileSync(logFile, `[${new Date().toISOString()}] ERROR: Failed to parse extracted JSON: ${jsonMatch[0].substring(0, 200)}\n`);
            throw new Error('Could not parse JSON from Claude response');
          }
        } else {
          appendFileSync(logFile, `[${new Date().toISOString()}] ERROR: No JSON found in response: ${innerContent.substring(0, 200)}\n`);
          throw new Error('Claude did not return JSON despite explicit instructions');
        }
      }
      
      // Check if the response has the expected structure
      if (!result.status || !result.message) {
        appendFileSync(logFile, `[${new Date().toISOString()}] WARNING: Invalid response structure: ${JSON.stringify(result).substring(0, 200)}\n`);
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
        details: `Claude CLI error: ${errorMsg}`
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
        encoding: 'utf-8'
      });
      
      return true;
    } catch (e) {
      console.error('Git commit failed:', e);
      return false;
    }
  }
  
  private checkRecentNonTaskCommits(): number {
    try {
      // Get last 10 commits
      const commits = execSync('git log --oneline -10', { 
        encoding: 'utf-8',
        cwd: this.projectRoot 
      }).split('\n').filter(line => line.trim());
      
      // Count consecutive commits without task reference from most recent
      let nonTaskCount = 0;
      for (const commit of commits) {
        if (commit.includes('TASK_')) {
          break; // Found a task commit, stop counting
        }
        nonTaskCount++;
      }
      
      return nonTaskCount;
    } catch {
      return 0;
    }
  }
}

async function main() {
  const logFile = '/tmp/stop_review_debug.log';
  
  try {
    // Check if hook is enabled
    if (!isHookEnabled('stop_review')) {
      // Silent exit
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }
    
    appendFileSync(logFile, `[${new Date().toISOString()}] === HOOK STARTED ===\n`);
    
    const input = await Bun.stdin.text();
    const data: StopInput = JSON.parse(input);
    
    appendFileSync(logFile, `[${new Date().toISOString()}] Session: ${data.session_id}, stop_hook_active: ${data.stop_hook_active}\n`);
    
    // If already in a stop hook, still do review/commit but always allow stop
    const inStopHook = data.stop_hook_active;
    
    // Get project root
    const projectRoot = data.cwd;
    
    // Check if git repo
    try {
      execSync('git rev-parse --git-dir', { cwd: projectRoot });
    } catch {
      // Not a git repo, skip
      console.log(JSON.stringify({ 
        success: true, 
        message: 'Not a git repository - skipping auto-commit' 
      }));
      process.exit(0);
    }
    
    // Quick check for changes before doing any review
    try {
      const status = execSync('git status --porcelain', { 
        encoding: 'utf-8',
        cwd: projectRoot 
      });
      
      if (!status.trim()) {
        // No changes, skip everything
        appendFileSync(logFile, `[${new Date().toISOString()}] No changes detected, exiting early\n`);
        const output = { 
          continue: true,
          systemMessage: '✅ No changes to commit' 
        };
        appendFileSync(logFile, `[${new Date().toISOString()}] Sending output: ${JSON.stringify(output)}\n`);
        console.log(JSON.stringify(output));
        process.exit(0);
      }
    } catch {
      // If git status fails, continue with review
    }
    
    // Review the session
    const reviewer = new SessionReviewer(projectRoot);
    const review = await reviewer.review(data.transcript_path);
    
    // Handle based on review status
    let output: any = {};
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
    appendFileSync(logFile, `[${new Date().toISOString()}] Review status: ${review.status}, message: ${review.message}\n`);
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
        output.decision = "block";
        output.reason = `Deviation detected: ${review.message}. Please fix the issues and align with the task requirements.`;
        output.systemMessage = `⚠️ DEVIATION DETECTED: ${review.message}`;
        if (review.details) {
          output.systemMessage += `\n\nDetails: ${review.details}`;
        }
        break;
        
      case 'needs_verification':
        // Block stop - needs testing
        output.decision = "block";
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
        appendFileSync(logFile, `[${new Date().toISOString()}] WARNING: Unexpected review status: ${review.status}\n`);
        output.continue = true;
        output.systemMessage = `⚠️ Unexpected review status: ${review.status} - ${review.message}`;
        break;
    }
    
    appendFileSync(logFile, `[${new Date().toISOString()}] Sending output: ${JSON.stringify(output).substring(0, 100)}\n`);
    console.log(JSON.stringify(output));
    process.exit(0);
    
  } catch (error) {
    appendFileSync(logFile, `[${new Date().toISOString()}] ERROR: ${error}\n`);
    console.error(`Error in stop_review hook: ${error}`);
    // Don't block on errors
    console.log(JSON.stringify({ success: true }));
    process.exit(0);
  }
}

main();