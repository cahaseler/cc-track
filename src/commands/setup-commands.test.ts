import { describe, expect, mock, test } from 'bun:test';
import path from 'node:path';
import { embeddedCommands } from '../lib/embedded-resources';
import type { ConsoleLike } from './context';
import {
  createSetupCommandsCommand,
  runSetupCommands,
  type SetupCommandsDeps,
  setupCommandsCommand,
} from './setup-commands';

interface MockSetupCommandsDeps extends SetupCommandsDeps {
  messages: string[];
  errors: string[];
  warnings: string[];
  exitCode?: number;
  files: Map<string, string>;
  backups: string[];
  directories: Set<string>;
}

function createMockSetupDeps(): MockSetupCommandsDeps {
  const files = new Map<string, string>();
  const directories = new Set<string>();
  const backups: string[] = [];
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
      existsSync: (target: string) => directories.has(target) || files.has(target),
      mkdirSync: (target: string, options?: { recursive?: boolean }) => {
        if (options?.recursive === false) {
          throw new Error('mkdirSync must be recursive');
        }
        directories.add(target);
      },
      copyFileSync: (source: string, destination: string) => {
        const content = files.get(source);
        if (content === undefined) {
          throw new Error(`Source not found: ${source}`);
        }
        files.set(destination, content);
        backups.push(destination);
      },
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
        throw new Error('appendFileSync should not be used in setup-commands');
      }),
      readdirSync: mock(() => []),
      unlinkSync: mock(() => {}),
    },
    path,
    time: {
      now: () => new Date('2025-01-01T00:00:00Z'),
      todayISO: () => '2025-01-01',
    },
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
    backups,
    directories,
  };
}

describe('runSetupCommands', () => {
  test('installs embedded commands', () => {
    const deps = createMockSetupDeps();

    const result = runSetupCommands(deps);

    expect(result.success).toBeTrue();
    if (!result.success) return;

    const targetDir = path.join('/project', '.claude', 'commands');
    expect(deps.directories.has(targetDir)).toBeTrue();

    const expectedFiles = Object.keys(embeddedCommands).filter((filename) => filename !== 'setup-cc-track.md');
    for (const filename of expectedFiles) {
      const targetPath = path.join(targetDir, filename);
      expect(deps.files.has(targetPath)).toBeTrue();
    }
    expect(result.data?.installed.sort()).toEqual(expectedFiles.sort());
  });

  test('creates backup when command already exists', () => {
    const deps = createMockSetupDeps();
    const targetDir = path.join('/project', '.claude', 'commands');
    deps.directories.add(targetDir);

    const [firstCommand] = Object.entries(embeddedCommands).filter(([name]) => name !== 'setup-cc-track.md');
    if (firstCommand) {
      const [filename, content] = firstCommand;
      const targetPath = path.join(targetDir, filename);
      deps.files.set(targetPath, content);
    }

    const result = runSetupCommands(deps);
    expect(result.success).toBeTrue();
    if (!result.success) return;
    expect(deps.backups.length).toBeGreaterThanOrEqual(1);
  });

  test('reports failure when filesystem throws', () => {
    const deps = createMockSetupDeps();
    deps.fs.writeFileSync = () => {
      throw new Error('permission denied');
    };

    const result = runSetupCommands(deps);

    expect(result.success).toBeFalse();
    if (result.success) return;
    expect(result.error).toContain('Failed to set up commands');
    expect(result.exitCode).toBe(1);
  });
});

describe('createSetupCommandsCommand', () => {
  test('exposes expected metadata', () => {
    const command = createSetupCommandsCommand();
    expect(command.name()).toBe('setup-commands');
    expect(command.description()).toBe('Copy cc-track slash commands to your project');
    const handler = (command as unknown as { _actionHandler?: unknown })._actionHandler;
    expect(typeof handler).toBe('function');
  });
});

describe('exported setupCommandsCommand', () => {
  test('is pre-configured command instance', () => {
    expect(setupCommandsCommand.name()).toBe('setup-commands');
  });
});
