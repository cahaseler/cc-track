import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mock } from 'bun:test';
import {
  type TempProject,
  captureSystemState,
  createMockPlan,
  createCapturePlanInput,
  createTempProject,
  runCommand,
  runHook,
  ClaudeSDKStub,
  GitHubAPIStub,
} from '../test-utils/integration-helpers';

describe('Task Lifecycle Integration Tests', () => {
  let project: TempProject;
  let claudeStub: ClaudeSDKStub;
  let githubStub: GitHubAPIStub;

  beforeEach(async () => {
    claudeStub = new ClaudeSDKStub();
    githubStub = new GitHubAPIStub();
    mock.restore();
  });

  afterEach(() => {
    if (project) {
      project.cleanup();
    }
    mock.restore();
  });

  test('complete task workflow without GitHub integration', async () => {
    // Create project with git but no GitHub
    project = await createTempProject({
      gitInit: true,
      githubEnabled: false,
    });

    // Create a mock plan
    const plan = createMockPlan(
      'Implement new feature',
      'Add a new feature to the application'
    );

    // Capture plan (simulate ExitPlanMode hook)
    const planInput = createCapturePlanInput(plan);

    // Mock the Claude SDK for task enrichment
    claudeStub.setResponse(/Research the codebase/, {
      text: `# Task: Implement new feature

## Requirements
- [ ] Implement the feature
- [ ] Add tests
- [ ] Update documentation

## Success Criteria
- All tests pass
- Feature works as expected`,
      success: true,
    });

    // Run capture-plan hook with mocked Claude SDK
    const originalEnv = process.env.CLAUDE_CODE_EXECUTABLE;
    process.env.CLAUDE_CODE_EXECUTABLE = 'echo'; // Mock the executable

    const captureResult = await runHook('capture-plan', planInput, project.projectDir);

    process.env.CLAUDE_CODE_EXECUTABLE = originalEnv;

    // Debug: Log the result to see what's happening
    console.log('Capture result:', captureResult);

    // Verify task was created
    expect(captureResult).toHaveProperty('continue', true);

    const state1 = captureSystemState(project.projectDir);
    console.log('System state:', state1);
    expect(state1.activeTask).toBe('TASK_001');
    expect(state1.taskFiles).toContain('TASK_001.md');
    expect(state1.gitBranch).toBe('feature/implement-new-feature-001');

    // Simulate some development work
    project.writeFile('src/feature.ts', 'export function newFeature() { return "implemented"; }');
    project.execInProject('git add src/feature.ts');

    // Run stop-review hook
    const stopReviewInput = {
      hook_event_name: 'Stop' as const,
    };

    const stopResult = await runHook('stop-review', stopReviewInput, project.projectDir);
    expect(stopResult).toHaveProperty('continue', true);

    // Check that changes were committed
    const state2 = captureSystemState(project.projectDir);
    expect(state2.uncommittedChanges).toBe(false);
    expect(state2.lastCommitMessage).toContain('wip');

    // Complete the task
    const completeResult = await runCommand(
      'complete-task',
      ['--skip-validation'],
      project.projectDir
    );

    expect(completeResult.exitCode).toBe(0);

    // Verify final state
    const state3 = captureSystemState(project.projectDir);
    expect(state3.activeTask).toBeUndefined();
    expect(state3.gitBranch).toBe('main');

    // Check that task file was updated
    const taskContent = project.readFile('.claude/tasks/TASK_001.md');
    expect(taskContent).toContain('**Status:** completed');
  });

  test('complete task workflow with GitHub integration', async () => {
    // Create project with git and GitHub
    project = await createTempProject({
      gitInit: true,
      githubEnabled: true,
      trackConfig: {
        github_integration: {
          enabled: true,
          auto_create_issues: true,
          use_issue_branches: true,
          auto_create_prs: true,
        },
      },
    });

    // Mock GitHub CLI commands
    const originalExecSync = require('child_process').execSync;
    const execMock = mock((command: string, options: any) => {
      const cmd = command.toString();

      // Mock gh commands
      if (cmd.includes('gh auth status')) {
        return 'Logged in to github.com';
      }
      if (cmd.includes('gh issue create')) {
        const issue = githubStub.createIssue('Task 001', 'Task body');
        return JSON.stringify(issue);
      }
      if (cmd.includes('gh pr create')) {
        const pr = githubStub.createPR('Complete TASK_001', 'PR body', 'feature/task-001');
        return JSON.stringify(pr);
      }
      if (cmd.includes('gh pr list')) {
        return JSON.stringify([]);
      }

      // Let git commands through
      return originalExecSync(command, options);
    });

    require('child_process').execSync = execMock;

    // Create a mock plan
    const plan = createMockPlan(
      'Add GitHub feature',
      'Implement GitHub integration feature'
    );

    // Capture plan
    const planInput = createCapturePlanInput(plan);

    claudeStub.setResponse(/Research the codebase/, {
      text: `# Task: Add GitHub feature

## Requirements
- [ ] Implement GitHub integration
- [ ] Add tests
- [ ] Create PR

## Success Criteria
- GitHub integration works
- PR created successfully`,
      success: true,
    });

    // Mock the Claude executable
    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    const captureResult = await runHook('capture-plan', planInput, project.projectDir);

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    // Verify task and issue were created
    expect(captureResult).toHaveProperty('continue', true);

    const state1 = captureSystemState(project.projectDir);
    expect(state1.activeTask).toBe('TASK_001');
    expect(state1.gitBranch).toContain('feature/');

    // Check task file has GitHub metadata
    const taskContent = project.readFile('.claude/tasks/TASK_001.md');
    expect(taskContent).toContain('<!-- github_issue: 1 -->');

    // Make changes and complete
    project.writeFile('src/github.ts', 'export const github = "integrated";');
    project.execInProject('git add -A');
    project.execInProject('git commit -m "wip: changes"');

    // Complete task with PR creation
    const completeResult = await runCommand(
      'complete-task',
      ['--skip-validation'],
      project.projectDir
    );

    // Restore original execSync
    require('child_process').execSync = originalExecSync;

    expect(completeResult.exitCode).toBe(0);
    expect(completeResult.stdout).toContain('PR created');

    // Verify PR was created
    const prs = githubStub.listPRs();
    expect(prs).toHaveLength(1);
    expect(prs[0].title).toContain('TASK_001');
  });

  test('task workflow handles validation failures gracefully', async () => {
    // Create project with validation enabled
    project = await createTempProject({
      gitInit: true,
      trackConfig: {
        edit_validation: true,
      },
      initialFiles: {
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            strict: true,
            noImplicitAny: true,
          },
        }),
        'biome.json': JSON.stringify({
          linter: {
            enabled: true,
            rules: {
              style: {
                noVar: 'error',
              },
            },
          },
        }),
      },
    });

    // Create a task
    const plan = createMockPlan('Add typed feature', 'Add a strongly typed feature');

    claudeStub.setDefaultResponse({
      text: `# Task: Add typed feature

## Requirements
- [ ] Add TypeScript code
- [ ] Ensure no type errors`,
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan },
      },
      project.projectDir
    );

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    // Try to complete with TypeScript errors
    project.writeFile('src/bad.ts', 'var x: string = 123; // Type error and lint error');
    project.execInProject('git add -A');

    // Run prepare-completion to check validation
    const prepareResult = await runCommand('prepare-completion', [], project.projectDir);

    // Should indicate validation failures
    expect(prepareResult.exitCode).toBe(1);
    expect(prepareResult.stdout).toMatch(/TypeScript errors|validation/i);

    // Fix the errors
    project.writeFile('src/bad.ts', 'const x: string = "123";');
    project.execInProject('git add -A');

    // Now should be ready
    const prepareResult2 = await runCommand('prepare-completion', [], project.projectDir);
    expect(prepareResult2.exitCode).toBe(0);

    // Complete successfully
    const completeResult = await runCommand(
      'complete-task',
      ['--skip-validation'],
      project.projectDir
    );

    expect(completeResult.exitCode).toBe(0);
  });

  test('task workflow with compaction and context preservation', async () => {
    project = await createTempProject({
      gitInit: true,
    });

    // Create initial task
    const plan1 = createMockPlan('First task', 'Initial implementation task');

    claudeStub.setDefaultResponse({
      text: `# Task: First task

## Requirements
- [ ] Complete first implementation

## Recent Progress
- Started implementation`,
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: plan1 },
      },
      project.projectDir
    );

    // Add progress to task
    const taskPath = '.claude/tasks/TASK_001.md';
    let taskContent = project.readFile(taskPath);
    taskContent = taskContent.replace(
      '## Recent Progress\n- Started implementation',
      '## Recent Progress\n- Started implementation\n- Made significant progress\n- Fixed bug in implementation'
    );
    project.writeFile(taskPath, taskContent);

    // Simulate pre-compact hook
    claudeStub.setResponse(/Update the task file/, {
      text: taskContent.replace('## Recent Progress', '## Recent Progress\n- Compaction occurred'),
      success: true,
    });

    const preCompactResult = await runHook(
      'pre-compact',
      {
        hook_event_name: 'SessionStart',
      },
      project.projectDir
    );

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    expect(preCompactResult).toHaveProperty('continue', true);

    // Check that progress was preserved
    const updatedTask = project.readFile(taskPath);
    expect(updatedTask).toContain('Made significant progress');
    expect(updatedTask).toContain('Fixed bug in implementation');

    // Verify context is imported in CLAUDE.md
    const claudeMd = project.readFile('CLAUDE.md');
    expect(claudeMd).toContain('@.claude/tasks/TASK_001.md');
  });

  test('multiple sequential tasks with proper state transitions', async () => {
    project = await createTempProject({
      gitInit: true,
    });

    claudeStub.setDefaultResponse({
      text: `# Task: Generic task\n\n## Requirements\n- [ ] Do work\n\n## Success Criteria\n- Work done`,
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    // Create and complete first task
    const plan1 = createMockPlan('Task One', 'First task');
    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: plan1 },
      },
      project.projectDir
    );

    expect(captureSystemState(project.projectDir).activeTask).toBe('TASK_001');

    project.writeFile('src/task1.ts', 'export const task1 = true;');
    project.execInProject('git add -A && git commit -m "wip: task 1"');

    await runCommand('complete-task', ['--skip-validation'], project.projectDir);

    const state1 = captureSystemState(project.projectDir);
    expect(state1.activeTask).toBeUndefined();
    expect(state1.gitBranch).toBe('main');

    // Create and complete second task
    const plan2 = createMockPlan('Task Two', 'Second task');
    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: plan2 },
      },
      project.projectDir
    );

    expect(captureSystemState(project.projectDir).activeTask).toBe('TASK_002');

    project.writeFile('src/task2.ts', 'export const task2 = true;');
    project.execInProject('git add -A && git commit -m "wip: task 2"');

    await runCommand('complete-task', ['--skip-validation'], project.projectDir);

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    const state2 = captureSystemState(project.projectDir);
    expect(state2.activeTask).toBeUndefined();
    expect(state2.gitBranch).toBe('main');

    // Verify both tasks are completed
    const task1Content = project.readFile('.claude/tasks/TASK_001.md');
    const task2Content = project.readFile('.claude/tasks/TASK_002.md');
    expect(task1Content).toContain('**Status:** completed');
    expect(task2Content).toContain('**Status:** completed');

    // Verify task numbers incremented properly
    expect(state2.taskFiles).toContain('TASK_001.md');
    expect(state2.taskFiles).toContain('TASK_002.md');
  });
});