import { describe, expect, test } from 'bun:test';
import { createTaskFromIssueCommand } from './create-task-from-issue';

describe('create-task-from-issue command', () => {
  test('has correct name and description', () => {
    expect(createTaskFromIssueCommand.name()).toBe('task-from-issue');
    expect(createTaskFromIssueCommand.description()).toBe('Create a cc-track task from a GitHub issue');
  });

  test('has expected options', () => {
    const options = createTaskFromIssueCommand.options;
    const optionNames = options.map((opt) => opt.long);

    expect(optionNames).toContain('--no-branch');
    expect(optionNames).toContain('--no-research');
  });

  test('has expected arguments', () => {
    const args = createTaskFromIssueCommand.registeredArguments;
    expect(args.length).toBe(1);

    const issueArg = args[0];
    expect(issueArg.name()).toBe('issue');
    expect(issueArg.description).toBe('GitHub issue number or URL');
  });

  test('command structure is correct', () => {
    // Basic validation that command has expected structure
    expect(createTaskFromIssueCommand.name()).toBe('task-from-issue');
    expect(createTaskFromIssueCommand.options).toBeDefined();
    expect(createTaskFromIssueCommand.options.length).toBeGreaterThan(0);
    expect(createTaskFromIssueCommand.registeredArguments).toBeDefined();
    expect(createTaskFromIssueCommand.registeredArguments.length).toBe(1);
  });

  test('option descriptions are correct', () => {
    const options = createTaskFromIssueCommand.options;
    const branchOption = options.find((opt) => opt.long === '--no-branch');
    const researchOption = options.find((opt) => opt.long === '--no-research');

    expect(branchOption?.description).toBe('Skip branch creation');
    expect(researchOption?.description).toBe('Skip comprehensive research (create basic task only)');
  });
});
