import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mock } from 'bun:test';
import {
  type TempProject,
  captureSystemState,
  createMockPlan,
  createTempProject,
  runHook,
  runHookChain,
  ClaudeSDKStub,
} from '../test-utils/integration-helpers';

describe('Hook Chain Integration Tests', () => {
  let project: TempProject;
  let claudeStub: ClaudeSDKStub;

  beforeEach(async () => {
    claudeStub = new ClaudeSDKStub();
    mock.restore();
  });

  afterEach(() => {
    if (project) {
      project.cleanup();
    }
    mock.restore();
  });

  test('edit validation blocks subsequent hooks on TypeScript errors', async () => {
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
            target: 'ES2020',
            module: 'commonjs',
          },
        }),
        'src/index.ts': 'export const x = 1;',
      },
    });

    // Create a task first
    claudeStub.setDefaultResponse({
      text: '# Task\n\n## Requirements\n- [ ] Fix types',
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';
    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('Fix types', 'Fix type errors') },
      },
      project.projectDir
    );
    delete process.env.CLAUDE_CODE_EXECUTABLE;

    // Write file with type error
    project.writeFile('src/bad.ts', 'const x: string = 123; // Type error');

    // Run edit validation hook
    const editResult = await runHook(
      'edit-validation',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '/src/bad.ts',
          old_string: '',
          new_string: 'const x: string = 123;',
        },
      },
      project.projectDir
    );

    // Should block due to type error
    expect(editResult).toHaveProperty('continue', false);
    expect(editResult.system_message).toContain('Type');

    // Fix the error and try again
    project.writeFile('src/bad.ts', 'const x: string = "123";');

    const editResult2 = await runHook(
      'edit-validation',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '/src/bad.ts',
          old_string: 'const x: string = 123;',
          new_string: 'const x: string = "123";',
        },
      },
      project.projectDir
    );

    // Should pass now
    expect(editResult2).toHaveProperty('continue', true);
  });

  test('capture plan triggers GitHub issue and branch creation in sequence', async () => {
    project = await createTempProject({
      gitInit: true,
      githubEnabled: true,
      trackConfig: {
        github_integration: {
          enabled: true,
          auto_create_issues: true,
          use_issue_branches: true,
        },
      },
    });

    // Mock GitHub commands
    const issueNumber = 42;
    const originalExecSync = require('child_process').execSync;
    const execMock = mock((command: string, options: any) => {
      const cmd = command.toString();

      if (cmd.includes('gh auth status')) {
        return 'Logged in';
      }
      if (cmd.includes('gh issue create')) {
        return JSON.stringify({ number: issueNumber, url: `https://github.com/test/repo/issues/${issueNumber}` });
      }

      return originalExecSync(command, options);
    });

    require('child_process').execSync = execMock;

    claudeStub.setDefaultResponse({
      text: '# Task\n\n## Requirements\n- [ ] Implement feature',
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    const plan = createMockPlan('GitHub integrated task', 'Task with GitHub integration');

    // Run capture-plan hook
    const captureResult = await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan },
      },
      project.projectDir
    );

    require('child_process').execSync = originalExecSync;
    delete process.env.CLAUDE_CODE_EXECUTABLE;

    expect(captureResult).toHaveProperty('continue', true);

    // Verify GitHub issue was created and branch uses issue number
    const state = captureSystemState(project.projectDir);
    expect(state.gitBranch).toContain(`${issueNumber}`);

    const taskContent = project.readFile('.claude/tasks/TASK_001.md');
    expect(taskContent).toContain(`<!-- github_issue: ${issueNumber} -->`);
  });

  test('stop-review auto-commits when changes are present', async () => {
    project = await createTempProject({
      gitInit: true,
      trackConfig: {
        stop_review: true,
      },
    });

    // Create a task
    claudeStub.setDefaultResponse({
      text: '# Task\n\n## Requirements\n- [ ] Make changes',
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';
    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('Make changes', 'Task requiring changes') },
      },
      project.projectDir
    );

    // Make changes
    project.writeFile('src/new-file.ts', 'export const newCode = true;');
    project.execInProject('git add src/new-file.ts');

    // Verify uncommitted changes exist
    const stateBefore = captureSystemState(project.projectDir);
    expect(stateBefore.uncommittedChanges).toBe(true);

    // Mock Claude's review
    claudeStub.setResponse(/review.*changes/i, {
      text: JSON.stringify({
        decision: 'continue',
        reason: 'Changes align with task requirements',
      }),
      success: true,
    });

    // Run stop-review hook
    const stopResult = await runHook(
      'stop-review',
      {
        hook_event_name: 'Stop',
      },
      project.projectDir
    );

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    expect(stopResult).toHaveProperty('continue', true);

    // Verify changes were committed
    const stateAfter = captureSystemState(project.projectDir);
    expect(stateAfter.uncommittedChanges).toBe(false);
    expect(stateAfter.lastCommitMessage).toContain('wip');
  });

  test('hook chain: edit → validation → stop → review', async () => {
    project = await createTempProject({
      gitInit: true,
      trackConfig: {
        edit_validation: true,
        stop_review: true,
      },
      initialFiles: {
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            strict: true,
          },
        }),
      },
    });

    // Create task
    claudeStub.setDefaultResponse({
      text: '# Task\n\n## Requirements\n- [ ] Add features',
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';
    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('Add features', 'Adding new features') },
      },
      project.projectDir
    );

    // Chain of hooks simulating real workflow
    const hooks = [
      {
        name: 'edit-validation',
        input: {
          hook_event_name: 'PostToolUse' as const,
          tool_name: 'Write',
          tool_input: {
            file_path: '/src/feature.ts',
            content: 'export const feature = (): string => "implemented";',
          },
        },
      },
      {
        name: 'stop-review',
        input: {
          hook_event_name: 'Stop' as const,
        },
      },
    ];

    // Actually write the file
    project.writeFile('src/feature.ts', 'export const feature = (): string => "implemented";');
    project.execInProject('git add src/feature.ts');

    claudeStub.setResponse(/review/i, {
      text: JSON.stringify({
        decision: 'continue',
        reason: 'Good implementation',
      }),
      success: true,
    });

    const results = await runHookChain(hooks, project.projectDir);

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    // All hooks should pass
    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty('continue', true); // edit-validation
    expect(results[1]).toHaveProperty('continue', true); // stop-review

    // Changes should be committed
    const state = captureSystemState(project.projectDir);
    expect(state.uncommittedChanges).toBe(false);
  });

  test('pre-tool-validation prevents edits on protected branches', async () => {
    project = await createTempProject({
      gitInit: true,
      trackConfig: {
        branch_protection: {
          enabled: true,
          protected_branches: ['main', 'master'],
        },
      },
    });

    // We're on main branch by default
    const stateBefore = captureSystemState(project.projectDir);
    expect(stateBefore.gitBranch).toBe('main');

    // Try to edit a file on main branch
    const editResult = await runHook(
      'pre-tool-validation',
      {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: {
          file_path: '/src/protected.ts',
          content: 'export const x = 1;',
        },
      },
      project.projectDir
    );

    // Should be blocked
    expect(editResult).toHaveProperty('continue', false);
    expect(editResult.user_message).toContain('protected branch');

    // Create and switch to feature branch
    project.execInProject('git checkout -b feature/allowed');

    // Try edit again on feature branch
    const editResult2 = await runHook(
      'pre-tool-validation',
      {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: {
          file_path: '/src/protected.ts',
          content: 'export const x = 1;',
        },
      },
      project.projectDir
    );

    // Should be allowed now
    expect(editResult2).toHaveProperty('continue', true);
  });

  test('hook blocking prevents downstream hooks from running', async () => {
    project = await createTempProject({
      gitInit: true,
      trackConfig: {
        edit_validation: true,
        stop_review: true,
      },
      initialFiles: {
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            strict: true,
            noImplicitAny: true,
          },
        }),
      },
    });

    // Create invalid TypeScript file
    project.writeFile('src/error.ts', 'const x: string = 123;');

    const hooks = [
      {
        name: 'edit-validation',
        input: {
          hook_event_name: 'PostToolUse' as const,
          tool_name: 'Edit',
          tool_input: {
            file_path: '/src/error.ts',
          },
        },
      },
      {
        name: 'stop-review',
        input: {
          hook_event_name: 'Stop' as const,
        },
      },
    ];

    const results = await runHookChain(hooks, project.projectDir);

    // Only first hook should run (and block)
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty('continue', false);
    expect(results[0].system_message).toContain('Type');
  });
});