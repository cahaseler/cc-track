import type { execSync } from 'node:child_process';
import type { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { enrichPlanWithResearch, findNextTaskNumber } from '../hooks/capture-plan';
import { type ClaudeMdHelpers, getActiveTaskId } from '../lib/claude-md';
import type { GitHubHelpers } from '../lib/github-helpers';
import type { createLogger } from '../lib/logger';
import type { GitHubIssue } from '../types';
import type { CommandDeps } from './context';
import {
  applyCommandResult,
  type CommandResult,
  handleCommandException,
  type PartialCommandDeps,
  resolveCommandDeps,
} from './context';

/**
 * Create a task from a GitHub issue
 */
export interface CreateTaskDeps {
  execSync: typeof execSync;
  existsSync: typeof existsSync;
  mkdirSync: typeof mkdirSync;
  readdirSync: typeof readdirSync;
  readFileSync: typeof readFileSync;
  writeFileSync: typeof writeFileSync;
  unlinkSync: typeof unlinkSync;
  cwd: () => string;
  githubHelpers: GitHubHelpers;
  claudeMdHelpers: ClaudeMdHelpers;
  enrichPlan: typeof enrichPlanWithResearch;
  findNextTask: typeof findNextTaskNumber;
  getActiveTaskId: typeof getActiveTaskId;
  logger: ReturnType<typeof createLogger>;
}

export interface CreateIssueOptions {
  branch?: boolean;
  research?: boolean;
}

export interface CreateTaskResultData {
  taskPath: string;
  taskId: string;
  branchName?: string | null;
  issue: GitHubIssue;
}

function mapCreateTaskDeps(deps: CommandDeps): CreateTaskDeps {
  return {
    execSync: deps.childProcess.execSync,
    existsSync: deps.fs.existsSync,
    mkdirSync: deps.fs.mkdirSync,
    readdirSync: deps.fs.readdirSync,
    readFileSync: deps.fs.readFileSync,
    writeFileSync: deps.fs.writeFileSync,
    unlinkSync: deps.fs.unlinkSync,
    cwd: () => deps.process.cwd(),
    githubHelpers: deps.github.createHelpers(),
    claudeMdHelpers: deps.claudeMd.createHelpers(),
    enrichPlan: enrichPlanWithResearch,
    findNextTask: findNextTaskNumber,
    getActiveTaskId,
    logger: deps.logger('create-task-from-issue'),
  };
}

export async function createTaskFromIssue(
  issueIdentifier: string,
  options: CreateIssueOptions,
  deps: CreateTaskDeps,
): Promise<CommandResult<CreateTaskResultData>> {
  const projectRoot = deps.cwd();
  const claudeDir = join(projectRoot, '.claude');
  const tasksDir = join(claudeDir, 'tasks');

  if (!deps.existsSync(claudeDir)) {
    return {
      success: false,
      error: 'Not a cc-track project. Run "cc-track init" first.',
      exitCode: 1,
    };
  }

  if (!deps.existsSync(tasksDir)) {
    deps.mkdirSync(tasksDir, { recursive: true });
  }

  deps.logger.info('Fetching GitHub issue', { issueIdentifier });
  const issue = deps.githubHelpers.getIssue(issueIdentifier, projectRoot);

  if (!issue) {
    return {
      success: false,
      error: 'Failed to fetch issue. Ensure gh CLI is authenticated and the issue exists.',
      exitCode: 1,
    };
  }

  const activeTaskId = deps.getActiveTaskId(projectRoot);
  if (activeTaskId) {
    return {
      success: false,
      error: `Task ${activeTaskId} is currently active. Complete it first with /complete-task`,
      exitCode: 1,
    };
  }

  const fileOps = {
    existsSync: deps.existsSync,
    readdirSync: deps.readdirSync,
    mkdirSync: deps.mkdirSync,
    readFileSync: deps.readFileSync,
    writeFileSync: deps.writeFileSync,
    unlinkSync: deps.unlinkSync,
  };

  const nextNumber = deps.findNextTask(tasksDir, fileOps);
  const taskId = String(nextNumber).padStart(3, '0');
  const taskPath = join(tasksDir, `TASK_${taskId}.md`);

  const plan = `## ${issue.title}

### Context
GitHub Issue #${issue.number}: ${issue.url}

### Description
${issue.body || 'No description provided in issue.'}

### Requirements
Based on the issue description, implement the requested functionality following existing patterns in the codebase.`;

  if (options.research !== false) {
    const now = new Date();
    const success = await deps.enrichPlan(plan, taskId, now, projectRoot, { fileOps });
    if (!success) {
      return {
        success: false,
        error: 'Failed to enrich task with research',
        exitCode: 1,
      };
    }
  } else {
    const now = new Date();
    const basicTaskContent = `# Task ${taskId}: ${issue.title}

Status: active
Created: ${now.toISOString()}
GitHub Issue: #${issue.number} - ${issue.url}

## Summary

${issue.body || 'No description provided in issue.'}

## Requirements

- Implement functionality as described in GitHub issue #${issue.number}
- Follow existing patterns in the codebase
- Update tests and documentation as needed

## Technical Notes

_To be populated during implementation_

## Recent Progress

- Task created from GitHub issue #${issue.number}
`;
    deps.writeFileSync(taskPath, basicTaskContent);
  }

  let taskContent = deps.readFileSync(taskPath, 'utf-8');
  if (!taskContent.includes('GitHub Issue:')) {
    taskContent = taskContent.replace(
      /Status: active/,
      `Status: active  \nGitHub Issue: #${issue.number} - ${issue.url}`,
    );
    deps.writeFileSync(taskPath, taskContent);
  }

  const safeIssueNumber = String(issue.number).replace(/[^0-9]/g, '');
  deps.execSync(
    `git add "${taskPath}" && git commit -m "feat: create TASK_${taskId} from GitHub issue #${safeIssueNumber}"`,
    { cwd: projectRoot },
  );

  let branchName: string | null = null;
  if (options.branch !== false) {
    branchName = deps.githubHelpers.createIssueBranch(issue.number, projectRoot);
    if (branchName) {
      taskContent = deps.readFileSync(taskPath, 'utf-8');
      taskContent += `\n<!-- issue_branch: ${branchName} -->`;
      deps.writeFileSync(taskPath, taskContent);
    }
  }

  deps.claudeMdHelpers.setActiveTask(projectRoot, `TASK_${taskId}`);

  return {
    success: true,
    messages: [
      `✅ Task ${taskId} created successfully from issue #${issue.number}`,
      branchName ? `🚅 Ready to work on branch: ${branchName}` : '',
      `📋 Task ${taskId} is now active.`,
    ].filter(Boolean),
    data: {
      taskPath,
      taskId,
      branchName,
      issue,
    },
  };
}

export function createTaskFromIssueCommandFactory(overrides?: PartialCommandDeps): Command {
  return new Command('task-from-issue')
    .description('Create a cc-track task from a GitHub issue')
    .argument('<issue>', 'GitHub issue number or URL')
    .option('--no-branch', 'Skip branch creation')
    .option('--no-research', 'Skip comprehensive research (create basic task only)')
    .action(async (issueIdentifier: string, cliOptions: { branch?: boolean; research?: boolean }) => {
      const deps = resolveCommandDeps(overrides);
      try {
        const result = await createTaskFromIssue(issueIdentifier, cliOptions, mapCreateTaskDeps(deps));
        applyCommandResult(result, deps);
      } catch (error) {
        handleCommandException(error, deps);
      }
    });
}

export const createTaskFromIssueCommand = createTaskFromIssueCommandFactory();
