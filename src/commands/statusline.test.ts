import { describe, expect, test } from 'bun:test';
import { statuslineCommand } from './statusline';

describe('statusline command', () => {
  test('has correct name and description', () => {
    expect(statuslineCommand.name()).toBe('statusline');
    expect(statuslineCommand.description()).toBe('Generate status line for Claude Code');
  });

  test('has no required arguments', () => {
    const args = statuslineCommand.args;
    expect(args).toHaveLength(0);
  });

  test('has no options', () => {
    const options = statuslineCommand.options;
    expect(options).toHaveLength(0);
  });

  test('has an action handler', () => {
    expect(statuslineCommand.commands).toHaveLength(0);
    // Verify the command has an action handler configured
    const handler = (statuslineCommand as unknown as { _actionHandler: unknown })._actionHandler;
    expect(typeof handler).toBe('function');
  });
});
