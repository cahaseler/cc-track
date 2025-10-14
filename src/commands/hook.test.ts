import { describe, expect, mock, test } from 'bun:test';
import { Readable } from 'node:stream';
import type { HookInput } from '../types';
import type { CommandDeps } from './context';
import { createHookCommand, determineHookType, hookCommand, runHookCommand } from './hook';

describe('hook command metadata', () => {
  test('createHookCommand returns configured command', () => {
    const command = createHookCommand();
    expect(command.name()).toBe('hook');
    expect(command.description()).toBe('Handle Claude Code hook events (reads JSON from stdin)');
    const handler = (command as unknown as { _actionHandler?: unknown })._actionHandler;
    expect(typeof handler).toBe('function');
  });

  test('exported hookCommand is pre-configured', () => {
    expect(hookCommand.name()).toBe('hook');
  });
});

describe('determineHookType', () => {
  test('routes pre-tool validation for Edit', () => {
    const input = { hook_event_name: 'PreToolUse', tool_name: 'Edit' } satisfies HookInput;
    expect(determineHookType(input)).toBe('pre-tool-validation');
  });

  test('routes edit-validation for PostToolUse with MultiEdit', () => {
    const input = { hook_event_name: 'PostToolUse', tool_name: 'MultiEdit' } satisfies HookInput;
    expect(determineHookType(input)).toBe('edit-validation');
  });

  test('returns null for unknown input', () => {
    expect(determineHookType({ hook_event_name: 'Unknown' })).toBeNull();
  });
});

describe('runHookCommand', () => {
  function createDeps() {
    const logs: string[] = [];
    const stderr: string[] = [];
    const stdout: string[] = [];

    const deps = {
      console: {
        log: (...args: unknown[]) => logs.push(args.join(' ')),
        error: (...args: unknown[]) => stderr.push(args.join(' ')),
        warn: (...args: unknown[]) => logs.push(args.join(' ')),
      },
      process: {
        cwd: () => '/project',
        env: {},
        getExitCode: () => undefined,
        setExitCode: () => {},
      },
      fs: {
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
        writeFileSync: mock(() => {}),
        appendFileSync: mock(() => {}),
        mkdirSync: mock(() => {}),
        readdirSync: mock(() => []),
        unlinkSync: mock(() => {}),
        copyFileSync: mock(() => {}),
      },
      childProcess: {
        execSync: mock(() => ''),
      },
      time: {
        now: () => new Date(),
        todayISO: () => '2025-01-01',
      },
      logger: () => ({
        debug: mock(() => {}),
        info: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
        exception: mock(() => {}),
      }),
      git: {
        getCurrentBranch: mock(() => 'main'),
        getDefaultBranch: mock(() => 'main'),
        getMergeBase: mock(() => 'HEAD~1'),
        isWipCommit: mock(() => false),
      },
      github: {
        createHelpers: mock(() => ({
          getIssue: mock(() => null),
          createIssueBranch: mock(() => null),
        })),
        pushCurrentBranch: mock(() => true),
      },
      config: {
        getConfig: mock(() => ({ features: {} })),
        getGitHubConfig: mock(() => ({})),
        isGitHubIntegrationEnabled: mock(() => false),
        isCodeReviewEnabled: mock(() => false),
      },
      claudeMd: {
        getActiveTaskId: mock(() => null),
        createHelpers: mock(() => ({})),
      },
      validation: {
        runValidationChecks: mock(),
      },
      claudeSdk: {} as typeof ClaudeSDK,
    } as unknown as CommandDeps;

    const stdoutStream: NodeJS.WritableStream = {
      write: (chunk: string) => {
        stdout.push(chunk.trim());
        return true;
      },
    } as NodeJS.WritableStream;

    return { deps, stdoutStream, logs, stdout };
  }

  test('returns error payload when JSON invalid', async () => {
    const { deps, stdoutStream, stdout } = createDeps();
    const result = await runHookCommand(deps, Readable.from(['not-json']), stdoutStream);
    expect(result.success).toBeFalse();
    // Error should be in messages, not written directly to stdout
    expect(result.messages?.[0]).toContain('error');
    expect(stdout).toHaveLength(0); // Should not write directly to stdout
  });

  test('does not output duplicate JSON - writes to messages only', async () => {
    const { deps, stdoutStream } = createDeps();

    // Test with unknown hook event (should return continue: true)
    const unknownInput = JSON.stringify({ hook_event_name: 'Unknown', cwd: '/project' });
    const result = await runHookCommand(deps, Readable.from([unknownInput]), stdoutStream);

    // Should be successful
    expect(result.success).toBeTrue();

    // Should have exactly one message in the result
    expect(result.messages).toHaveLength(1);
    expect(result.messages?.[0]).toBe('{"continue":true}');

    // Should NOT write directly to stdout (that's handled by applyCommandResult)
    // The stdoutStream.write should never be called in runHookCommand
    const stdout: string[] = [];
    const mockStdout: NodeJS.WritableStream = {
      write: (chunk: string) => {
        stdout.push(chunk);
        return true;
      },
    } as NodeJS.WritableStream;

    const result2 = await runHookCommand(deps, Readable.from([unknownInput]), mockStdout);
    expect(stdout).toHaveLength(0); // Should not write directly to stdout
    expect(result2.messages).toHaveLength(1); // But should have message in result
  });

  test('does not output duplicate JSON for handled hooks', async () => {
    const { deps } = createDeps();

    // Mock the handlers to return a specific response
    const mockHandlers = {
      'edit-validation': mock(async () => ({ continue: true, message: 'edit-validation ran' })),
    };

    const stdout: string[] = [];
    const mockStdout: NodeJS.WritableStream = {
      write: (chunk: string) => {
        stdout.push(chunk);
        return true;
      },
    } as NodeJS.WritableStream;

    const input = JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'Edit', cwd: '/project' });
    const result = await runHookCommand(deps, Readable.from([input]), mockStdout, mockHandlers as any);

    // Should not write directly to stdout
    expect(stdout).toHaveLength(0);

    // Should have exactly one message in result
    expect(result.messages).toHaveLength(1);
    expect(result.messages?.[0]).toContain('continue');
  });
});
