import { describe, expect, test } from 'bun:test';
import { createValidationChecksCommand } from './validation-checks';

describe('validation-checks command', () => {
  test('has correct name and description', () => {
    const command = createValidationChecksCommand();
    expect(command.name()).toBe('validation-checks');
    expect(command.description()).toBe('Run validation checks for task completion');
  });

  test('has no options', () => {
    const command = createValidationChecksCommand();
    const options = command.options;
    expect(options).toHaveLength(0);
  });
});
