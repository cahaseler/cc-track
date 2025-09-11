import { describe, expect, test } from 'bun:test';
import { backlogCommand } from './backlog';

describe('backlog command', () => {
  test('has correct name and description', () => {
    expect(backlogCommand.name()).toBe('backlog');
    expect(backlogCommand.description()).toBe('Add items to the project backlog');
  });

  test('has expected options', () => {
    const options = backlogCommand.options;
    const optionNames = options.map((opt) => opt.long);

    expect(optionNames).toContain('--list');
    expect(optionNames).toContain('--file');
  });

  test('command structure is correct', () => {
    // Basic validation that command has expected structure
    expect(backlogCommand.name()).toBe('backlog');
    expect(backlogCommand.options).toBeDefined();
    expect(backlogCommand.options.length).toBeGreaterThan(0);
  });

  test('option descriptions are correct', () => {
    const options = backlogCommand.options;
    const listOption = options.find((opt) => opt.long === '--list');
    const fileOption = options.find((opt) => opt.long === '--file');

    expect(listOption?.description).toBe('list current backlog items');
    expect(fileOption?.description).toBe('backlog file path (default: .claude/backlog.md)');
  });
});
