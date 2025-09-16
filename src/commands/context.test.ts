import { describe, expect, test } from 'bun:test';
import {
  applyCommandResult,
  CommandError,
  type CommandResult,
  handleCommandException,
  resolveCommandDeps,
} from './context';

function createMockDeps() {
  const logs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let exitCode: number | undefined;

  const deps = resolveCommandDeps({
    console: {
      log: (...args: unknown[]) => {
        logs.push(args.join(' '));
      },
      error: (...args: unknown[]) => {
        errors.push(args.join(' '));
      },
      warn: (...args: unknown[]) => {
        warnings.push(args.join(' '));
      },
    },
    process: {
      cwd: () => '/project',
      env: {},
      getExitCode: () => exitCode,
      setExitCode: (code: number) => {
        exitCode = code;
      },
    },
  });

  return {
    deps,
    logs,
    errors,
    warnings,
    get exitCode() {
      return exitCode;
    },
  };
}

describe('applyCommandResult', () => {
  test('logs messages and leaves exit code unset on success', () => {
    const state = createMockDeps();
    const { deps, logs, warnings } = state;
    const result: CommandResult = {
      success: true,
      messages: ['hello world'],
      warnings: ['be careful'],
    };

    applyCommandResult(result, deps);

    expect(logs).toContain('hello world');
    expect(warnings).toContain('be careful');
    expect(state.exitCode).toBeUndefined();
  });

  test('logs errors and sets exit code on failure', () => {
    const state = createMockDeps();
    const { deps, errors } = state;
    const result: CommandResult = {
      success: false,
      error: 'failed',
      exitCode: 3,
      details: 'more detail',
    };

    applyCommandResult(result, deps);

    expect(errors).toContain('failed');
    expect(errors.some((err) => err.includes('more detail'))).toBeTrue();
    expect(state.exitCode).toBe(3);
  });
});

describe('handleCommandException', () => {
  test('handles CommandError instances', () => {
    const state = createMockDeps();
    const { deps, errors } = state;
    const err = new CommandError('problem occurred', { exitCode: 7, details: 'context detail' });

    handleCommandException(err, deps);

    expect(errors).toContain('problem occurred');
    expect(state.exitCode).toBe(7);
  });

  test('handles unexpected errors', () => {
    const state = createMockDeps();
    const { deps, errors } = state;

    handleCommandException(new Error('boom'), deps);

    expect(errors.some((msg) => msg.includes('Unexpected error'))).toBeTrue();
    expect(state.exitCode).toBe(1);
  });
});
