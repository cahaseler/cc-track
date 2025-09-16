import { describe, expect, mock, test } from 'bun:test';
import type { ConsoleLike } from './context';
import { createParseLogsCommand, type ParseLogsDeps, parseLogsCommand, runParseLogs } from './parse-logs';

interface MockParseLogsDeps extends ParseLogsDeps {
  messages: string[];
  errors: string[];
  warnings: string[];
  exitCode?: number;
  files: Set<string>;
  writtenFiles: Map<string, string>;
  parser: {
    parse: mock.Mock<Promise<string | unknown>, [options: unknown]>;
  };
}

function createMockParseDeps(existingFiles?: string[]): MockParseLogsDeps {
  const files = new Set(existingFiles ?? []);
  const writtenFiles = new Map<string, string>();
  const messages: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let exitCode: number | undefined;

  const consoleLike: ConsoleLike = {
    log: (...args: unknown[]) => messages.push(args.join(' ')),
    error: (...args: unknown[]) => errors.push(args.join(' ')),
    warn: (...args: unknown[]) => warnings.push(args.join(' ')),
  };

  const parser = {
    parse: mock(async () => 'parsed-content'),
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
      existsSync: (target: string) => files.has(target),
      writeFileSync: (target: string, content: string | NodeJS.ArrayBufferView) => {
        writtenFiles.set(target, content.toString());
      },
      readFileSync: mock(() => {
        throw new Error('readFileSync should not be used in parse-logs tests');
      }),
      appendFileSync: mock(() => {
        throw new Error('appendFileSync should not be used in parse-logs tests');
      }),
      mkdirSync: mock(() => {}),
      readdirSync: mock(() => []),
      unlinkSync: mock(() => {}),
      copyFileSync: mock(() => {}),
    },
    logger: () => ({
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
      exception: mock(() => {}),
    }),
    logParser: {
      create: mock(() => parser),
    },
    messages,
    errors,
    warnings,
    exitCode,
    files,
    writtenFiles,
    parser,
  };
}

describe('runParseLogs', () => {
  test('fails when file does not exist', async () => {
    const deps = createMockParseDeps();

    const result = await runParseLogs(
      {
        file: '/logs/session.jsonl',
        role: 'all',
        format: 'json',
        includeTools: true,
        raw: false,
      },
      deps,
    );

    expect(result.success).toBeFalse();
    if (result.success) return;
    expect(result.error).toContain('File not found');
  });

  test('fails when role is invalid', async () => {
    const deps = createMockParseDeps(['/logs/session.jsonl']);

    const result = await runParseLogs(
      {
        file: '/logs/session.jsonl',
        role: 'invalid' as any,
        format: 'json',
        includeTools: true,
        raw: false,
      },
      deps,
    );

    expect(result.success).toBeFalse();
    if (result.success) return;
    expect(result.error).toContain('Invalid role');
  });

  test('parses logs and returns output', async () => {
    const deps = createMockParseDeps(['/logs/session.jsonl']);
    deps.parser.parse.mockResolvedValueOnce('log output');

    const result = await runParseLogs(
      {
        file: '/logs/session.jsonl',
        role: 'all',
        format: 'plaintext',
        includeTools: true,
        raw: false,
      },
      deps,
    );

    expect(result.success).toBeTrue();
    if (!result.success) return;
    expect(result.messages?.[0]).toBe('log output');
  });

  test('writes output to file when requested', async () => {
    const deps = createMockParseDeps(['/logs/session.jsonl']);
    deps.parser.parse.mockResolvedValueOnce({ entries: [] });

    const result = await runParseLogs(
      {
        file: '/logs/session.jsonl',
        role: 'all',
        format: 'json',
        includeTools: false,
        raw: true,
        output: '/tmp/out.txt',
      },
      deps,
    );

    expect(result.success).toBeTrue();
    if (!result.success) return;
    expect(deps.writtenFiles.get('/tmp/out.txt')).toContain('{');
    expect(result.data?.writtenToFile).toBeTrue();
  });

  test('handles parser errors gracefully', async () => {
    const deps = createMockParseDeps(['/logs/session.jsonl']);
    deps.parser.parse.mockRejectedValueOnce(new Error('parser failed'));

    const result = await runParseLogs(
      {
        file: '/logs/session.jsonl',
        role: 'all',
        format: 'plaintext',
        includeTools: true,
        raw: false,
      },
      deps,
    );

    expect(result.success).toBeFalse();
    if (result.success) return;
    expect(result.error).toContain('Failed to parse logs');
  });
});

describe('createParseLogsCommand', () => {
  test('exposes expected metadata', () => {
    const command = createParseLogsCommand();
    expect(command.name()).toBe('parse-logs');
    expect(command.description()).toBe('Parse and filter Claude Code JSONL logs');
    const handler = (command as unknown as { _actionHandler?: unknown })._actionHandler;
    expect(typeof handler).toBe('function');
  });
});

describe('exported parseLogsCommand', () => {
  test('is pre-configured command instance', () => {
    expect(parseLogsCommand.name()).toBe('parse-logs');
  });
});
