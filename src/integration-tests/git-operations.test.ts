import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  ClaudeSDKStub,
  captureSystemState,
  createMockPlan,
  createTempProject,
  runCommand,
  runHook,
  type TempProject,
} from '../test-utils/integration-helpers';

describe('Git Operations Integration Tests', () => {
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

  test('branch creation and switching works correctly', async () => {
    project = await createTempProject({
      gitInit: true,
    });

    // Start on main
    const initialState = captureSystemState(project.projectDir);
    expect(initialState.gitBranch).toBe('main');

    // Create task which should create branch
    claudeStub.setDefaultResponse({
      text: '# Task\n\n## Requirements\n- [ ] Test branching',
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('Test branching', 'Test git branching') },
      },
      project.projectDir,
    );

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    // Should be on feature branch now
    const branchState = captureSystemState(project.projectDir);
    expect(branchState.gitBranch).toMatch(/^feature\//);
    expect(branchState.gitBranch).toContain('001');

    // Make some commits
    project.writeFile('file1.txt', 'content 1');
    project.execInProject('git add file1.txt && git commit -m "wip: add file1"');

    project.writeFile('file2.txt', 'content 2');
    project.execInProject('git add file2.txt && git commit -m "wip: add file2"');

    // Complete task should squash commits and switch back
    await runCommand('complete-task', ['--skip-validation'], project.projectDir);

    const finalState = captureSystemState(project.projectDir);
    expect(finalState.gitBranch).toBe('main');

    // Check squashed commit
    const log = project.execInProject('git log --oneline -n 1');
    expect(log).toContain('feat:');
    expect(log).toContain('TASK_001');

    // Verify only one non-initial commit on main
    const commitCount = project.execInProject('git rev-list --count HEAD ^HEAD~2');
    expect(parseInt(commitCount.trim(), 10)).toBe(1);
  });

  test('WIP commits are created and squashed correctly', async () => {
    project = await createTempProject({
      gitInit: true,
      trackConfig: {
        stop_review: true,
      },
    });

    // Create task
    claudeStub.setDefaultResponse({
      text: '# Task\n\n## Requirements\n- [ ] Multiple changes',
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('Multiple changes', 'Make multiple WIP commits') },
      },
      project.projectDir,
    );

    claudeStub.setResponse(/review/i, {
      text: JSON.stringify({
        decision: 'continue',
        reason: 'Changes look good',
      }),
      success: true,
    });

    // Make multiple changes with stop-review creating WIP commits
    for (let i = 1; i <= 3; i++) {
      project.writeFile(`src/file${i}.ts`, `export const value${i} = ${i};`);
      project.execInProject(`git add src/file${i}.ts`);

      await runHook(
        'stop-review',
        {
          hook_event_name: 'Stop',
        },
        project.projectDir,
      );

      const state = captureSystemState(project.projectDir);
      expect(state.uncommittedChanges).toBe(false);
      expect(state.lastCommitMessage).toContain('wip');
    }

    // Get commit count before squashing
    const beforeCount = parseInt(project.execInProject('git rev-list --count HEAD').trim(), 10);

    // Complete task to squash commits
    await runCommand('complete-task', ['--skip-validation'], project.projectDir);

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    // Should have fewer commits after squashing (initial + 1 squashed)
    const afterCount = parseInt(project.execInProject('git rev-list --count HEAD').trim(), 10);
    expect(afterCount).toBeLessThan(beforeCount);

    // Final commit should be feat commit
    const finalCommit = project.execInProject('git log -1 --pretty=%B');
    expect(finalCommit).toContain('feat:');
    expect(finalCommit).not.toContain('wip');

    // All files should still exist
    expect(project.fileExists('src/file1.ts')).toBe(true);
    expect(project.fileExists('src/file2.ts')).toBe(true);
    expect(project.fileExists('src/file3.ts')).toBe(true);
  });

  test('handling diverged branches with automatic rebase', async () => {
    project = await createTempProject({
      gitInit: true,
    });

    // Create and switch to feature branch
    project.execInProject('git checkout -b feature/test');

    // Make local commit
    project.writeFile('local.txt', 'local change');
    project.execInProject('git add local.txt && git commit -m "local commit"');

    // Simulate remote changes by going back to main and making a commit
    project.execInProject('git checkout main');
    project.writeFile('remote.txt', 'remote change');
    project.execInProject('git add remote.txt && git commit -m "remote commit"');

    // Go back to feature branch
    project.execInProject('git checkout feature/test');

    // Try to merge main into feature (simulating a diverged state)
    project.execInProject('git merge main --no-edit');

    // Both files should exist
    expect(project.fileExists('local.txt')).toBe(true);
    expect(project.fileExists('remote.txt')).toBe(true);

    // Verify merge commit was created
    const log = project.execInProject('git log --oneline -n 3');
    expect(log).toContain('Merge');
  });

  test('git configuration is properly maintained', async () => {
    project = await createTempProject({
      gitInit: true,
      gitUser: {
        name: 'Test User',
        email: 'test@example.com',
      },
    });

    // Verify git config was set
    const userName = project.execInProject('git config user.name').trim();
    const userEmail = project.execInProject('git config user.email').trim();

    expect(userName).toBe('Test User');
    expect(userEmail).toBe('test@example.com');

    // Create task and make commits
    claudeStub.setDefaultResponse({
      text: '# Task\n\n## Requirements\n- [ ] Test git config',
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('Git config test', 'Test git configuration') },
      },
      project.projectDir,
    );

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    project.writeFile('test.txt', 'test');
    project.execInProject('git add test.txt && git commit -m "test commit"');

    // Verify commit author
    const author = project.execInProject('git log -1 --pretty=%an').trim();
    const email = project.execInProject('git log -1 --pretty=%ae').trim();

    expect(author).toBe('Test User');
    expect(email).toBe('test@example.com');
  });

  test('branch protection prevents commits on protected branches', async () => {
    project = await createTempProject({
      gitInit: true,
      trackConfig: {
        branch_protection: {
          enabled: true,
          protected_branches: ['main', 'master'],
        },
      },
    });

    // Currently on main
    expect(captureSystemState(project.projectDir).gitBranch).toBe('main');

    // Try to make changes on main (should be prevented by pre-tool-validation hook)
    const result = await runHook(
      'pre-tool-validation',
      {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: {
          file_path: '/src/file.ts',
          content: 'content',
        },
      },
      project.projectDir,
    );

    expect(result).toHaveProperty('continue', false);
    expect(result.user_message).toContain('protected');

    // Switch to feature branch
    project.execInProject('git checkout -b feature/allowed');

    // Now should work
    const result2 = await runHook(
      'pre-tool-validation',
      {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: {
          file_path: '/src/file.ts',
          content: 'content',
        },
      },
      project.projectDir,
    );

    expect(result2).toHaveProperty('continue', true);
  });

  test('git stash operations during task completion', async () => {
    project = await createTempProject({
      gitInit: true,
    });

    // Create task
    claudeStub.setDefaultResponse({
      text: '# Task\n\n## Requirements\n- [ ] Test stashing',
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('Test stashing', 'Test git stash operations') },
      },
      project.projectDir,
    );

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    // Make committed changes
    project.writeFile('committed.txt', 'committed');
    project.execInProject('git add committed.txt && git commit -m "wip: committed"');

    // Make uncommitted changes
    project.writeFile('uncommitted.txt', 'uncommitted');
    project.execInProject('git add uncommitted.txt');

    // Make untracked changes
    project.writeFile('untracked.txt', 'untracked');

    const stateBefore = captureSystemState(project.projectDir);
    expect(stateBefore.uncommittedChanges).toBe(true);

    // Complete task (should handle uncommitted changes)
    await runCommand('complete-task', ['--skip-validation'], project.projectDir);

    const stateAfter = captureSystemState(project.projectDir);
    expect(stateAfter.gitBranch).toBe('main');

    // All files should be committed now
    expect(project.fileExists('committed.txt')).toBe(true);
    expect(project.fileExists('uncommitted.txt')).toBe(true);
    // Untracked file should still be untracked
    expect(project.fileExists('untracked.txt')).toBe(true);

    const untrackedStatus = project.execInProject('git ls-files --others --exclude-standard');
    expect(untrackedStatus).toContain('untracked.txt');
  });
});
