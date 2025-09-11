import { describe, expect, test } from 'bun:test';
import { initCommand } from './init';

describe('init command', () => {
  test('has correct name and description', () => {
    expect(initCommand.name()).toBe('init');
    expect(initCommand.description()).toBe('Initialize cc-track in the current project');
  });

  test('has expected options', () => {
    const options = initCommand.options;
    const optionNames = options.map((opt) => opt.long);

    expect(optionNames).toContain('--force');
    expect(optionNames).toContain('--no-backup');
    expect(optionNames).toContain('--with-stop');
  });

  test('option descriptions are correct', () => {
    const options = initCommand.options;
    const forceOption = options.find((opt) => opt.long === '--force');
    const backupOption = options.find((opt) => opt.long === '--no-backup');
    const stopOption = options.find((opt) => opt.long === '--with-stop');

    expect(forceOption?.description).toBe('overwrite existing files');
    expect(backupOption?.description).toBe('skip backing up existing files');
    expect(stopOption?.description).toBe('enable stop review hook');
  });
});
