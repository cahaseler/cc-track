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

describe('Context Management Integration Tests', () => {
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

  test('CLAUDE.md import system correctly references active task', async () => {
    project = await createTempProject({
      gitInit: true,
    });

    // Initially should reference no_active_task.md
    let claudeMd = project.readFile('CLAUDE.md');
    expect(claudeMd).toContain('@.claude/no_active_task.md');
    expect(claudeMd).not.toMatch(/@\.claude\/tasks\/TASK_\d+\.md/);

    // Create first task
    claudeStub.setDefaultResponse({
      text: '# Task 001\n\n## Requirements\n- [ ] First task',
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('First task', 'First context test task') },
      },
      project.projectDir,
    );

    // Should now reference TASK_001.md
    claudeMd = project.readFile('CLAUDE.md');
    expect(claudeMd).toContain('@.claude/tasks/TASK_001.md');
    expect(claudeMd).not.toContain('@.claude/no_active_task.md');

    // Complete the task
    project.writeFile('src/task1.ts', 'export const task1 = true;');
    project.execInProject('git add -A && git commit -m "wip: task 1"');
    await runCommand('complete-task', ['--skip-validation'], project.projectDir);

    // Should be back to no_active_task.md
    claudeMd = project.readFile('CLAUDE.md');
    expect(claudeMd).toContain('@.claude/no_active_task.md');
    expect(claudeMd).not.toMatch(/@\.claude\/tasks\/TASK_\d+\.md/);

    // Create second task
    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('Second task', 'Second context test task') },
      },
      project.projectDir,
    );

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    // Should reference TASK_002.md
    claudeMd = project.readFile('CLAUDE.md');
    expect(claudeMd).toContain('@.claude/tasks/TASK_002.md');
    expect(claudeMd).not.toContain('TASK_001.md');
  });

  test('task file progress updates are preserved through compaction', async () => {
    project = await createTempProject({
      gitInit: true,
    });

    // Create task with initial progress
    claudeStub.setDefaultResponse({
      text: `# Task: Long running task

## Requirements
- [ ] Phase 1
- [ ] Phase 2
- [ ] Phase 3

## Recent Progress
- Started implementation
- Set up project structure`,
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('Long task', 'Task spanning multiple sessions') },
      },
      project.projectDir,
    );

    // Add more progress manually
    const taskPath = '.claude/tasks/TASK_001.md';
    let taskContent = project.readFile(taskPath);
    taskContent = taskContent.replace(
      '## Recent Progress\n- Started implementation\n- Set up project structure',
      `## Recent Progress
- Started implementation
- Set up project structure
- Completed Phase 1
- Working on Phase 2
- Fixed critical bug in Phase 2`,
    );
    project.writeFile(taskPath, taskContent);

    // Simulate pre-compact updating progress
    claudeStub.setResponse(/Update the task file/i, {
      text: taskContent.replace(
        '## Recent Progress',
        `## Recent Progress\n- [Compaction at ${new Date().toISOString()}]`,
      ),
      success: true,
    });

    await runHook(
      'pre-compact',
      {
        hook_event_name: 'SessionStart',
      },
      project.projectDir,
    );

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    // Progress should be preserved
    const updatedTask = project.readFile(taskPath);
    expect(updatedTask).toContain('Started implementation');
    expect(updatedTask).toContain('Set up project structure');
    expect(updatedTask).toContain('Completed Phase 1');
    expect(updatedTask).toContain('Working on Phase 2');
    expect(updatedTask).toContain('Fixed critical bug');
  });

  test('context files are created with proper structure', async () => {
    project = await createTempProject({});

    // Check all context files exist and have correct structure
    const contextFiles = ['.claude/product_context.md', '.claude/no_active_task.md', 'CLAUDE.md'];

    for (const file of contextFiles) {
      expect(project.fileExists(file)).toBe(true);
    }

    // Verify product_context has expected sections
    const productContext = project.readFile('.claude/product_context.md');
    expect(productContext).toContain('# Product Context');

    // Verify CLAUDE.md has imports
    const claudeMd = project.readFile('CLAUDE.md');
    expect(claudeMd).toContain('@.claude/no_active_task.md');
    expect(claudeMd).toContain('@.claude/product_context.md');

    // Create decision log entry
    const decisionLog = `# Decision Log

## Log Entries

[2025-01-01 12:00] - Test Decision
- **Context:** Testing decision logging
- **Decision:** Use integration tests
- **Rationale:** Better coverage of real workflows`;

    project.writeFile('.claude/decision_log.md', decisionLog);

    // Add to CLAUDE.md
    let updatedClaudeMd = project.readFile('CLAUDE.md');
    updatedClaudeMd += '\n## Decision Log\n@.claude/decision_log.md\n';
    project.writeFile('CLAUDE.md', updatedClaudeMd);

    // Verify decision log is imported
    const finalClaudeMd = project.readFile('CLAUDE.md');
    expect(finalClaudeMd).toContain('@.claude/decision_log.md');
  });

  test('plan files are captured and stored correctly', async () => {
    project = await createTempProject({
      gitInit: true,
    });

    claudeStub.setDefaultResponse({
      text: '# Task\n\n## Requirements\n- [ ] Test plan capture',
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    const plans = [
      createMockPlan('First plan', 'First plan description'),
      createMockPlan('Second plan', 'Second plan description'),
      createMockPlan('Third plan', 'Third plan description'),
    ];

    // Capture multiple plans
    for (let i = 0; i < plans.length; i++) {
      await runHook(
        'capture-plan',
        {
          hook_event_name: 'PostToolUse',
          tool_name: 'ExitPlanMode',
          exit_plan_mode_data: { plan: plans[i] },
        },
        project.projectDir,
      );

      if (i < plans.length - 1) {
        // Complete task before next one (except last)
        project.execInProject('git add -A && git commit -m "wip"');
        await runCommand('complete-task', ['--skip-validation'], project.projectDir);
      }
    }

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    // Check plan files were created
    const state = captureSystemState(project.projectDir);
    expect(state.planFiles.length).toBeGreaterThanOrEqual(3);

    // Verify plan content is preserved
    const plan001 = project.readFile('.claude/plans/001.md');
    expect(plan001).toContain('First plan');
    expect(plan001).toContain('First plan description');

    const plan002 = project.readFile('.claude/plans/002.md');
    expect(plan002).toContain('Second plan');

    const plan003 = project.readFile('.claude/plans/003.md');
    expect(plan003).toContain('Third plan');
  });

  test('backlog management through commands', async () => {
    project = await createTempProject({});

    // Create initial backlog
    const backlogContent = `# Backlog

## Items
- [2025-01-01] First backlog item
- [2025-01-02] Second backlog item
`;

    project.writeFile('.claude/backlog.md', backlogContent);

    // Add new item via command
    const result = await runCommand('backlog', ['Third backlog item with special chars!'], project.projectDir);

    expect(result.exitCode).toBe(0);

    // Check backlog was updated
    const updatedBacklog = project.readFile('.claude/backlog.md');
    expect(updatedBacklog).toContain('First backlog item');
    expect(updatedBacklog).toContain('Second backlog item');
    expect(updatedBacklog).toContain('Third backlog item with special chars!');

    // Verify date was added
    const dateMatch = updatedBacklog.match(/\[\d{4}-\d{2}-\d{2}\] Third backlog item/);
    expect(dateMatch).toBeTruthy();
  });

  test('user context and system patterns preservation', async () => {
    project = await createTempProject({});

    // Create user context
    const userContext = `# User Context

## Communication Preferences
- Direct and honest communication
- Technical accuracy valued

## Working Style
- Prefers simple solutions
- YAGNI principle advocate
`;

    project.writeFile('.claude/user_context.md', userContext);

    // Create system patterns
    const systemPatterns = `# System Patterns

## Architectural Patterns
- Hook-based architecture
- File-based state management

## Coding Standards
- TypeScript with strict mode
- Comprehensive testing
`;

    project.writeFile('.claude/system_patterns.md', systemPatterns);

    // Update CLAUDE.md to import them
    let claudeMd = project.readFile('CLAUDE.md');
    claudeMd += `
## User Context
@.claude/user_context.md

## System Patterns
@.claude/system_patterns.md
`;
    project.writeFile('CLAUDE.md', claudeMd);

    // Create a task to verify context is available
    claudeStub.setDefaultResponse({
      text: '# Task\n\n## Requirements\n- [ ] Follow patterns',
      success: true,
    });

    process.env.CLAUDE_CODE_EXECUTABLE = 'echo';

    await runHook(
      'capture-plan',
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
        exit_plan_mode_data: { plan: createMockPlan('Pattern test', 'Test pattern preservation') },
      },
      project.projectDir,
    );

    delete process.env.CLAUDE_CODE_EXECUTABLE;

    // Verify context files are still imported after task creation
    const finalClaudeMd = project.readFile('CLAUDE.md');
    expect(finalClaudeMd).toContain('@.claude/user_context.md');
    expect(finalClaudeMd).toContain('@.claude/system_patterns.md');
    expect(finalClaudeMd).toContain('@.claude/tasks/TASK_001.md');

    // Verify content is preserved
    expect(project.readFile('.claude/user_context.md')).toContain('YAGNI principle');
    expect(project.readFile('.claude/system_patterns.md')).toContain('Hook-based architecture');
  });
});
