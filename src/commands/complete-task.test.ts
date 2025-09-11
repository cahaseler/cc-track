import { describe, expect, test } from 'bun:test';
import { completeTaskCommand } from './complete-task';

describe('complete-task command', () => {
  test('has correct name and description', () => {
    expect(completeTaskCommand.name()).toBe('complete-task');
    expect(completeTaskCommand.description()).toBe('Mark the active task as completed');
  });

  test('has expected options', () => {
    const options = completeTaskCommand.options;
    const optionNames = options.map((opt) => opt.long);

    expect(optionNames).toContain('--no-squash');
    expect(optionNames).toContain('--no-branch');
    expect(optionNames).toContain('--message');
  });

  test('accepts custom message option', () => {
    const messageOption = completeTaskCommand.options.find((opt) => opt.long === '--message');
    expect(messageOption).toBeDefined();
    expect(messageOption?.description).toBe('custom completion commit message');
  });

  test('has boolean flags for squash and branch', () => {
    const noSquashOption = completeTaskCommand.options.find((opt) => opt.long === '--no-squash');
    const noBranchOption = completeTaskCommand.options.find((opt) => opt.long === '--no-branch');

    expect(noSquashOption).toBeDefined();
    expect(noBranchOption).toBeDefined();
    expect(noSquashOption?.description).toBe('skip squashing WIP commits');
    expect(noBranchOption?.description).toBe('skip branch operations');
  });
});
