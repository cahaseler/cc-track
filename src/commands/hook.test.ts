import { describe, expect, test } from 'bun:test';
import { hookCommand } from './hook';

describe('hook command', () => {
  test('has correct name and description', () => {
    expect(hookCommand.name()).toBe('hook');
    expect(hookCommand.description()).toBe('Handle Claude Code hook events (reads JSON from stdin)');
  });

  test('has expected options', () => {
    const options = hookCommand.options;
    const optionNames = options.map((opt) => opt.long);

    expect(optionNames).toContain('--type');
    expect(optionNames).toContain('--debug');
  });

  test('type option descriptions are correct', () => {
    const typeOption = hookCommand.options.find((opt) => opt.long === '--type');
    const debugOption = hookCommand.options.find((opt) => opt.long === '--debug');

    expect(typeOption?.description).toBe(
      'hook type to execute (capture-plan, edit-validation, pre-compact, post-compact, stop-review)',
    );
    expect(debugOption?.description).toBe('enable debug logging');
  });
});
