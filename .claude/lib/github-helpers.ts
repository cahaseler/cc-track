import { execSync } from 'node:child_process';
import { getGitHubConfig } from './config';
import { createLogger } from './logger';

const logger = createLogger('github-helpers');

export interface GitHubIssue {
  number: number;
  title: string;
  url: string;
  body: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  url: string;
  body: string;
}

/**
 * Check if GitHub CLI is available
 */
export function isGitHubCLIAvailable(): boolean {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if current repository is connected to GitHub
 */
export function isGitHubRepoConnected(cwd: string): boolean {
  try {
    execSync('gh repo view', { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current GitHub repository information
 */
export function getGitHubRepoInfo(cwd: string): { owner: string; repo: string } | null {
  try {
    const result = execSync('gh repo view --json owner,name', {
      cwd,
      encoding: 'utf-8',
    });
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
export function createGitHubIssue(
  title: string,
  body: string,
  cwd: string,
  labels?: string[]
): GitHubIssue | null {
  try {
    logger.info('Creating GitHub issue', { title, labels });
    
    let command = `gh issue create --title "${title}" --body "${body}"`;
    if (labels && labels.length > 0) {
      command += ` --label "${labels.join(',')}"`;
    }
    
    const result = execSync(command, {
      cwd,
      encoding: 'utf-8',
    });
    
    // Extract issue URL from output
    const url = result.trim();
    const issueNumber = extractIssueNumberFromUrl(url);
    
    if (!issueNumber) {
      logger.error('Failed to extract issue number from URL', { url });
      return null;
    }
    
    logger.info('GitHub issue created successfully', { issueNumber, url });
    
    return {
      number: issueNumber,
      title,
      url,
      body,
    };
  } catch (error) {
    logger.error('Failed to create GitHub issue', { error, title });
    return null;
  }
}

/**
 * Create a branch linked to a GitHub issue using gh issue develop
 */
export function createIssueBranch(issueNumber: number, cwd: string): string | null {
  try {
    logger.info('Creating issue branch', { issueNumber });
    
    // Use gh issue develop to create and checkout a branch linked to the issue
    execSync(`gh issue develop ${issueNumber} --checkout`, {
      cwd,
      stdio: 'ignore',
    });
    
    // Get the current branch name
    const branchName = execSync('git branch --show-current', {
      cwd,
      encoding: 'utf-8',
    }).trim();
    
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
export function createPullRequest(
  title: string,
  body: string,
  cwd: string,
  draft = false
): GitHubPR | null {
  try {
    logger.info('Creating pull request', { title, draft });
    
    let command = `gh pr create --title "${title}" --body "${body}"`;
    if (draft) {
      command += ' --draft';
    }
    
    const result = execSync(command, {
      cwd,
      encoding: 'utf-8',
    });
    
    // Extract PR URL from output
    const url = result.trim();
    const prNumber = extractPRNumberFromUrl(url);
    
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
export function pushCurrentBranch(cwd: string): boolean {
  try {
    logger.info('Pushing current branch to origin');
    
    execSync('git push -u origin HEAD', {
      cwd,
      stdio: 'ignore',
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
export function switchToBranch(branchName: string, cwd: string): boolean {
  try {
    logger.info('Switching to branch', { branchName });
    
    execSync(`git checkout ${branchName}`, {
      cwd,
      stdio: 'ignore',
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
export function createGitHubRepo(
  name: string,
  description: string,
  isPublic = true,
  cwd?: string
): string | null {
  try {
    logger.info('Creating GitHub repository', { name, description, isPublic });
    
    let command = `gh repo create ${name} --description "${description}"`;
    command += isPublic ? ' --public' : ' --private';
    
    execSync(command, {
      cwd,
      stdio: 'ignore',
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
export function connectToGitHubRepo(repoUrl: string, cwd: string): boolean {
  try {
    logger.info('Connecting to GitHub repository', { repoUrl });
    
    // Add remote origin
    execSync(`git remote add origin ${repoUrl}`, {
      cwd,
      stdio: 'ignore',
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
function extractIssueNumberFromUrl(url: string): number | null {
  const match = url.match(/\/issues\/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract PR number from GitHub PR URL
 */
function extractPRNumberFromUrl(url: string): number | null {
  const match = url.match(/\/pull\/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Validate GitHub integration prerequisites
 */
export function validateGitHubIntegration(cwd: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check if GitHub CLI is available
  if (!isGitHubCLIAvailable()) {
    errors.push('GitHub CLI (gh) is not installed or not available in PATH');
  }
  
  // Check if authenticated
  try {
    execSync('gh auth status', { stdio: 'ignore' });
  } catch {
    errors.push('GitHub CLI is not authenticated. Run: gh auth login');
  }
  
  // Check if repo is connected to GitHub
  if (!isGitHubRepoConnected(cwd)) {
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
export function formatTaskForGitHub(taskContent: string): { title: string; body: string } {
  const lines = taskContent.split('\n').filter(line => line.trim());
  
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