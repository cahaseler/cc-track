import { describe, expect, mock, test } from 'bun:test';
import path from 'node:path';
import type { ConsoleLike } from './context';
import { createInitCommand, type InitDeps, initCommand, runInit } from './init';

interface MockInitDeps extends InitDeps {
  messages: string[];
  errors: string[];
  warnings: string[];
  exitCode?: number;
  files: Map<string, string>;
  directories: Set<string>;
}

function createMockInitDeps(initialFiles?: Record<string, string>, initialDirs?: string[]): MockInitDeps {
  const files = new Map<string, string>(Object.entries(initialFiles ?? {}));
  const directories = new Set<string>(initialDirs ?? []);
  const messages: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let exitCode: number | undefined;

  const consoleLike: ConsoleLike = {
    log: (...args: unknown[]) => {
      messages.push(args.join(' '));
    },
    error: (...args: unknown[]) => {
      errors.push(args.join(' '));
    },
    warn: (...args: unknown[]) => {
      warnings.push(args.join(' '));
    },
  };

  const exists = (target: string) => files.has(target) || directories.has(target);

  return {
    console: consoleLike,
    process: {
      cwd: () => '/project',
      env: {},
      getExitCode: () => exitCode,
      setExitCode: (code: number) => {
        exitCode = code;
      },
    },
    fs: {
      existsSync: exists,
      writeFileSync: (target: string, content: string | NodeJS.ArrayBufferView) => {
        files.set(target, content.toString());
      },
      readFileSync: (target: string) => {
        const value = files.get(target);
        if (value === undefined) {
          throw new Error(`File not found: ${target}`);
        }
        return value;
      },
      appendFileSync: mock(() => {
        throw new Error('appendFileSync should not be used in init');
      }),
      mkdirSync: (target: string, options?: { recursive?: boolean }) => {
        if (options?.recursive === false) {
          throw new Error('init mkdirSync should always be recursive');
        }
        directories.add(target);
      },
      readdirSync: mock(() => []),
      unlinkSync: mock(() => {}),
      copyFileSync: mock(() => {}),
    },
    path,
    logger: () => ({
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
      exception: mock(() => {}),
    }),
    messages,
    errors,
    warnings,
    exitCode,
    files,
    directories,
  };
}

describe('runInit', () => {
  test('creates required directories and setup command when missing', () => {
    const deps = createMockInitDeps();

    const result = runInit(deps);

    expect(result.success).toBeTrue();
    if (!result.success) return;

    const claudeDir = path.join('/project', '.claude');
    const commandsDir = path.join(claudeDir, 'commands');
    const setupPath = path.join(commandsDir, 'setup-cc-track.md');

    expect(result.data?.createdClaudeDir).toBeTrue();
    expect(result.data?.createdCommandsDir).toBeTrue();
    expect(result.data?.createdSetupCommand).toBeTrue();
    expect(deps.directories.has(claudeDir)).toBeTrue();
    expect(deps.directories.has(commandsDir)).toBeTrue();
    expect(deps.files.get(setupPath)).toContain('# Setup cc-track for this project');
  });

  test('skips setup command when it already exists', () => {
    const setupPath = path.join('/project', '.claude', 'commands', 'setup-cc-track.md');
    const deps = createMockInitDeps({ [setupPath]: 'existing content' }, [
      path.join('/project', '.claude'),
      path.join('/project', '.claude', 'commands'),
    ]);

    const result = runInit(deps);

    expect(result.success).toBeTrue();
    if (!result.success) return;
    expect(result.messages).toContain('⚠️ setup-cc-track.md already exists. Skipping creation.');
    expect(deps.files.get(setupPath)).toBe('existing content');
  });

  test('returns failure when filesystem throws', () => {
    const deps = createMockInitDeps();
    deps.fs.mkdirSync = () => {
      throw new Error('permission denied');
    };

    const result = runInit(deps);

    expect(result.success).toBeFalse();
    if (result.success) return;
    expect(result.error).toContain('Failed to initialize cc-track');
    expect(result.exitCode).toBe(1);
  });
});

describe('createInitCommand', () => {
  test('exposes expected metadata', () => {
    const command = createInitCommand();
    expect(command.name()).toBe('init');
    expect(command.description()).toBe('Initialize cc-track in your project');
    const handler = (command as unknown as { _actionHandler?: unknown })._actionHandler;
    expect(typeof handler).toBe('function');
  });
});

describe('exported initCommand', () => {
  test('is pre-configured command instance', () => {
    expect(initCommand.name()).toBe('init');
  });
});
