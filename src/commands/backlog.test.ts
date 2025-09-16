import { describe, expect, mock, test } from 'bun:test';
import path from 'node:path';
import { type BacklogDeps, backlogCommand, createBacklogCommand, runBacklog } from './backlog';
import type { ConsoleLike } from './context';

interface MockBacklogDeps extends BacklogDeps {
  logs: string[];
  errors: string[];
  warnings: string[];
  exitCode?: number;
  files: Map<string, string>;
}

function createMockBacklogDeps(initialFiles?: Record<string, string>): MockBacklogDeps {
  const files = new Map<string, string>(Object.entries(initialFiles ?? {}));
  const logs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let exitCode: number | undefined;

  const consoleLike: ConsoleLike = {
    log: (...args: unknown[]) => {
      logs.push(args.join(' '));
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
    path,
    process: {
      cwd: () => '/project',
      env: {},
      getExitCode: () => exitCode,
      setExitCode: (code: number) => {
        exitCode = code;
      },
    },
    fs: {
      existsSync: (targetPath: string) => files.has(targetPath),
      readFileSync: (targetPath: string) => {
        const value = files.get(targetPath);
        if (value === undefined) {
          throw new Error(`File not found: ${targetPath}`);
        }
        return value;
      },
      writeFileSync: (targetPath: string, content: string | NodeJS.ArrayBufferView) => {
        files.set(targetPath, content.toString());
      },
      appendFileSync: (targetPath: string, content: string | NodeJS.ArrayBufferView) => {
        const previous = files.get(targetPath) ?? '';
        files.set(targetPath, `${previous}${content.toString()}`);
      },
      mkdirSync: mock(() => {}),
      readdirSync: mock(() => []),
      unlinkSync: mock(() => {}),
      copyFileSync: mock(() => {}),
    },
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
    logs,
    errors,
    warnings,
    exitCode,
    files,
  };
}

describe('runBacklog', () => {
  test('fails when no items are provided', () => {
    const deps = createMockBacklogDeps();

    const result = runBacklog([], {}, deps);

    expect(result.success).toBeFalse();
    if (result.success) return;
    expect(result.error).toContain('No items provided');
    expect(result.exitCode).toBe(1);
  });

  test('creates backlog file and appends items when missing', () => {
    const deps = createMockBacklogDeps();

    const result = runBacklog(['Improve docs', 'Refactor parser'], {}, deps);

    expect(result.success).toBeTrue();
    if (!result.success) return;

    const backlogPath = path.join('/project', '.claude', 'backlog.md');
    const fileContent = deps.files.get(backlogPath);
    expect(fileContent).toBeDefined();
    expect(fileContent).toContain('# Backlog');
    expect(fileContent).toContain('[2025-01-01] Improve docs');
    expect(fileContent).toContain('[2025-01-01] Refactor parser');
    expect(result.messages).toEqual(['✅ Added 2 item(s) to backlog', '  - Improve docs', '  - Refactor parser']);
  });

  test('lists backlog content when file exists', () => {
    const backlogPath = path.join('/project', '.claude', 'backlog.md');
    const deps = createMockBacklogDeps({
      [backlogPath]: '# Backlog\n\n## Items\n- Existing item\n',
    });

    const result = runBacklog([], { list: true }, deps);

    expect(result.success).toBeTrue();
    if (!result.success) return;

    expect(result.data?.content).toContain('Existing item');
    expect(result.messages?.[0]).toContain('Existing item');
  });

  test('reports failure when filesystem throws', () => {
    const deps = createMockBacklogDeps();
    deps.fs.writeFileSync = () => {
      throw new Error('disk full');
    };

    const result = runBacklog(['Improve docs'], {}, deps);

    expect(result.success).toBeFalse();
    if (result.success) return;
    expect(result.error).toContain('Failed to update backlog');
  });
});

describe('createBacklogCommand', () => {
  test('creates command with expected metadata', () => {
    const command = createBacklogCommand();
    expect(command.name()).toBe('backlog');
    expect(command.description()).toBe('Add items to the project backlog');

    const optionFlags = command.options.map((option) => option.long);
    expect(optionFlags).toContain('--list');
    expect(optionFlags).toContain('--file');
    const handler = (command as unknown as { _actionHandler?: unknown })._actionHandler;
    expect(typeof handler).toBe('function');
  });
});

describe('exported backlogCommand', () => {
  test('is instantiated command', () => {
    expect(backlogCommand.name()).toBe('backlog');
  });
});
