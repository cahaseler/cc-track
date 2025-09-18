import { mock } from 'bun:test';
import type { ExecSyncOptions } from 'node:child_process';
import path from 'node:path';
import type { CompleteTaskDeps } from '../commands/complete-task';
import type {
  ConsoleLike,
  FileSystemLike,
  LoggerFactory,
  PartialCommandDeps,
  ProcessLike,
  TimeProvider,
} from '../commands/context';
import type { ClaudeResponse } from '../lib/claude-sdk';
import type { ClaudeSDKInterface, ExecFunction, GitHelpers } from '../lib/git-helpers';
import type { GitHubHelpers } from '../lib/github-helpers';
import type { createLogger } from '../lib/logger';

/**
 * Mock console that captures all output
 */
export interface MockConsole extends ConsoleLike {
  logs: string[];
  errors: string[];
  warnings: string[];
}

export function createMockConsole(): MockConsole {
  const logs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  return {
    log: (...args: unknown[]) => {
      logs.push(args.join(' '));
    },
    error: (...args: unknown[]) => {
      errors.push(args.join(' '));
    },
    warn: (...args: unknown[]) => {
      warnings.push(args.join(' '));
    },
    logs,
    errors,
    warnings,
  };
}

/**
 * Mock process with configurable cwd and exit code tracking
 */
export interface MockProcess extends ProcessLike {
  exitCode?: number;
}

export function createMockProcess(cwd = '/project'): MockProcess {
  let exitCode: number | undefined;

  return {
    cwd: () => cwd,
    env: {},
    getExitCode: () => exitCode,
    setExitCode: (code: number) => {
      exitCode = code;
    },
    exitCode,
  };
}

/**
 * Mock filesystem with in-memory file storage
 */
export interface MockFileSystem extends FileSystemLike {
  files: Map<string, string>;
}

export function createMockFileSystem(initialFiles?: Record<string, string>): MockFileSystem {
  const files = new Map<string, string>(Object.entries(initialFiles ?? {}));

  return {
    existsSync: (targetPath: any) => files.has(String(targetPath)),
    readFileSync: ((targetPath: any, _encoding?: any) => {
      const pathStr = String(targetPath);
      const value = files.get(pathStr);
      if (value === undefined) {
        throw new Error(`File not found: ${pathStr}`);
      }
      return value;
    }) as any,
    writeFileSync: (targetPath: any, content: any, _options?: any) => {
      files.set(String(targetPath), content.toString());
    },
    appendFileSync: (targetPath: any, content: any, _options?: any) => {
      const pathStr = String(targetPath);
      const previous = files.get(pathStr) ?? '';
      files.set(pathStr, `${previous}${content.toString()}`);
    },
    mkdirSync: mock(() => {}) as any,
    readdirSync: mock(() => []) as any,
    unlinkSync: mock(() => {}) as any,
    copyFileSync: mock(() => {}) as any,
    files,
  };
}

/**
 * Mock time provider with fixed date
 */
export function createMockTimeProvider(fixedDate = '2025-01-01T00:00:00Z'): TimeProvider {
  const date = new Date(fixedDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return {
    now: () => date,
    todayISO: () => `${year}-${month}-${day}`,
  };
}

/**
 * Mock logger factory
 */
export function createMockLoggerFactory(): LoggerFactory {
  return (_scope: string) =>
    ({
      debug: mock(() => {}),
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      exception: mock(() => {}),
    }) as unknown as ReturnType<typeof createLogger>;
}

/**
 * Create a mock logger instance
 */
export function createMockLogger(): ReturnType<typeof createLogger> {
  return {
    debug: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    exception: mock(() => {}),
  } as unknown as ReturnType<typeof createLogger>;
}

/**
 * Base test dependencies with all common mocks
 */
export interface TestDeps {
  console: MockConsole;
  process: MockProcess;
  fs: MockFileSystem;
  time: TimeProvider;
  logger: LoggerFactory;
  // Tracking helpers
  logs: string[];
  errors: string[];
  warnings: string[];
  files: Map<string, string>;
  exitCode?: number;
}

/**
 * Create a full set of test dependencies with sensible defaults
 */
export function createTestDeps(options?: {
  cwd?: string;
  initialFiles?: Record<string, string>;
  fixedDate?: string;
}): TestDeps {
  const console = createMockConsole();
  const process = createMockProcess(options?.cwd);
  const fs = createMockFileSystem(options?.initialFiles);
  const time = createMockTimeProvider(options?.fixedDate);
  const logger = createMockLoggerFactory();

  return {
    console,
    process,
    fs,
    time,
    logger,
    // Convenience accessors
    logs: console.logs,
    errors: console.errors,
    warnings: console.warnings,
    files: fs.files,
    get exitCode() {
      return process.exitCode;
    },
  };
}

/**
 * Create partial command deps for testing specific commands
 * This is useful when you only need to override specific parts
 */
export function createPartialCommandDeps(overrides?: {
  console?: Partial<ConsoleLike>;
  process?: Partial<ProcessLike>;
  fs?: Partial<FileSystemLike>;
  time?: Partial<TimeProvider>;
  logger?: LoggerFactory;
  [key: string]: unknown;
}): PartialCommandDeps {
  const base = createTestDeps();

  return {
    console: overrides?.console ?? base.console,
    process: overrides?.process ?? base.process,
    fs: overrides?.fs ?? base.fs,
    path,
    time: overrides?.time ?? base.time,
    logger: overrides?.logger ?? base.logger,
    ...overrides,
  };
}

/**
 * Helper to extract command output from test deps
 */
export function getCommandOutput(deps: TestDeps): {
  stdout: string;
  stderr: string;
  all: string[];
} {
  return {
    stdout: deps.logs.join('\n'),
    stderr: deps.errors.join('\n'),
    all: [...deps.logs, ...deps.errors],
  };
}

/**
 * Helper to assert file was written with expected content
 */
export function assertFileWritten(deps: TestDeps, filePath: string, expectedContent?: string | RegExp): void {
  const content = deps.files.get(filePath);
  if (!content) {
    throw new Error(`Expected file ${filePath} to be written, but it was not`);
  }

  if (expectedContent) {
    if (typeof expectedContent === 'string') {
      if (content !== expectedContent) {
        throw new Error(`File ${filePath} content mismatch.\nExpected: ${expectedContent}\nActual: ${content}`);
      }
    } else if (expectedContent instanceof RegExp) {
      if (!expectedContent.test(content)) {
        throw new Error(`File ${filePath} content doesn't match pattern ${expectedContent}`);
      }
    }
  }
}

/**
 * Helper to assert console output contains expected text
 */
export function assertConsoleContains(deps: TestDeps, expected: string, type: 'log' | 'error' | 'warn' = 'log'): void {
  const output = type === 'log' ? deps.logs : type === 'error' ? deps.errors : deps.warnings;
  const found = output.some((line) => line.includes(expected));

  if (!found) {
    throw new Error(
      `Expected ${type} output to contain "${expected}", but it was not found.\nActual output:\n${output.join('\n')}`,
    );
  }
}

/**
 * Mock ClaudeSDK interface for testing
 */
export interface MockClaudeSDK extends ClaudeSDKInterface {
  generateCommitMessage: ReturnType<typeof mock>;
  generateBranchName: ReturnType<typeof mock>;
  prompt?: ReturnType<typeof mock>;
}

export function createMockClaudeSDK(options?: {
  commitMessage?: string;
  branchName?: string;
  promptResponse?: ClaudeResponse;
}): MockClaudeSDK {
  return {
    generateCommitMessage: mock(async (changes: string) => {
      if (options?.commitMessage) return options.commitMessage;
      // Default smart responses based on content
      if (changes.includes('new feature') || changes.includes('feat:')) {
        return 'feat: add new feature';
      }
      if (changes.includes('login bug')) {
        return 'fix: resolve login bug';
      }
      if (changes.includes('bug') || changes.includes('fix')) {
        return 'fix: resolve issue';
      }
      return 'chore: save work in progress';
    }),
    generateBranchName: mock(async (taskTitle: string, taskId: string) => {
      if (options?.branchName) return options.branchName;
      // Default smart branch naming
      if (taskTitle.includes('authentication') || taskTitle.includes('auth')) {
        return `feature/user-auth-${taskId.toLowerCase()}`;
      }
      if (taskTitle.includes('login')) {
        return `bug/fix-login-${taskId.toLowerCase()}`;
      }
      if (taskTitle.includes('bug') || taskTitle.includes('fix')) {
        return `bug/fix-${taskId.toLowerCase()}`;
      }
      return `feature/task-${taskId.toLowerCase()}`;
    }),
    prompt: mock(
      async () =>
        options?.promptResponse ?? {
          text: '# Enhanced Task\n\nEnriched content with research',
          success: true,
        },
    ),
  };
}

/**
 * Mock ExecFunction with call tracking for testing shell commands
 */
export type MockExecFunction = ExecFunction & {
  execCalls: Array<{ command: string; options?: ExecSyncOptions & { encoding?: BufferEncoding } }>;
};

/**
 * Mock ExecFunction for testing shell commands
 */
export function createMockExec(responses?: Record<string, string>): MockExecFunction {
  const execCalls: Array<{ command: string; options?: ExecSyncOptions & { encoding?: BufferEncoding } }> = [];

  const mockExec = mock((command: string, options?: ExecSyncOptions & { encoding?: BufferEncoding }) => {
    execCalls.push({ command, options });

    if (responses) {
      // Check for exact matches first
      if (responses[command]) return responses[command];

      // Check for partial matches
      for (const [pattern, response] of Object.entries(responses)) {
        if (command.includes(pattern)) return response;
      }
    }

    // Default responses for common git commands
    if (command.startsWith('git status')) return '';
    if (command.startsWith('git branch')) return 'main';
    if (command.startsWith('git rev-parse')) return 'abc123';
    if (command.startsWith('git diff')) return '';

    return '';
  }) as ExecFunction;

  // Attach execCalls for test inspection with proper typing
  return Object.assign(mockExec, { execCalls });
}

/**
 * Mock GitHelpers class for testing
 */
export function createMockGitHelpers(overrides?: Partial<GitHelpers>): GitHelpers {
  const mockInstance = {
    getDefaultBranch: mock(() => 'main'),
    getCurrentBranch: mock(() => 'main'),
    createTaskBranch: mock(() => {}),
    switchToBranch: mock(() => {}),
    mergeTaskBranch: mock(() => {}),
    pushCurrentBranch: mock(() => true),
    getMergeBase: mock(() => 'abc123'),
    generateCommitMessage: mock(async () => 'chore: save work in progress'),
    generateBranchName: mock(async () => 'feature/test-branch'),
    ...overrides,
  } as unknown as GitHelpers;

  return mockInstance;
}

/**
 * Mock GitHubHelpers class for testing
 */
export function createMockGitHubHelpers(overrides?: Partial<GitHubHelpers>): GitHubHelpers {
  const mockInstance = {
    createIssue: mock(async () => ({ number: 42, html_url: 'https://github.com/test/repo/issues/42' })),
    createPR: mock(async () => ({ number: 42, html_url: 'https://github.com/test/repo/pull/42' })),
    updatePR: mock(async () => true),
    getExistingPR: mock(async () => null),
    linkIssueToTask: mock(() => {}),
    ...overrides,
  } as unknown as GitHubHelpers;

  return mockInstance;
}

/**
 * Extended test dependencies with library mocks
 */
export interface ExtendedTestDeps extends TestDeps {
  claudeSDK: MockClaudeSDK;
  exec: MockExecFunction;
  gitHelpers: GitHelpers;
  githubHelpers: GitHubHelpers;
}

/**
 * Create extended test dependencies with all common mocks including library classes
 */
export function createExtendedTestDeps(options?: {
  cwd?: string;
  initialFiles?: Record<string, string>;
  fixedDate?: string;
  execResponses?: Record<string, string>;
  claudeSDKOptions?: Parameters<typeof createMockClaudeSDK>[0];
}): ExtendedTestDeps {
  const base = createTestDeps({
    cwd: options?.cwd,
    initialFiles: options?.initialFiles,
    fixedDate: options?.fixedDate,
  });

  const claudeSDK = createMockClaudeSDK(options?.claudeSDKOptions);
  const exec = createMockExec(options?.execResponses);
  const gitHelpers = createMockGitHelpers();
  const githubHelpers = createMockGitHubHelpers();

  return {
    ...base,
    claudeSDK,
    exec,
    gitHelpers,
    githubHelpers,
  };
}

/**
 * Mock state interface for complete-task tests
 */
export interface MockCompleteTaskState {
  readonly deps: CompleteTaskDeps;
  files: Map<string, string>;
  execCommands: string[];
  claudeCleared: () => boolean;
  setDeps: (overrides: Partial<CompleteTaskDeps>) => void;
}

/**
 * Create comprehensive mock dependencies for complete-task command tests
 * Provides a complete mock implementation with file system simulation and command tracking
 */
export function createMockCompleteTaskDeps(initialFiles?: Record<string, string>): MockCompleteTaskState {
  const files = new Map<string, string>(Object.entries(initialFiles ?? {}));
  const execCommands: string[] = [];
  let claudeCleared = false;

  const baseDeps: CompleteTaskDeps = {
    cwd: () => '/project',
    fs: {
      existsSync: (targetPath: string) => files.has(targetPath),
      readFileSync: (targetPath: string) => {
        const content = files.get(targetPath);
        if (content === undefined) {
          throw new Error(`File not found: ${targetPath}`);
        }
        return content;
      },
      writeFileSync: (targetPath: string, value: string | NodeJS.ArrayBufferView) => {
        files.set(targetPath, value.toString());
      },
    },
    path: {
      join: (...args: string[]) => args.join('/'),
      resolve: (...args: string[]) => `/${args.filter(Boolean).join('/')}`,
      relative: (from: string, to: string) => to.replace(from, '').replace(/^\/+/, ''),
      dirname: (path: string) => path.split('/').slice(0, -1).join('/') || '/',
      basename: (path: string) => path.split('/').pop() || '',
      extname: (path: string) => {
        const name = path.split('/').pop() || '';
        const lastDot = name.lastIndexOf('.');
        return lastDot > 0 ? name.slice(lastDot) : '';
      },
      isAbsolute: (path: string) => path.startsWith('/'),
      normalize: (path: string) => path,
      sep: '/',
    },
    execSync: mock((command: string | Buffer, _options?: import('node:child_process').ExecSyncOptions) => {
      const cmd = typeof command === 'string' ? command : command.toString();
      execCommands.push(cmd);
      if (cmd.startsWith('git status --porcelain')) {
        return '';
      }
      if (cmd.startsWith('git diff --name-only')) {
        return 'src/index.ts\n';
      }
      if (cmd.startsWith('git rev-list --count')) {
        return '2';
      }
      if (cmd.startsWith('git rev-parse')) {
        throw new Error('not found');
      }
      return '';
    }) as unknown as CompleteTaskDeps['execSync'],
    getActiveTaskId: mock(() => 'TASK_001'),
    clearActiveTask: mock(() => {
      claudeCleared = true;
      files.set('/project/CLAUDE.md', '# CLAUDE\n');
    }),
    getConfig: mock(() => ({ features: {} })),
    getGitHubConfig: mock(() => ({ auto_create_prs: false })),
    isGitHubIntegrationEnabled: mock(() => false),
    getCurrentBranch: mock(() => 'main'),
    getDefaultBranch: mock(() => 'main'),
    getMergeBase: mock(() => 'abc123'),
    pushCurrentBranch: mock(() => true),
    runValidationChecks: mock(async () => ({
      success: true,
      readyForCompletion: true,
      task: { exists: true, taskId: 'TASK_001', status: 'in_progress' },
      validation: {},
      git: {
        hasUncommittedChanges: false,
        modifiedFiles: [],
        wipCommitCount: 0,
        currentBranch: 'main',
        isTaskBranch: false,
      },
      warnings: [],
    })),
    todayISO: () => '2025-01-01',
    logger: createMockLogger(),
  } satisfies CompleteTaskDeps;

  let deps = baseDeps;

  return {
    get deps() {
      return deps;
    },
    setDeps(overrides: Partial<CompleteTaskDeps>) {
      deps = { ...deps, ...overrides } as CompleteTaskDeps;
    },
    files,
    execCommands,
    claudeCleared: () => claudeCleared,
  } as unknown as MockCompleteTaskState;
}
