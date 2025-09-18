import { describe, expect, test } from 'bun:test';
import { createMockLogger } from '../test-utils/command-mocks';
import { completeTaskCommand, createCompleteTaskCommand } from './complete-task';

describe('complete-task command wiring', () => {
  test('has correct name and description', () => {
    expect(completeTaskCommand.name()).toBe('complete-task');
    expect(completeTaskCommand.description()).toBe('Mark the active task as completed');
  });

  test('has expected options', () => {
    const options = completeTaskCommand.options;
    const optionNames = options.map((opt) => opt.long);

    expect(optionNames).toContain('--no-squash');
    expect(optionNames).toContain('--no-branch');
    expect(optionNames).toContain('--skip-validation');
    expect(optionNames).toContain('--message');
  });

  test('factory creates command with action handler', () => {
    const command = createCompleteTaskCommand();
    const handler = (command as unknown as { _actionHandler?: unknown })._actionHandler;
    expect(typeof handler).toBe('function');
  });

  test('command handler sets exit code on failure', async () => {
    const messages: string[] = [];
    const errors: string[] = [];
    let exitCode: number | undefined;

    const command = createCompleteTaskCommand({
      console: {
        log: (...args: unknown[]) => {
          messages.push(args.join(' '));
        },
        error: (...args: unknown[]) => {
          errors.push(args.join(' '));
        },
        warn: () => {},
      },
      process: {
        cwd: () => '/project',
        env: {},
        getExitCode: () => exitCode,
        setExitCode: (code: number) => {
          exitCode = code;
        },
      },
      fs: {
        existsSync: () => false,
        readFileSync: () => '',
        writeFileSync: () => {},
        appendFileSync: () => {},
        mkdirSync: () => {},
        readdirSync: () => [],
        unlinkSync: () => {},
        copyFileSync: () => {},
      },
      logger: () => createMockLogger(),
    });

    command.exitOverride();
    await command.parseAsync(['node', 'test', '--skip-validation'], { from: 'node' });

    expect(exitCode).toBe(1);
    const combined = [...messages, ...errors];
    expect(combined.some((line) => line.includes('Task Completion Failed'))).toBeTrue();
    expect(combined.join(' ')).toContain('CLAUDE.md not found');
  });
});
