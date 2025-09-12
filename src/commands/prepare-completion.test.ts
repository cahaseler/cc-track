import { describe, expect, test } from 'bun:test';
import { createPrepareCompletionCommand } from './prepare-completion';

describe('prepare-completion command', () => {
  test('has correct name and description', () => {
    const command = createPrepareCompletionCommand();
    expect(command.name()).toBe('prepare-completion');
    expect(command.description()).toBe(
      'Prepare task for completion by running validation and generating fix instructions',
    );
  });

  test('has no options', () => {
    const command = createPrepareCompletionCommand();
    const options = command.options;
    expect(options).toHaveLength(0);
  });
});
