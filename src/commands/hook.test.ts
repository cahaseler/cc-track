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

  test('routes capture-plan when plan present in payload', () => {
    const input = {
      hook_event_name: 'PostToolUse',
      tool_name: 'SomeTool',
      tool_response: { plan: 'do something' },
    } satisfies HookInput;
    expect(determineHookType(input)).toBe('capture-plan');
  });

  test('routes PreCompact and Stop events', () => {
    expect(determineHookType({ hook_event_name: 'PreCompact' })).toBe('pre-compact');
    expect(determineHookType({ hook_event_name: 'Stop' })).toBe('stop-review');
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
        clearActiveTask: mock(() => {}),
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
    expect(stdout.some((line) => line.includes('error'))).toBeTrue();
  });
});
