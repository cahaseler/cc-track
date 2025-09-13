import { execSync as nodeExecSync } from 'node:child_process';
import { getGitConfig as defaultGetGitConfig } from './config';

// Interface for dependency injection
export type ExecFunction = (
  command: string,
  options?: { cwd?: string; encoding?: BufferEncoding; timeout?: number; shell?: string },
) => string;

export type GetGitConfigFunction = typeof defaultGetGitConfig;

// SDK interface for dependency injection
export interface ClaudeSDKInterface {
  generateCommitMessage(changes: string): Promise<string>;
  generateBranchName(taskTitle: string, taskId: string): Promise<string>;
}

const defaultExec: ExecFunction = (command, options) => {
  return nodeExecSync(command, { encoding: 'utf-8', ...options });
};

export class GitHelpers {
  private exec: ExecFunction;
  private getGitConfig: GetGitConfigFunction;
  private claudeSDK?: ClaudeSDKInterface;

  constructor(exec?: ExecFunction, getGitConfig?: GetGitConfigFunction, claudeSDK?: ClaudeSDKInterface) {
    this.exec = exec || defaultExec;
    this.getGitConfig = getGitConfig || defaultGetGitConfig;
    this.claudeSDK = claudeSDK;
  }

  private async ensureClaudeSDK(): Promise<ClaudeSDKInterface> {
    if (this.claudeSDK) return this.claudeSDK;
    const mod = await import('./claude-sdk');
    this.claudeSDK = (mod as unknown as { ClaudeSDK: ClaudeSDKInterface }).ClaudeSDK;
    return this.claudeSDK;
  }

  /**
   * Get the default branch name (main or master)
   */
  getDefaultBranch(cwd: string): string {
    // First check if there's a configured default branch
    const gitConfig = this.getGitConfig();
    if (gitConfig?.defaultBranch) {
      return gitConfig.defaultBranch;
    }

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
   * Check if a commit message indicates a WIP commit
   */
  isWipCommit(commitLine: string): boolean {
    return commitLine.includes('[wip]') || Boolean(commitLine.match(/\s+wip:/));
  }

  /**
   * Generate a commit message using Claude SDK with conventional commit format
   */
  async generateCommitMessage(diff: string, _cwd: string, taskId?: string): Promise<string> {
    const result = await this.generateCommitMessageWithMeta(diff, _cwd, taskId);
    return result.message;
  }

  /**
   * Generate a commit message with source metadata
   */
  async generateCommitMessageWithMeta(
    diff: string,
    _cwd: string,
    taskId?: string,
  ): Promise<{ message: string; source: 'sdk' | 'timeout' | 'error' }> {
    // Truncate diff if too long (Haiku has smaller context)
    const truncatedDiff = diff.substring(0, 3000);

    const taskContext = taskId ? `\nActive task: ${taskId}` : '';
    const changes = `${taskContext}\n\n${truncatedDiff}`;

    try {
      const fallbackMessage = 'chore: save work in progress';
      const timeoutMs = 10000; // Bounded SDK wait; hardcoded per project practice
      const sdkPromise = (async () => {
        const sdk = await this.ensureClaudeSDK();
        return sdk.generateCommitMessage(changes);
      })();
      const timeoutPromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve(fallbackMessage), timeoutMs);
      });
      const message = await Promise.race<string>([sdkPromise, timeoutPromise]);

      // Extract just the commit message if Claude added any wrapper text
      // Look for a line that matches conventional commit format
      const lines = message.split('\n');
      for (const line of lines) {
        if (line.match(/^(feat|fix|docs|style|refactor|test|chore|build|ci|perf)(\([^)]+\))?:/)) {
          return { message: line, source: message === fallbackMessage ? 'timeout' : 'sdk' };
        }
      }

      // If no proper format found but we got something, use it
      if (message) {
        return { message, source: message === fallbackMessage ? 'timeout' : 'sdk' };
      }

      // Fallback if nothing works
      return { message: fallbackMessage, source: 'timeout' };
    } catch (error) {
      console.error('Failed to generate commit message:', error);
      return { message: 'chore: save work in progress', source: 'error' };
    }
  }

  /**
   * Generate a branch name using Claude SDK
   */
  async generateBranchName(plan: string, taskId: string, _cwd: string): Promise<string> {
    // Extract key parts of the plan
    const planSummary = plan.substring(0, 1500);

    try {
      const sdk = await this.ensureClaudeSDK();
      const branchName = await sdk.generateBranchName(planSummary, taskId);

      // Extract just the branch name if Claude added any wrapper text
      const lines = branchName.split('\n');
      for (const line of lines) {
        if (line.match(/^(feature|bug)\//)) {
          // Add task ID if not already present
          if (!line.includes(taskId.toLowerCase())) {
            return `${line}-${taskId.toLowerCase()}`;
          }
          return line;
        }
      }

      // If we got something that looks like a branch name, use it
      if (branchName && !branchName.includes(' ')) {
        return branchName;
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

// Create a default instance for backward compatibility with the few functions still in use
let _defaultGitHelpers: GitHelpers | null = null;
function getDefaultGitHelpers(): GitHelpers {
  if (!_defaultGitHelpers) _defaultGitHelpers = new GitHelpers();
  return _defaultGitHelpers;
}

// Keep only the standalone functions that are actually used
export function getDefaultBranch(cwd: string): string {
  return getDefaultGitHelpers().getDefaultBranch(cwd);
}

export function getCurrentBranch(cwd: string): string {
  return getDefaultGitHelpers().getCurrentBranch(cwd);
}

export function isWipCommit(commitLine: string): boolean {
  return getDefaultGitHelpers().isWipCommit(commitLine);
}
