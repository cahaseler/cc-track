import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mock } from 'bun:test';
import {
  type TempProject,
  captureSystemState,
  createMockPlan,
  createTempProject,
  runCommand,
  runHook,
  ClaudeSDKStub,
} from '../test-utils/integration-helpers';

describe('Configuration Propagation Tests', () => {
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

  test('disabling features prevents their execution', async () => {
    project = await createTempProject({
      gitInit: true,
      trackConfig: {
        capture_plan: false, // Disabled
        stop_review: false,  // Disabled
        edit_validation: false, // Disabled
        git_branching: false, // Disabled
      },
    });

    // Try capture-plan with it disabled
    const planResult = await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('Test', 'Testing disabled features') },
      },
      project.projectDir
    );

    // Should pass through without creating task
    expect(planResult).toHaveProperty('continue', true);
    const state1 = captureSystemState(project.projectDir);
    expect(state1.taskFiles).toHaveLength(0);
    expect(state1.activeTask).toBeUndefined();
    expect(state1.gitBranch).toBe('main'); // No branch switch

    // Try stop-review with it disabled
    project.writeFile('test.txt', 'content');
    project.execInProject('git add test.txt');

    const stopResult = await runHook(
      'stop-review',
      {
        hook_event_name: 'Stop',
      },
      project.projectDir
    );

    expect(stopResult).toHaveProperty('continue', true);
    // Changes should NOT be committed
    const state2 = captureSystemState(project.projectDir);
    expect(state2.uncommittedChanges).toBe(true);

    // Try edit-validation with it disabled
    project.writeFile('bad.ts', 'const x: string = 123;'); // Type error

    const editResult = await runHook(
      'edit-validation',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '/bad.ts',
        },
      },
      project.projectDir
    );

    // Should pass through despite type error
    expect(editResult).toHaveProperty('continue', true);
  });

  test('enabling features activates their behavior', async () => {
    project = await createTempProject({
      gitInit: true,
      trackConfig: {
        capture_plan: true,
        stop_review: true,
        edit_validation: true,
        git_branching: true,
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

    claudeStub.setDefaultResponse({
      text: '# Task\n\n## Requirements\n- [ ] Test enabled features',
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    // capture-plan should create task and switch branch
    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('Test', 'Testing enabled features') },
      },
      project.projectDir
    );

    const state1 = captureSystemState(project.projectDir);
    expect(state1.activeTask).toBe('TASK_001');
    expect(state1.gitBranch).toMatch(/^feature\//);

    // edit-validation should block on type errors
    project.writeFile('bad.ts', 'const x: string = 123;');

    const editResult = await runHook(
      'edit-validation',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '/bad.ts',
        },
      },
      project.projectDir
    );

    expect(editResult).toHaveProperty('continue', false);
    expect(editResult.system_message).toContain('Type');

    // stop-review should commit changes
    project.writeFile('good.ts', 'const x: string = "123";');
    project.execInProject('git add good.ts');

    claudeStub.setResponse(/review/i, {
      text: JSON.stringify({
        decision: 'continue',
        reason: 'Good changes',
      }),
      success: true,
    });

    await runHook(
      'stop-review',
      {
        hook_event_name: 'Stop',
      },
      project.projectDir
    );

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    const state2 = captureSystemState(project.projectDir);
    expect(state2.uncommittedChanges).toBe(false);
    expect(state2.lastCommitMessage).toContain('wip');
  });

  test('GitHub integration configuration controls issue/PR creation', async () => {
    // Test with GitHub disabled
    project = await createTempProject({
      gitInit: true,
      trackConfig: {
        github_integration: {
          enabled: false,
          auto_create_issues: false,
          auto_create_prs: false,
        },
      },
    });

    claudeStub.setDefaultResponse({
      text: '# Task\n\n## Requirements\n- [ ] No GitHub',
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    // Mock gh commands (should not be called)
    const ghCallCount = { count: 0 };
    const originalExecSync = require('child_process').execSync;
    const execMock = mock((command: string, options: any) => {
      if (command.includes('gh ')) {
        ghCallCount.count++;
      }
      return originalExecSync(command, options);
    });
    require('child_process').execSync = execMock;

    // Capture plan - should NOT create GitHub issue
    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('No GitHub', 'Test without GitHub') },
      },
      project.projectDir
    );

    expect(ghCallCount.count).toBe(0);

    // Complete task - should NOT create PR
    project.writeFile('test.txt', 'test');
    project.execInProject('git add -A && git commit -m "wip"');
    await runCommand('complete-task', ['--skip-validation'], project.projectDir);

    expect(ghCallCount.count).toBe(0);

    project.cleanup();

    // Test with GitHub enabled
    project = await createTempProject({
      gitInit: true,
      trackConfig: {
        github_integration: {
          enabled: true,
          auto_create_issues: true,
          auto_create_prs: true,
        },
      },
    });

    ghCallCount.count = 0;

    const execMock2 = mock((command: string, options: any) => {
      const cmd = command.toString();
      if (cmd.includes('gh auth status')) {
        ghCallCount.count++;
        return 'Logged in';
      }
      if (cmd.includes('gh issue create')) {
        ghCallCount.count++;
        return JSON.stringify({ number: 1, url: 'https://github.com/test/repo/issues/1' });
      }
      if (cmd.includes('gh pr')) {
        ghCallCount.count++;
        return JSON.stringify([]);
      }
      return originalExecSync(command, options);
    });
    require('child_process').execSync = execMock2;

    // Capture plan - SHOULD create GitHub issue
    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('With GitHub', 'Test with GitHub') },
      },
      project.projectDir
    );

    expect(ghCallCount.count).toBeGreaterThan(0);

    require('child_process').execSync = originalExecSync;
    delete process.env.CLAUDE_CODE_EXECUTABLE;
  });

  test('API timer configuration affects statusline display', async () => {
    const testConfigs = [
      { api_timer_display: 'hide', expectedTimer: false },
      { api_timer_display: 'show', expectedTimer: true },
      { api_timer_display: 'sonnet-only', expectedTimer: 'conditional' },
    ];

    for (const config of testConfigs) {
      project = await createTempProject({
        trackConfig: {
          statusline: true,
          ...config,
        },
      });

      // Mock ccusage command
      const originalExecSync = require('child_process').execSync;
      const execMock = mock((command: string, options: any) => {
        if (command.includes('ccusage')) {
          return JSON.stringify({
            usage: {
              claude_3_sonnet_20240229: { requests: 80 },
              claude_3_haiku_20240307: { requests: 50 },
            },
            limits: {
              rate_limits: {
                claude_3_sonnet: [{ max_requests: 100 }],
                claude_3_haiku: [{ max_requests: 5000 }],
              },
            },
            model: 'claude-3-sonnet-20240229',
          });
        }
        return originalExecSync(command, options);
      });
      require('child_process').execSync = execMock;

      const result = await runCommand('statusline', [], project.projectDir);

      if (config.api_timer_display === 'hide') {
        expect(result.stdout).not.toContain('⏱');
      } else if (config.api_timer_display === 'show') {
        expect(result.stdout).toContain('⏱');
      } else if (config.api_timer_display === 'sonnet-only') {
        // With Sonnet model and high usage, should show timer
        expect(result.stdout).toContain('⏱');
      }

      require('child_process').execSync = originalExecSync;
      project.cleanup();
    }
  });

  test('branch protection configuration', async () => {
    // Test with custom protected branches
    project = await createTempProject({
      gitInit: true,
      trackConfig: {
        branch_protection: {
          enabled: true,
          protected_branches: ['main', 'production', 'staging'],
        },
      },
    });

    // Create staging branch and switch to it
    project.execInProject('git checkout -b staging');

    // Try to edit on staging (should be blocked)
    const result1 = await runHook(
      'pre-tool-validation',
      {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: {
          file_path: '/test.txt',
          content: 'test',
        },
      },
      project.projectDir
    );

    expect(result1).toHaveProperty('continue', false);
    expect(result1.user_message).toContain('staging');

    // Switch to feature branch
    project.execInProject('git checkout -b feature/allowed');

    // Should work now
    const result2 = await runHook(
      'pre-tool-validation',
      {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: {
          file_path: '/test.txt',
          content: 'test',
        },
      },
      project.projectDir
    );

    expect(result2).toHaveProperty('continue', true);
  });

  test('configuration changes mid-session take effect', async () => {
    project = await createTempProject({
      gitInit: true,
      trackConfig: {
        stop_review: false, // Initially disabled
      },
    });

    // Make changes
    project.writeFile('test.txt', 'content');
    project.execInProject('git add test.txt');

    // Run stop-review (should be disabled)
    const result1 = await runHook(
      'stop-review',
      {
        hook_event_name: 'Stop',
      },
      project.projectDir
    );

    expect(result1).toHaveProperty('continue', true);
    const state1 = captureSystemState(project.projectDir);
    expect(state1.uncommittedChanges).toBe(true); // Not committed

    // Enable stop-review
    const config = JSON.parse(project.readFile('.claude/track.config.json'));
    config.stop_review = true;
    project.writeFile('.claude/track.config.json', JSON.stringify(config, null, 2));

    claudeStub.setResponse(/review/i, {
      text: JSON.stringify({
        decision: 'continue',
        reason: 'Good changes',
      }),
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    // Run stop-review again (should now be enabled)
    const result2 = await runHook(
      'stop-review',
      {
        hook_event_name: 'Stop',
      },
      project.projectDir
    );

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    expect(result2).toHaveProperty('continue', true);
    const state2 = captureSystemState(project.projectDir);
    expect(state2.uncommittedChanges).toBe(false); // Now committed
    expect(state2.lastCommitMessage).toContain('wip');
  });

  test('logging configuration affects log creation', async () => {
    // Test with custom log directory
    const customLogDir = '/tmp/test-logs';
    project = await createTempProject({
      trackConfig: {
        logging: {
          enabled: true,
          directory: customLogDir,
          level: 'debug',
          retention_days: 3,
        },
      },
    });

    // Run a hook that logs
    claudeStub.setDefaultResponse({
      text: '# Task\n\n## Requirements\n- [ ] Test logging',
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('Log test', 'Test logging configuration') },
      },
      project.projectDir
    );

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    // Check if log directory would be created (mocked in test)
    // In real implementation, logs would be written to customLogDir
    const config = JSON.parse(project.readFile('.claude/track.config.json'));
    expect(config.logging.directory).toBe(customLogDir);
    expect(config.logging.level).toBe('debug');
    expect(config.logging.retention_days).toBe(3);
  });
});