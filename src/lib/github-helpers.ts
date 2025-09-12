import { execSync as nodeExecSync } from 'node:child_process';
import type { GitHubIssue } from '../types';
import { createLogger } from './logger';

const logger = createLogger('github-helpers');

export interface GitHubPR {
  number: number;
  title: string;
  url: string;
  body: string;
}

// Interface for dependency injection
export type ExecFunction = (
  command: string,
  options?: { cwd?: string; encoding?: BufferEncoding; timeout?: number; shell?: string },
) => string;

const defaultExec: ExecFunction = (command, options) => {
  return nodeExecSync(command, { encoding: 'utf-8', ...options }) as string;
};

export class GitHubHelpers {
  private exec: ExecFunction;

  constructor(exec?: ExecFunction) {
    this.exec = exec || defaultExec;
  }

  /**
   * Escape shell arguments to prevent command injection
   */
  private escapeShellArgument(input: string): string {
    return input.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  }

  /**
   * Check if GitHub CLI is available
   */
  isGitHubCLIAvailable(): boolean {
    try {
      this.exec('gh --version 2>/dev/null');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if current repository is connected to GitHub
   */
  isGitHubRepoConnected(cwd: string): boolean {
    try {
      this.exec('gh repo view', { cwd });
      return true;
    } catch (error) {
      logger.debug('GitHub repo connection check failed', { error: (error as Error).message, cwd });
      return false;
    }
  }

  /**
   * Get current GitHub repository information
   */
  getGitHubRepoInfo(cwd: string): { owner: string; repo: string } | null {
    try {
      const result = this.exec('gh repo view --json owner,name', { cwd });
      const data = JSON.parse(result);
      return {
        owner: data.owner.login,
        repo: data.name,
      };
    } catch (error) {
      logger.error('Failed to get GitHub repo info', { error });
      return null;
    }
  }

  /**
   * Create a GitHub issue
   */
  createGitHubIssue(title: string, body: string, cwd: string): GitHubIssue | null {
    try {
      logger.info('Creating GitHub issue', { title });

      // Properly escape arguments to avoid shell interpretation
      const escapedTitle = this.escapeShellArgument(title);
      const escapedBody = this.escapeShellArgument(body);

      const command = `gh issue create --title "${escapedTitle}" --body "${escapedBody}"`;

      const result = this.exec(command, { cwd });

      // Extract issue URL from output
      const url = result.trim();
      const issueNumber = this.extractIssueNumberFromUrl(url);

      if (!issueNumber) {
        logger.error('Failed to extract issue number from URL', { url });
        return null;
      }

      logger.info('GitHub issue created successfully', { issueNumber, url });

      return {
        number: issueNumber,
        title,
        url,
        state: 'open',
      };
    } catch (error) {
      logger.error('Failed to create GitHub issue', { error, title });
      return null;
    }
  }

  /**
   * Create a branch linked to a GitHub issue using gh issue develop
   */
  createIssueBranch(issueNumber: number, cwd: string): string | null {
    try {
      logger.info('Creating issue branch', { issueNumber });

      // Use gh issue develop to create and checkout a branch linked to the issue
      this.exec(`gh issue develop ${issueNumber} --checkout 2>&1`, {
        cwd,
      });

      // Get the current branch name
      const branchName = this.exec('git branch --show-current', { cwd }).trim();

      logger.info('Issue branch created successfully', { issueNumber, branchName });
      return branchName;
    } catch (error) {
      logger.error('Failed to create issue branch', { error, issueNumber });
      return null;
    }
  }

  /**
   * Create a pull request
   */
  createPullRequest(title: string, body: string, cwd: string, draft = false): GitHubPR | null {
    try {
      logger.info('Creating pull request', { title, draft });

      let command = `gh pr create --title "${title}" --body "${body}"`;
      if (draft) {
        command += ' --draft';
      }

      const result = this.exec(command, { cwd });

      // Extract PR URL from output
      const url = result.trim();
      const prNumber = this.extractPRNumberFromUrl(url);

      if (!prNumber) {
        logger.error('Failed to extract PR number from URL', { url });
        return null;
      }

      logger.info('Pull request created successfully', { prNumber, url });

      return {
        number: prNumber,
        title,
        url,
        body,
      };
    } catch (error) {
      logger.error('Failed to create pull request', { error, title });
      return null;
    }
  }

  /**
   * Push current branch to origin
   */
  pushCurrentBranch(cwd: string): boolean {
    try {
      logger.info('Pushing current branch to origin');

      this.exec('git push -u origin HEAD 2>&1', {
        cwd,
      });

      logger.info('Branch pushed successfully');
      return true;
    } catch (error) {
      logger.error('Failed to push branch', { error });
      return false;
    }
  }

  /**
   * Switch to a different branch
   */
  switchToBranch(branchName: string, cwd: string): boolean {
    try {
      logger.info('Switching to branch', { branchName });

      this.exec(`git checkout ${branchName} 2>&1`, {
        cwd,
      });

      logger.info('Switched to branch successfully', { branchName });
      return true;
    } catch (error) {
      logger.error('Failed to switch to branch', { error, branchName });
      return false;
    }
  }

  /**
   * Create a new GitHub repository
   */
  createGitHubRepo(name: string, description: string, isPublic = true, cwd?: string): string | null {
    try {
      logger.info('Creating GitHub repository', { name, description, isPublic });

      let command = `gh repo create ${name} --description "${description}"`;
      command += isPublic ? ' --public' : ' --private';

      this.exec(`${command} 2>&1`, {
        cwd,
      });

      const repoUrl = `https://github.com/${name}`;
      logger.info('GitHub repository created successfully', { name, repoUrl });

      return repoUrl;
    } catch (error) {
      logger.error('Failed to create GitHub repository', { error, name });
      return null;
    }
  }

  /**
   * Connect local repository to GitHub remote
   */
  connectToGitHubRepo(repoUrl: string, cwd: string): boolean {
    try {
      logger.info('Connecting to GitHub repository', { repoUrl });

      // Add remote origin
      this.exec(`git remote add origin ${repoUrl} 2>&1`, {
        cwd,
      });

      logger.info('Connected to GitHub repository successfully', { repoUrl });
      return true;
    } catch (error) {
      logger.error('Failed to connect to GitHub repository', { error, repoUrl });
      return false;
    }
  }

  /**
   * Extract issue number from GitHub issue URL
   */
  private extractIssueNumberFromUrl(url: string): number | null {
    const match = url.match(/\/issues\/(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Extract PR number from GitHub PR URL
   */
  private extractPRNumberFromUrl(url: string): number | null {
    const match = url.match(/\/pull\/(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Validate GitHub integration prerequisites
   */
  validateGitHubIntegration(cwd: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if GitHub CLI is available
    if (!this.isGitHubCLIAvailable()) {
      errors.push('GitHub CLI (gh) is not installed or not available in PATH');
    }

    // Check if authenticated
    try {
      this.exec('gh auth status 2>/dev/null');
    } catch {
      errors.push('GitHub CLI is not authenticated. Run: gh auth login');
    }

    // Check if repo is connected to GitHub
    if (!this.isGitHubRepoConnected(cwd)) {
      errors.push('Repository is not connected to GitHub');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format task content for GitHub issue
   */
  formatTaskForGitHub(taskContent: string): { title: string; body: string } {
    const lines = taskContent.split('\n').filter((line) => line.trim());

    // Extract title (first heading or first line)
    let title = 'New Task';
    let bodyLines = lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('# ')) {
        title = line.substring(2).trim();
        bodyLines = lines.slice(i + 1);
        break;
      } else if (line && !line.startsWith('#') && title === 'New Task') {
        title = line;
        bodyLines = lines.slice(i + 1);
        break;
      }
    }

    // Format body
    const body = bodyLines.join('\n').trim();

    return { title, body };
  }
}

// Create default instance for backward compatibility with pushCurrentBranch
const defaultGitHubHelpers = new GitHubHelpers();

// Keep only the standalone function that is actually used (in complete-task.ts)
export function pushCurrentBranch(cwd: string): boolean {
  return defaultGitHubHelpers.pushCurrentBranch(cwd);
}
