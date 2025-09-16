import { describe, expect, mock, test } from 'bun:test';
import path from 'node:path';
import { embeddedTemplates } from '../lib/embedded-resources';
import type { ConsoleLike } from './context';
import {
  createSetupTemplatesCommand,
  runSetupTemplates,
  type SetupTemplatesDeps,
  setupTemplatesCommand,
} from './setup-templates';

interface MockSetupTemplatesDeps extends SetupTemplatesDeps {
  messages: string[];
  errors: string[];
  warnings: string[];
  exitCode?: number;
  files: Map<string, string>;
  directories: Set<string>;
}

function createMockTemplatesDeps(
  initialFiles?: Record<string, string>,
  initialDirs?: string[],
): MockSetupTemplatesDeps {
  const files = new Map<string, string>(Object.entries(initialFiles ?? {}));
  const directories = new Set<string>(initialDirs ?? []);
  const messages: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let exitCode: number | undefined;

  const consoleLike: ConsoleLike = {
    log: (...args: unknown[]) => messages.push(args.join(' ')),
    error: (...args: unknown[]) => errors.push(args.join(' ')),
    warn: (...args: unknown[]) => warnings.push(args.join(' ')),
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
      existsSync: (target: string) => files.has(target) || directories.has(target),
      mkdirSync: (target: string, options?: { recursive?: boolean }) => {
        if (options?.recursive === false) {
          throw new Error('mkdirSync must be recursive');
        }
        directories.add(target);
      },
      copyFileSync: (source: string, destination: string) => {
        const value = files.get(source);
        if (value === undefined) {
          throw new Error(`File not found: ${source}`);
        }
        files.set(destination, value);
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
        throw new Error('appendFileSync should not be used in setup-templates');
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
    directories,
  };
}

describe('runSetupTemplates', () => {
  test('creates templates and CLAUDE.md when missing', () => {
    const deps = createMockTemplatesDeps();

    const result = runSetupTemplates(deps);

    expect(result.success).toBeTrue();
    if (!result.success) return;

    const claudeDir = path.join('/project', '.claude');
    expect(deps.directories.has(claudeDir)).toBeTrue();

    for (const filename of Object.keys(embeddedTemplates)) {
      const targetPath = filename === 'CLAUDE.md' ? path.join('/project', filename) : path.join(claudeDir, filename);
      expect(deps.files.has(targetPath)).toBeTrue();
    }
    expect(result.data?.created).toContain('CLAUDE.md');
  });

  test('backs up CLAUDE.md when already present with Active Task section', () => {
    const claudeDir = path.join('/project', '.claude');
    const claudePath = path.join('/project', 'CLAUDE.md');
    const deps = createMockTemplatesDeps(
      {
        [claudePath]: '# Existing\n\n## Active Task\n',
      },
      [claudeDir],
    );

    const result = runSetupTemplates(deps);

    expect(result.success).toBeTrue();
    if (!result.success) return;
    expect(result.data?.skipped).toContain('CLAUDE.md');
  });

  test('returns failure when filesystem throws', () => {
    const deps = createMockTemplatesDeps();
    deps.fs.writeFileSync = () => {
      throw new Error('disk read-only');
    };

    const result = runSetupTemplates(deps);

    expect(result.success).toBeFalse();
    if (result.success) return;
    expect(result.error).toContain('Failed to set up templates');
    expect(result.exitCode).toBe(1);
  });
});

describe('createSetupTemplatesCommand', () => {
  test('exposes expected metadata', () => {
    const command = createSetupTemplatesCommand();
    expect(command.name()).toBe('setup-templates');
    expect(command.description()).toBe('Copy cc-track templates to your project');
    const handler = (command as unknown as { _actionHandler?: unknown })._actionHandler;
    expect(typeof handler).toBe('function');
  });
});

describe('exported setupTemplatesCommand', () => {
  test('is pre-configured command instance', () => {
    expect(setupTemplatesCommand.name()).toBe('setup-templates');
  });
});
