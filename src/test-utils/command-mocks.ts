import { mock } from 'bun:test';
import path from 'node:path';
import type {
  ConsoleLike,
  FileSystemLike,
  LoggerFactory,
  PartialCommandDeps,
  ProcessLike,
  TimeProvider,
} from '../commands/context';
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
    // biome-ignore lint/suspicious/noExplicitAny: Mock fs methods need flexible types
    existsSync: (targetPath: any) => files.has(String(targetPath)),
    // biome-ignore lint/suspicious/noExplicitAny: Mock fs methods need flexible types
    readFileSync: ((targetPath: any, _encoding?: any) => {
      const pathStr = String(targetPath);
      const value = files.get(pathStr);
      if (value === undefined) {
        throw new Error(`File not found: ${pathStr}`);
      }
      return value;
      // biome-ignore lint/suspicious/noExplicitAny: Cast needed for type compatibility
    }) as any,
    // biome-ignore lint/suspicious/noExplicitAny: Mock fs methods need flexible types
    writeFileSync: (targetPath: any, content: any, _options?: any) => {
      files.set(String(targetPath), content.toString());
    },
    // biome-ignore lint/suspicious/noExplicitAny: Mock fs methods need flexible types
    appendFileSync: (targetPath: any, content: any, _options?: any) => {
      const pathStr = String(targetPath);
      const previous = files.get(pathStr) ?? '';
      files.set(pathStr, `${previous}${content.toString()}`);
    },
    // biome-ignore lint/suspicious/noExplicitAny: Mock fs methods need flexible types
    mkdirSync: mock(() => {}) as any,
    // biome-ignore lint/suspicious/noExplicitAny: Mock fs methods need flexible types
    readdirSync: mock(() => []) as any,
    // biome-ignore lint/suspicious/noExplicitAny: Mock fs methods need flexible types
    unlinkSync: mock(() => {}) as any,
    // biome-ignore lint/suspicious/noExplicitAny: Mock fs methods need flexible types
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
