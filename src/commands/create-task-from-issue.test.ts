import { describe, expect, mock, test } from 'bun:test';
import type { CreateTaskDeps } from './create-task-from-issue';
import {
  createTaskFromIssue,
  createTaskFromIssueCommand,
  createTaskFromIssueCommandFactory,
} from './create-task-from-issue';

function createMockDeps(overrides: Partial<CreateTaskDeps> = {}): CreateTaskDeps {
  const execCalls: string[] = [];
  const execSync = mock((command: string) => {
    execCalls.push(command);
    return '';
  });

  const existsSync = mock((path: string) => path.includes('.claude'));
  const mkdirSync = mock(() => {});
  const readdirSync = mock(() => [] as string[]);
  const readFileSync = mock(() => '# Existing content');
  const writeFileSync = mock(() => {});
  const unlinkSync = mock(() => {});
  const cwd = mock(() => '/project');

  const githubHelpers = {
    getIssue: mock(() => ({
      number: 42,
      title: 'Fix bug',
      url: 'https://github.com/example/repo/issues/42',
      body: 'Bug details',
      state: 'open',
    })),
    createIssueBranch: mock(() => 'feature/issue-42'),
  } as any;

  const claudeMdHelpers = {
    setActiveTask: mock(() => {}),
  } as any;

  return {
    execSync: overrides.execSync ?? execSync,
    existsSync: overrides.existsSync ?? existsSync,
    mkdirSync: overrides.mkdirSync ?? mkdirSync,
    readdirSync: overrides.readdirSync ?? readdirSync,
    readFileSync: overrides.readFileSync ?? readFileSync,
    writeFileSync: overrides.writeFileSync ?? writeFileSync,
    unlinkSync: overrides.unlinkSync ?? unlinkSync,
    cwd: overrides.cwd ?? cwd,
    githubHelpers: overrides.githubHelpers ?? githubHelpers,
    claudeMdHelpers: overrides.claudeMdHelpers ?? claudeMdHelpers,
    enrichPlan: overrides.enrichPlan ?? mock(async () => true),
    findNextTask: overrides.findNextTask ?? mock(() => 1),
    getActiveTaskId: overrides.getActiveTaskId ?? mock(() => null),
    logger:
      overrides.logger ??
      ({
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
        exception: () => {},
      } as ReturnType<typeof createTaskFromIssueCommandFactory>),
  } satisfies CreateTaskDeps;
}

describe('create-task-from-issue command metadata', () => {
  test('factory returns command with options and arguments', () => {
    const command = createTaskFromIssueCommandFactory();
    expect(command.name()).toBe('task-from-issue');
    const optionNames = command.options.map((opt) => opt.long);
    expect(optionNames).toContain('--no-branch');
    expect(optionNames).toContain('--no-research');
    const args = (command as unknown as { registeredArguments: Array<{ name: () => string }> }).registeredArguments;
    expect(args[0].name()).toBe('issue');
  });

  test('exported command is configured', () => {
    expect(createTaskFromIssueCommand.name()).toBe('task-from-issue');
  });
});

describe('createTaskFromIssue', () => {
  test('fails if not a cc-track project', async () => {
    const deps = createMockDeps({ existsSync: mock(() => false) });
    const result = await createTaskFromIssue('1', {}, deps);
    expect(result.success).toBeFalse();
    expect(result.error).toContain('Not a cc-track project');
  });

  test('fails when GitHub issue cannot be fetched', async () => {
    const deps = createMockDeps({
      githubHelpers: {
        getIssue: mock(() => null),
      } as any,
    });
    const result = await createTaskFromIssue('1', {}, deps);
    expect(result.success).toBeFalse();
    expect(result.error).toContain('Failed to fetch issue');
  });

  test('fails when another task is active', async () => {
    const deps = createMockDeps({
      getActiveTaskId: mock(() => 'TASK_010'),
    });
    const result = await createTaskFromIssue('1', {}, deps);
    expect(result.success).toBeFalse();
    expect(result.error).toContain('currently active');
  });

  test('creates task with research', async () => {
    const enrichPlan = mock(async () => true);
    const deps = createMockDeps({ enrichPlan });
    const result = await createTaskFromIssue('1', {}, deps);
    expect(result.success).toBeTrue();
    expect(enrichPlan).toHaveBeenCalled();
    expect(result.data?.taskId).toBe('001');
    expect(deps.githubHelpers.createIssueBranch).toHaveBeenCalled();
  });

  test('creates task without research', async () => {
    const deps = createMockDeps({ enrichPlan: mock(async () => true) });
    const result = await createTaskFromIssue('1', { research: false }, deps);
    expect(result.success).toBeTrue();
    expect(result.data?.taskPath).toContain('TASK_001.md');
  });

  test('skips branch creation when disabled', async () => {
    const githubHelpers = {
      getIssue: mock(() => ({
        number: 42,
        title: 'Fix bug',
        url: 'https://github.com/example/repo/issues/42',
        body: 'Bug details',
        state: 'open',
      })),
      createIssueBranch: mock(() => 'feature/issue-42'),
    } as any;
    const deps = createMockDeps({ githubHelpers });
    const result = await createTaskFromIssue('1', { branch: false }, deps);
    expect(result.success).toBeTrue();
    expect(githubHelpers.createIssueBranch).not.toHaveBeenCalled();
  });

  test('returns failure when research enrichment fails', async () => {
    const deps = createMockDeps({ enrichPlan: mock(async () => false) });
    const result = await createTaskFromIssue('1', {}, deps);
    expect(result.success).toBeFalse();
    expect(result.error).toContain('Failed to enrich task');
  });
});
