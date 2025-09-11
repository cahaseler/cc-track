import { execSync as nodeExecSync } from 'node:child_process';
import { unlinkSync, writeFileSync } from 'node:fs';

// Interface for dependency injection
export interface ExecFunction {
  (command: string, options?: any): string;
}

export interface FileOps {
  writeFileSync: typeof writeFileSync;
  unlinkSync: typeof unlinkSync;
}

const defaultExec: ExecFunction = (command, options) => {
  return nodeExecSync(command, { encoding: 'utf-8', ...options });
};

const defaultFileOps: FileOps = {
  writeFileSync,
  unlinkSync,
};

export class GitHelpers {
  private exec: ExecFunction;
  private fileOps: FileOps;

  constructor(exec?: ExecFunction, fileOps?: FileOps) {
    this.exec = exec || defaultExec;
    this.fileOps = fileOps || defaultFileOps;
  }

  /**
   * Get the default branch name (main or master)
   */
  getDefaultBranch(cwd: string): string {
    try {
      // Try to get the default branch from git config
      const defaultBranch = this.exec(
        'git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed "s@^refs/remotes/origin/@@"',
        {
          cwd,
          shell: '/bin/bash',
        },
      ).trim();

      if (defaultBranch) {
        return defaultBranch;
      }
    } catch {
      // Fall through to check local branches
    }

    try {
      // Check if main exists
      this.exec('git show-ref --verify --quiet refs/heads/main', { cwd });
      return 'main';
    } catch {
      // Fall through to master
    }

    try {
      // Check if master exists
      this.exec('git show-ref --verify --quiet refs/heads/master', { cwd });
      return 'master';
    } catch {
      // Default to main if neither exists
      return 'main';
    }
  }

  /**
   * Check if there are uncommitted changes
   */
  hasUncommittedChanges(cwd: string): boolean {
    try {
      const status = this.exec('git status --porcelain', { cwd }).trim();
      return status.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Generate a commit message using Claude CLI Haiku
   */
  async generateCommitMessage(diff: string, _cwd: string): Promise<string> {
    // Truncate diff if too long (Haiku has smaller context)
    const truncatedDiff = diff.substring(0, 3000);

    const prompt = `CRITICAL: Return ONLY a git commit message, nothing else. No explanation, no markdown, just the message.
Based on these changes, write a concise commit message (max 50 chars first line):

${truncatedDiff}

Format: type: description
Types: feat, fix, docs, style, refactor, test, chore
Example: feat: add user authentication
RETURN ONLY THE COMMIT MESSAGE`;

    try {
      // Write prompt to temp file to avoid shell escaping issues
      const tempFile = `/tmp/commit_prompt_${Date.now()}.txt`;
      this.fileOps.writeFileSync(tempFile, prompt);

      const message = this.exec(`claude --model haiku --output-format text < "${tempFile}"`, {
        timeout: 30000,
        cwd: '/tmp', // Run from /tmp to avoid triggering hooks
      }).trim();

      // Clean up temp file
      this.fileOps.unlinkSync(tempFile);

      // Extract just the commit message if Claude added any wrapper text
      // Look for a line that starts with a commit type
      const lines = message.split('\n');
      for (const line of lines) {
        if (line.match(/^(feat|fix|docs|style|refactor|test|chore):/)) {
          return line;
        }
      }

      // If no proper format found, use a fallback
      return 'chore: save work in progress';
    } catch (error) {
      console.error('Failed to generate commit message:', error);
      return 'chore: save work in progress';
    }
  }

  /**
   * Generate a branch name using Claude CLI Haiku
   */
  async generateBranchName(plan: string, taskId: string, _cwd: string): Promise<string> {
    // Extract key parts of the plan
    const planSummary = plan.substring(0, 1500);

    const prompt = `CRITICAL: Return ONLY a git branch name, nothing else. No explanation, no markdown, just the name.
Based on this plan, generate a git branch name:

${planSummary}

Task ID: ${taskId}

Format: feature/short-description OR bug/short-description
Use lowercase, hyphens, max 4 words after type
Examples: feature/add-auth, bug/fix-login, feature/user-dashboard
RETURN ONLY THE BRANCH NAME`;

    try {
      // Write prompt to temp file to avoid shell escaping issues
      const tempFile = `/tmp/branch_prompt_${Date.now()}.txt`;
      this.fileOps.writeFileSync(tempFile, prompt);

      const branchName = this.exec(`claude --model haiku --output-format text < "${tempFile}"`, {
        timeout: 30000,
        cwd: '/tmp', // Run from /tmp to avoid triggering hooks
      }).trim();

      // Clean up temp file
      this.fileOps.unlinkSync(tempFile);

      // Extract just the branch name if Claude added any wrapper text
      const lines = branchName.split('\n');
      for (const line of lines) {
        if (line.match(/^(feature|bug)\//)) {
          // Add task ID to make it unique
          return `${line}-${taskId.toLowerCase()}`;
        }
      }

      // Fallback to a generic name with task ID
      return `feature/task-${taskId.toLowerCase()}`;
    } catch (error) {
      console.error('Failed to generate branch name:', error);
      // Fallback to a generic name with task ID
      return `feature/task-${taskId.toLowerCase()}`;
    }
  }

  /**
   * Create and switch to a new branch
   */
  createTaskBranch(branchName: string, cwd: string): void {
    try {
      // Create and switch to the new branch
      this.exec(`git checkout -b ${branchName}`, { cwd });
      console.log(`Created and switched to branch: ${branchName}`);
    } catch (error) {
      console.error(`Failed to create branch ${branchName}:`, error);
      throw error;
    }
  }

  /**
   * Merge a task branch back to the default branch
   */
  mergeTaskBranch(branchName: string, defaultBranch: string, cwd: string): void {
    try {
      // Switch to default branch
      this.exec(`git checkout ${defaultBranch}`, { cwd });

      // Merge the task branch
      this.exec(`git merge ${branchName} --no-ff -m "Merge branch '${branchName}'"`, { cwd });

      console.log(`Merged ${branchName} into ${defaultBranch}`);
      // Note: Not deleting the branch per user request
    } catch (error) {
      console.error(`Failed to merge branch ${branchName}:`, error);
      throw error;
    }
  }

  /**
   * Get the current branch name
   */
  getCurrentBranch(cwd: string): string {
    try {
      return this.exec('git branch --show-current', { cwd }).trim();
    } catch {
      return '';
    }
  }

  /**
   * Switch to a branch
   */
  switchToBranch(branchName: string, cwd: string): void {
    try {
      this.exec(`git checkout ${branchName}`, { cwd });
      console.log(`Switched to branch: ${branchName}`);
    } catch (error) {
      console.error(`Failed to switch to branch ${branchName}:`, error);
      throw error;
    }
  }
}

// Create a default instance for backward compatibility
const defaultGitHelpers = new GitHelpers();

// Export standalone functions that use the default instance
export function getDefaultBranch(cwd: string): string {
  return defaultGitHelpers.getDefaultBranch(cwd);
}

export function hasUncommittedChanges(cwd: string): boolean {
  return defaultGitHelpers.hasUncommittedChanges(cwd);
}

export async function generateCommitMessage(diff: string, cwd: string): Promise<string> {
  return defaultGitHelpers.generateCommitMessage(diff, cwd);
}

export async function generateBranchName(plan: string, taskId: string, cwd: string): Promise<string> {
  return defaultGitHelpers.generateBranchName(plan, taskId, cwd);
}

export function createTaskBranch(branchName: string, cwd: string): void {
  return defaultGitHelpers.createTaskBranch(branchName, cwd);
}

export function mergeTaskBranch(branchName: string, defaultBranch: string, cwd: string): void {
  return defaultGitHelpers.mergeTaskBranch(branchName, defaultBranch, cwd);
}

export function getCurrentBranch(cwd: string): string {
  return defaultGitHelpers.getCurrentBranch(cwd);
}

export function switchToBranch(branchName: string, cwd: string): void {
  return defaultGitHelpers.switchToBranch(branchName, cwd);
}