import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { HookInput, HookOutput } from '../types';

// Build and copy the binary to a temp location once
let testBinaryPath: string | null = null;

/**
 * Get or create the test binary in a safe location
 */
export function getTestBinary(): string {
  if (!testBinaryPath) {
    // Build the binary
    execSync('bun build src/cli/index.ts --compile --outfile dist/cc-track', {
      cwd: '/home/ubuntu/projects/cc-pars',
      stdio: 'pipe',
    });

    // Copy to temp location
    const tempBinDir = mkdtempSync(join(tmpdir(), 'cc-track-test-bin-'));
    testBinaryPath = join(tempBinDir, 'cc-track');
    copyFileSync('/home/ubuntu/projects/cc-pars/dist/cc-track', testBinaryPath);

    // Make it executable
    execSync(`chmod +x ${testBinaryPath}`);
  }
  return testBinaryPath;
}

/**
 * Options for creating a temporary project
 */
export interface TempProjectOptions {
  gitInit?: boolean;
  githubEnabled?: boolean;
  trackConfig?: Record<string, any>;
  initialFiles?: Record<string, string>;
  gitUser?: { name: string; email: string };
}

/**
 * Result from creating a temporary project
 */
export interface TempProject {
  projectDir: string;
  cleanup: () => void;
  execInProject: (command: string) => string;
  readFile: (relativePath: string) => string;
  writeFile: (relativePath: string, content: string) => void;
  fileExists: (relativePath: string) => boolean;
}

/**
 * Create a temporary git repository with initial commits
 */
export function createTempGitRepo(dir: string, user?: { name: string; email: string }): void {
  const gitUser = user || { name: 'Test User', email: 'test@example.com' };

  // Initialize git repo
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync(`git config user.name "${gitUser.name}"`, { cwd: dir, stdio: 'pipe' });
  execSync(`git config user.email "${gitUser.email}"`, { cwd: dir, stdio: 'pipe' });

  // Create initial commit
  writeFileSync(join(dir, 'README.md'), '# Test Project\n');
  execSync('git add README.md', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "Initial commit"', { cwd: dir, stdio: 'pipe' });
}

/**
 * Create a temporary project with cc-track structure
 */
export async function createTempProject(options: TempProjectOptions = {}): Promise<TempProject> {
  const projectDir = mkdtempSync(join(tmpdir(), 'cc-track-test-'));

  // Create basic project structure
  mkdirSync(join(projectDir, '.claude'), { recursive: true });
  mkdirSync(join(projectDir, '.claude', 'tasks'), { recursive: true });
  mkdirSync(join(projectDir, '.claude', 'plans'), { recursive: true });
  mkdirSync(join(projectDir, '.claude', 'commands'), { recursive: true });
  mkdirSync(join(projectDir, 'src'), { recursive: true });

  // Create CLAUDE.md
  writeFileSync(
    join(projectDir, 'CLAUDE.md'),
    `# Project: Test Project

## Active Task
@.claude/no_active_task.md

## Product Vision
@.claude/product_context.md
`
  );

  // Create no_active_task.md
  writeFileSync(
    join(projectDir, '.claude', 'no_active_task.md'),
    '# No active task\n\nThere is currently no active task selected.'
  );

  // Create product_context.md
  writeFileSync(
    join(projectDir, '.claude', 'product_context.md'),
    '# Product Context\n\nTest project for integration testing.'
  );

  // Create track.config.json
  const trackConfig = {
    capture_plan: true,
    stop_review: true,
    edit_validation: false,
    statusline: true,
    git_branching: options.gitInit || false,
    github_integration: {
      enabled: options.githubEnabled || false,
      auto_create_issues: options.githubEnabled || false,
      use_issue_branches: options.githubEnabled || false,
      auto_create_prs: options.githubEnabled || false,
    },
    ...options.trackConfig,
  };

  writeFileSync(
    join(projectDir, '.claude', 'track.config.json'),
    JSON.stringify(trackConfig, null, 2)
  );

  // Add any initial files
  if (options.initialFiles) {
    for (const [path, content] of Object.entries(options.initialFiles)) {
      const fullPath = join(projectDir, path);
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(fullPath, content);
    }
  }

  // Initialize git if requested
  if (options.gitInit) {
    createTempGitRepo(projectDir, options.gitUser);
  }

  // Return project interface
  return {
    projectDir,
    cleanup: () => {
      rmSync(projectDir, { recursive: true, force: true });
    },
    execInProject: (command: string) => {
      return execSync(command, { cwd: projectDir, stdio: 'pipe', encoding: 'utf-8' });
    },
    readFile: (relativePath: string) => {
      return readFileSync(join(projectDir, relativePath), 'utf-8');
    },
    writeFile: (relativePath: string, content: string) => {
      const fullPath = join(projectDir, relativePath);
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(fullPath, content);
    },
    fileExists: (relativePath: string) => {
      return existsSync(join(projectDir, relativePath));
    },
  };
}

/**
 * Run a hook with given input and capture output
 */
export async function runHook(
  hookName: string,
  input: Partial<HookInput>,
  projectDir: string
): Promise<HookOutput> {
  const hookPath = getTestBinary();
  const fullInput: HookInput = {
    hook_event_name: 'PostToolUse',
    ...input,
  };

  // Write JSON to temp file to avoid shell escaping issues
  const tempFile = join(projectDir, '.test-hook-input.json');
  writeFileSync(tempFile, JSON.stringify(fullInput));

  try {
    const result = execSync(
      `cat ${tempFile} | ${hookPath} hook 2>&1`,
      { cwd: projectDir, stdio: 'pipe', encoding: 'utf-8' }
    );

    // The hook might output the same JSON twice (stdout and stderr)
    // Split by newlines and parse the first valid JSON
    const lines = result.split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        return JSON.parse(line);
      } catch {
        // Not valid JSON, continue to next line
      }
    }

    // If no valid JSON found, throw error with better message
    console.error('Hook output:', result);
    throw new Error(`No valid JSON in hook output: ${result}`);
  } catch (error: any) {
    console.error('Hook execution error:', error.message);
    if (error.stdout) console.error('Stdout:', error.stdout);
    if (error.stderr) console.error('Stderr:', error.stderr);
    throw error;
  } finally {
    // Clean up temp file
    if (existsSync(tempFile)) {
      execSync(`rm ${tempFile}`, { cwd: projectDir });
    }
  }
}

/**
 * Run multiple hooks in sequence
 */
export async function runHookChain(
  hooks: Array<{ name: string; input: Partial<HookInput> }>,
  projectDir: string
): Promise<HookOutput[]> {
  const results: HookOutput[] = [];

  for (const { name, input } of hooks) {
    const result = await runHook(name, input, projectDir);
    results.push(result);

    // If a hook blocks, stop the chain
    if ('continue' in result && !result.continue) {
      break;
    }
  }

  return results;
}

/**
 * Capture current system state for assertions
 */
export interface SystemState {
  gitBranch?: string;
  gitStatus?: string;
  activeTask?: string;
  taskFiles: string[];
  planFiles: string[];
  lastCommitMessage?: string;
  uncommittedChanges: boolean;
}

export function captureSystemState(projectDir: string): SystemState {
  const state: SystemState = {
    taskFiles: [],
    planFiles: [],
    uncommittedChanges: false,
  };

  // Capture git state if it's a git repo
  if (existsSync(join(projectDir, '.git'))) {
    try {
      state.gitBranch = execSync('git branch --show-current', {
        cwd: projectDir,
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();

      state.gitStatus = execSync('git status --porcelain', {
        cwd: projectDir,
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();

      state.uncommittedChanges = state.gitStatus.length > 0;

      state.lastCommitMessage = execSync('git log -1 --pretty=%B', {
        cwd: projectDir,
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();
    } catch (e) {
      // Git commands might fail if no commits yet
    }
  }

  // Check for active task
  const claudeMd = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf-8');
  const taskMatch = claudeMd.match(/@\.claude\/tasks\/(TASK_\d+)\.md/);
  if (taskMatch) {
    state.activeTask = taskMatch[1];
  } else if (claudeMd.includes('@.claude/no_active_task.md')) {
    state.activeTask = undefined;
  }

  // List task files
  const tasksDir = join(projectDir, '.claude', 'tasks');
  if (existsSync(tasksDir)) {
    state.taskFiles = execSync('ls', {
      cwd: tasksDir,
      stdio: 'pipe',
      encoding: 'utf-8'
    }).trim().split('\n').filter(Boolean);
  }

  // List plan files
  const plansDir = join(projectDir, '.claude', 'plans');
  if (existsSync(plansDir)) {
    state.planFiles = execSync('ls', {
      cwd: plansDir,
      stdio: 'pipe',
      encoding: 'utf-8'
    }).trim().split('\n').filter(Boolean);
  }

  return state;
}

/**
 * Controllable stub for Claude SDK calls
 */
export class ClaudeSDKStub {
  private responses: Map<string, { text: string; success: boolean }> = new Map();
  private defaultResponse = { text: 'Mock response', success: true };

  setResponse(pattern: string | RegExp, response: { text: string; success: boolean }): void {
    this.responses.set(String(pattern), response);
  }

  setDefaultResponse(response: { text: string; success: boolean }): void {
    this.defaultResponse = response;
  }

  async prompt(text: string, _model: 'haiku' | 'sonnet' | 'opus'): Promise<{ text: string; success: boolean }> {
    // Check for matching response
    for (const [pattern, response] of this.responses) {
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        // Regex pattern
        const regex = new RegExp(pattern.slice(1, -1));
        if (regex.test(text)) {
          return response;
        }
      } else if (text.includes(pattern)) {
        // Simple string match
        return response;
      }
    }

    return this.defaultResponse;
  }
}

/**
 * Mock for GitHub API operations
 */
export class GitHubAPIStub {
  private issues: Map<number, any> = new Map();
  private prs: Map<number, any> = new Map();
  private nextIssueNumber = 1;
  private nextPrNumber = 1;

  createIssue(title: string, body: string): { number: number; url: string } {
    const issueNumber = this.nextIssueNumber++;
    const issue = {
      number: issueNumber,
      title,
      body,
      url: `https://github.com/test/repo/issues/${issueNumber}`,
      state: 'open',
    };
    this.issues.set(issueNumber, issue);
    return { number: issueNumber, url: issue.url };
  }

  createPR(title: string, body: string, branch: string): { number: number; url: string } {
    const prNumber = this.nextPrNumber++;
    const pr = {
      number: prNumber,
      title,
      body,
      branch,
      url: `https://github.com/test/repo/pull/${prNumber}`,
      state: 'open',
    };
    this.prs.set(prNumber, pr);
    return { number: prNumber, url: pr.url };
  }

  getIssue(number: number): any {
    return this.issues.get(number);
  }

  getPR(number: number): any {
    return this.prs.get(number);
  }

  listIssues(): any[] {
    return Array.from(this.issues.values());
  }

  listPRs(): any[] {
    return Array.from(this.prs.values());
  }
}

/**
 * Run a CLI command
 */
export async function runCommand(
  command: string,
  args: string[],
  projectDir: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const cliPath = getTestBinary();
  const fullCommand = `${cliPath} ${command} ${args.join(' ')}`;

  try {
    const stdout = execSync(fullCommand, {
      cwd: projectDir,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || '',
      exitCode: error.status || 1,
    };
  }
}

/**
 * Create a mock plan for testing
 */
export function createMockPlan(title: string, description: string): string {
  return `## Plan: ${title}

### Overview
${description}

### Tasks
1. First task item
2. Second task item
3. Third task item

### Success Criteria
- All tests pass
- Documentation updated
- Code reviewed
`;
}

/**
 * Create proper hook input for capture-plan
 */
export function createCapturePlanInput(plan: string): Partial<HookInput> {
  return {
    hook_event_name: 'PostToolUse',
    tool_name: 'ExitPlanMode',
    tool_response: {
      plan: plan,
    },
    tool_input: {
      plan: plan,
    },
    exit_plan_mode_data: {
      plan: plan,
    },
  };
}