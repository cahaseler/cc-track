import type { execSync } from 'node:child_process';
import { Command } from 'commander';
import type { clearActiveTask, getActiveTaskId } from '../lib/claude-md';
import type { getConfig, getGitHubConfig, isGitHubIntegrationEnabled } from '../lib/config';
import type { getCurrentBranch, getDefaultBranch, getMergeBase } from '../lib/git-helpers';
import type { pushCurrentBranch } from '../lib/github-helpers';
import type { createLogger } from '../lib/logger';
import type { runValidationChecks } from '../lib/validation';
import {
  applyCommandResult,
  type CommandDeps,
  type CommandResult,
  type FileSystemLike,
  handleCommandException,
  type PartialCommandDeps,
  resolveCommandDeps,
} from './context';

export interface CompleteTaskOptions {
  noSquash?: boolean;
  noBranch?: boolean;
  skipValidation?: boolean;
  message?: string;
}

export interface CompleteTaskResultData {
  taskId?: string;
  taskTitle?: string;
  updates: {
    taskFile?: string;
    claudeMd?: string;
    noActiveTask?: string;
  };
  validation: {
    preflightPassed?: boolean;
    typescript?: string;
    biome?: string;
    tests?: string;
    knip?: string;
  };
  git: {
    squashed?: boolean;
    commitMessage?: string;
    branchMerged?: boolean;
    branchPushed?: boolean;
    branchSwitched?: boolean;
    defaultBranch?: string;
    notes?: string;
    safetyCommit?: boolean;
    wipCommitCount?: number;
    reverted?: boolean;
  };
  github?: {
    prWorkflow?: boolean;
    prCreated?: boolean;
    prExists?: boolean;
    prUrl?: string;
    issueNumber?: number;
    branchName?: string;
  };
  filesChanged?: string[];
}

interface CompleteTaskState extends CompleteTaskResultData {
  originalTaskContent?: string;
  originalClaudeMdContent?: string;
  originalNoActiveTaskContent?: string;
}

export interface CompleteTaskDeps {
  cwd: () => string;
  fs: Pick<FileSystemLike, 'existsSync' | 'readFileSync' | 'writeFileSync'>;
  path: CommandDeps['path'];
  execSync: typeof execSync;
  getActiveTaskId: typeof getActiveTaskId;
  clearActiveTask: typeof clearActiveTask;
  getConfig: typeof getConfig;
  getGitHubConfig: typeof getGitHubConfig;
  isGitHubIntegrationEnabled: typeof isGitHubIntegrationEnabled;
  getCurrentBranch: typeof getCurrentBranch;
  getDefaultBranch: typeof getDefaultBranch;
  getMergeBase: typeof getMergeBase;
  pushCurrentBranch: typeof pushCurrentBranch;
  runValidationChecks: typeof runValidationChecks;
  todayISO: () => string;
  logger: ReturnType<typeof createLogger>;
}

function mapCompleteTaskDeps(deps: CommandDeps): CompleteTaskDeps {
  return {
    cwd: () => deps.process.cwd(),
    fs: {
      existsSync: deps.fs.existsSync,
      readFileSync: deps.fs.readFileSync,
      writeFileSync: deps.fs.writeFileSync,
    },
    path: deps.path,
    execSync: deps.childProcess.execSync,
    getActiveTaskId: deps.claudeMd.getActiveTaskId,
    clearActiveTask: deps.claudeMd.clearActiveTask,
    getConfig: deps.config.getConfig,
    getGitHubConfig: deps.config.getGitHubConfig,
    isGitHubIntegrationEnabled: deps.config.isGitHubIntegrationEnabled,
    getCurrentBranch: deps.git.getCurrentBranch,
    getDefaultBranch: deps.git.getDefaultBranch,
    getMergeBase: deps.git.getMergeBase,
    pushCurrentBranch: deps.github.pushCurrentBranch,
    runValidationChecks: deps.validation.runValidationChecks,
    todayISO: deps.time.todayISO,
    logger: deps.logger('complete-task-command'),
  };
}

interface ExistingPullRequest {
  number: number;
  url: string;
  state: string;
}

interface BranchContext {
  currentBranch?: string;
  taskBranchName?: string;
  existingPr?: ExistingPullRequest | null;
  remoteHasCommits: boolean;
}

interface CompletionMessages {
  messages: string[];
  warnings: string[];
  error?: string;
  exitCode?: number;
}

function createBaseState(): CompleteTaskState {
  return {
    updates: {},
    validation: {},
    git: {},
  };
}

function buildFailureResult(
  state: CompleteTaskState,
  details: CompletionMessages,
): CommandResult<CompleteTaskResultData> {
  return {
    success: false,
    error: details.error ?? 'Task completion failed',
    messages: details.messages,
    warnings: details.warnings,
    exitCode: details.exitCode ?? 1,
    data: state,
  };
}

function buildSuccessResult(
  state: CompleteTaskState,
  details: CompletionMessages,
): CommandResult<CompleteTaskResultData> {
  return {
    success: true,
    messages: details.messages,
    warnings: details.warnings,
    data: state,
  };
}

function detectBranchContext(
  projectRoot: string,
  taskContent: string,
  deps: CompleteTaskDeps,
  options: CompleteTaskOptions,
): BranchContext {
  const regularBranchMatch = taskContent.match(/^<!-- branch: (.*?) -->$/m);
  const issueBranchMatch = taskContent.match(/^<!-- issue_branch: (.*?) -->$/m);

  const context: BranchContext = {
    currentBranch: deps.getCurrentBranch(projectRoot) || undefined,
    remoteHasCommits: false,
  };

  if (regularBranchMatch?.[1]) {
    context.taskBranchName = regularBranchMatch[1];
  }

  if (!context.taskBranchName && issueBranchMatch?.[1]) {
    context.taskBranchName = issueBranchMatch[1];
  }

  const githubConfig = deps.getGitHubConfig();
  const prWorkflow = deps.isGitHubIntegrationEnabled() && githubConfig?.auto_create_prs;

  if (!options.noBranch && prWorkflow && context.taskBranchName && context.currentBranch === context.taskBranchName) {
    try {
      const escapedBranch = context.taskBranchName.replace(/'/g, "'\\''");
      const output = deps.execSync(`gh pr list --head '${escapedBranch}' --json number,url,state`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      });
      const prs = JSON.parse(output) as ExistingPullRequest[];
      context.existingPr = prs.find((pr) => pr.state === 'OPEN') ?? null;
    } catch (error) {
      deps.logger.debug('Failed to detect existing PR', { error });
    }
  }

  if (context.taskBranchName) {
    try {
      const remoteBranch = `origin/${context.taskBranchName}`;
      try {
        deps.execSync(`git rev-parse --verify ${remoteBranch}`, {
          cwd: projectRoot,
          stdio: 'pipe',
        });

        const defaultBranch = deps.getDefaultBranch(projectRoot);
        const mergeBase = deps
          .execSync(`git merge-base ${defaultBranch} ${remoteBranch}`, {
            cwd: projectRoot,
            encoding: 'utf-8',
          })
          .trim();

        if (mergeBase) {
          const remoteCommits = deps
            .execSync(`git rev-list ${mergeBase}..${remoteBranch}`, {
              cwd: projectRoot,
              encoding: 'utf-8',
            })
            .trim();

          context.remoteHasCommits = remoteCommits.length > 0;

          if (context.remoteHasCommits) {
            deps.logger.info('Remote branch has commits; squashing disabled', {
              branch: context.taskBranchName,
              commitCount: remoteCommits.split('\n').filter(Boolean).length,
            });
          }
        }
      } catch {
        context.remoteHasCommits = false;
      }
    } catch (error) {
      deps.logger.warn('Failed to determine remote branch state', { error });
      context.remoteHasCommits = true;
    }
  }

  return context;
}

function appendCompletedTaskEntry(content: string, entry: string): string {
  if (content.includes('## Completed Tasks:')) {
    return content.replace(/(## Completed Tasks:[\s\S]*?)(\n\n|\n$)/, `$1\n${entry}$2`);
  }

  return content.replace(
    'The following tasks are being tracked in this project:',
    `The following tasks are being tracked in this project:\n\n## Completed Tasks:\n${entry}`,
  );
}

function collectValidationWarnings(state: CompleteTaskState): string[] {
  const warnings: string[] = [];
  if (state.validation.typescript) {
    warnings.push(`TypeScript: ${state.validation.typescript}`);
  }
  if (state.validation.biome) {
    warnings.push(`Biome: ${state.validation.biome}`);
  }
  if (state.validation.tests) {
    warnings.push(`Tests: ${state.validation.tests}`);
  }
  if (state.validation.knip) {
    warnings.push(`Knip: ${state.validation.knip}`);
  }
  return warnings;
}

function buildValidationFailureMessage(state: CompleteTaskState): CompletionMessages {
  const messages = [
    '## ❌ Task Completion Failed\n',
    'Error: Pre-flight validation failed. Run /prepare-completion to fix issues.\n',
  ];
  const warnings = collectValidationWarnings(state);
  if (warnings.length > 0) {
    messages.push('Validation issues detected:');
    for (const warning of warnings) {
      messages.push(`- ${warning}`);
    }
  }
  return {
    messages,
    warnings: [],
    error: 'Pre-flight validation failed. Run /prepare-completion to fix issues.',
    exitCode: 1,
  };
}

function buildPushFailureMessages(state: CompleteTaskState, warnings: string[]): CompletionMessages {
  const messages = [
    '## ❌ Push Failed - Task Completion Reverted\n',
    'The push to origin failed, so the task completion has been reverted.\n',
    '**Next steps:**',
    '1. Check for merge conflicts or authentication issues',
    '2. Manually push the branch: `git push -u origin HEAD`',
    '3. Once push succeeds, run `/complete-task` again\n',
    '**Current state:**',
    `- Still on branch: ${state.github?.branchName || 'feature branch'}`,
    '- Task marked as in_progress',
    '- Commits were squashed but not pushed',
  ];
  return { messages, warnings, error: 'Failed to push branch to origin', exitCode: 1 };
}

function buildSuccessMessages(state: CompleteTaskState, warnings: string[]): CompletionMessages {
  const messages: string[] = [];
  messages.push('## Your Tasks\n');

  let summaryIndex = 1;

  if (state.github?.prCreated && state.github.prUrl) {
    messages.push('### 1. Enhance the Pull Request\n');
    messages.push('A PR was created automatically. Enhance its description with comprehensive details:\n');
    messages.push('```bash');
    messages.push(
      `gh pr edit ${state.github.prUrl} --body "## Summary\\nCompletes ${state.taskId}: ${state.taskTitle}\\n\\n## What Was Delivered\\n[List the key deliverables from this task]\\n\\n## Technical Implementation\\n[Describe important technical details, architecture decisions, patterns used]\\n\\n## Testing\\n[Explain how changes were tested and the results]\\n\\n🤖 Generated with [Claude Code](https://claude.ai/code)"`,
    );
    messages.push('```\n');
    summaryIndex = 2;
  } else if (state.github?.prExists && state.github.prUrl) {
    messages.push('### 1. Pull Request Updated\n');
    messages.push(`Updated existing PR with new commits: ${state.github.prUrl}\n`);
    messages.push('The PR was not recreated since it already exists.\n');
    messages.push('If there were new changes, they have been pushed to the PR.\n');
    messages.push('No squashing was performed to preserve PR review history.\n');
    summaryIndex = 2;
  } else if (state.git.branchPushed) {
    messages.push('### 1. Note About Pull Request\n');
    messages.push('The branch was pushed but PR creation failed or was skipped.\n');
    messages.push('Manual PR creation may be needed.\n');
    summaryIndex = 2;
  }

  messages.push(`### ${summaryIndex}. Provide Summary to User\n`);
  messages.push('Report the completion status including:');
  messages.push(`- Task ${state.taskId} completed: ${state.taskTitle}`);
  if (state.git.squashed) {
    messages.push(`- Git: ${state.git.wipCommitCount || 'Multiple'} WIP commits squashed successfully`);
  } else if (state.github?.prExists) {
    messages.push('- Git: Pushed new commits to existing PR (no squashing to preserve history)');
  }
  if (state.github?.prCreated) {
    messages.push(`- PR created: ${state.github.prUrl}`);
  } else if (state.github?.prExists) {
    messages.push(`- PR updated: ${state.github.prUrl}`);
  }
  if (state.git.branchSwitched && state.git.defaultBranch) {
    messages.push(`- Switched to ${state.git.defaultBranch} branch`);
  }
  if (warnings.length > 0) {
    messages.push(`- Warnings: ${warnings.join(', ')}`);
  }

  return { messages, warnings };
}

function revertTaskChanges(projectRoot: string, state: CompleteTaskState, deps: CompleteTaskDeps): void {
  if (state.originalTaskContent) {
    const claudeDir = deps.path.join(projectRoot, '.claude');
    const taskPath = deps.path.join(claudeDir, 'tasks', `${state.taskId}.md`);
    deps.fs.writeFileSync(taskPath, state.originalTaskContent);
  }

  if (state.originalClaudeMdContent) {
    const claudeMdPath = deps.path.join(projectRoot, 'CLAUDE.md');
    deps.fs.writeFileSync(claudeMdPath, state.originalClaudeMdContent);
  }

  if (state.originalNoActiveTaskContent) {
    const noActiveTaskPath = deps.path.join(projectRoot, '.claude', 'no_active_task.md');
    deps.fs.writeFileSync(noActiveTaskPath, state.originalNoActiveTaskContent);
  }
}

function ensureCurrentFocusSection(taskContent: string, todayIso: string): string {
  const focusSectionPattern = /## Current Focus\n[\s\S]*?(?=\n## |$)/;
  if (focusSectionPattern.test(taskContent)) {
    return taskContent.replace(focusSectionPattern, `## Current Focus\n\nTask completed on ${todayIso}\n`);
  }

  return `${taskContent.trim()}\n\n## Current Focus\n\nTask completed on ${todayIso}\n`;
}

function sanitizeCommitMessage(message: string): string {
  return message.replace(/'/g, "'\\''");
}

function commitUncommittedChanges(
  projectRoot: string,
  message: string,
  deps: CompleteTaskDeps,
  state: CompleteTaskState,
  warnings: string[],
): void {
  try {
    const gitStatus = deps
      .execSync('git status --porcelain', {
        cwd: projectRoot,
        encoding: 'utf-8',
      })
      .trim();

    if (gitStatus) {
      try {
        deps.execSync('git add -A', { cwd: projectRoot });
        deps.execSync(`git commit -m '${sanitizeCommitMessage(message)}'`, { cwd: projectRoot });
        state.git.safetyCommit = true;
        deps.logger.info('Created final documentation commit before squashing', { message });
      } catch (commitError) {
        warnings.push(
          `Failed to commit final changes: ${commitError instanceof Error ? commitError.message : commitError}`,
        );
      }
    }
  } catch (statusError) {
    deps.logger.debug('Failed to inspect git status before squashing', { error: statusError });
  }
}

function computeChangedFiles(projectRoot: string, reference: string, deps: CompleteTaskDeps): string[] {
  try {
    return deps
      .execSync(`git diff --name-only ${reference}`, { cwd: projectRoot, encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function performSquashAndSummary(
  projectRoot: string,
  options: CompleteTaskOptions,
  deps: CompleteTaskDeps,
  state: CompleteTaskState,
  branchContext: BranchContext,
  warnings: string[],
): Promise<void> {
  const shouldSquash = !options.noSquash && !branchContext.existingPr && !branchContext.remoteHasCommits;

  const defaultBranch = deps.getDefaultBranch(projectRoot);
  const currentBranch = branchContext.currentBranch || deps.getCurrentBranch(projectRoot);

  if (shouldSquash) {
    commitUncommittedChanges(
      projectRoot,
      options.message || `docs: final ${state.taskId} documentation updates`,
      deps,
      state,
      warnings,
    );

    if (currentBranch && currentBranch !== defaultBranch) {
      const mergeBase = deps.getMergeBase(currentBranch, defaultBranch, projectRoot);

      if (mergeBase) {
        try {
          const commitCountRaw = deps.execSync(`git rev-list --count ${mergeBase}..HEAD`, {
            cwd: projectRoot,
            encoding: 'utf-8',
          });
          const commitCount = parseInt(commitCountRaw.trim(), 10);

          if (commitCount > 1) {
            const commitMessage = options.message || `feat: complete ${state.taskId} - ${state.taskTitle}`;
            deps.execSync(`git reset --soft ${mergeBase}`, { cwd: projectRoot });
            deps.execSync(`git commit -m '${sanitizeCommitMessage(commitMessage)}'`, { cwd: projectRoot });
            state.git.squashed = true;
            state.git.commitMessage = commitMessage;
            state.git.wipCommitCount = commitCount;
            state.git.notes = `Squashed ${commitCount} commits from branch into single commit`;
            deps.logger.info('Squashed commits for completion', { commitCount, commitMessage });
          } else if (commitCount === 1) {
            state.git.notes = 'Only one commit on branch - no squashing needed';
          } else {
            state.git.notes = 'No commits to squash on this branch';
          }

          state.filesChanged = computeChangedFiles(projectRoot, `${mergeBase}..HEAD`, deps);
        } catch (error) {
          warnings.push(`Failed to squash commits: ${error instanceof Error ? error.message : error}`);
          state.git.notes = 'Squash attempted but failed';
        }
      } else {
        state.git.notes = 'Could not determine merge base with default branch';
      }
    } else {
      state.git.notes = 'Already on default branch - no squashing needed';
      state.filesChanged = computeChangedFiles(projectRoot, 'HEAD~1..HEAD', deps);
    }
  } else {
    if (branchContext.remoteHasCommits) {
      state.git.notes = 'Remote branch has commits - skipping squash to preserve history';
    } else if (branchContext.existingPr) {
      state.git.notes = 'PR already exists - skipping squash';
    } else if (options.noSquash) {
      state.git.notes = 'Squashing disabled by --no-squash flag';
    }

    commitUncommittedChanges(
      projectRoot,
      options.message ||
        (branchContext.existingPr
          ? `docs: update ${state.taskId} based on PR feedback`
          : `docs: update ${state.taskId} documentation`),
      deps,
      state,
      warnings,
    );
  }
}

function handleGitHubWorkflow(
  projectRoot: string,
  taskContent: string,
  deps: CompleteTaskDeps,
  state: CompleteTaskState,
  branchContext: BranchContext,
  warnings: string[],
  options: CompleteTaskOptions,
): CompletionMessages | null {
  const githubConfig = deps.getGitHubConfig();
  const prWorkflow = deps.isGitHubIntegrationEnabled() && githubConfig?.auto_create_prs;
  if (!branchContext.taskBranchName || options.noBranch) {
    return null;
  }

  if (prWorkflow) {
    const issueMatch = taskContent.match(/<!-- github_issue: (\d+) -->/);
    const pushSuccess = deps.pushCurrentBranch(projectRoot);
    if (!pushSuccess) {
      state.git.branchPushed = false;
      state.git.reverted = true;
      warnings.push('Failed to push branch to origin');
      return buildPushFailureMessages(state, warnings);
    }

    state.git.branchPushed = true;
    const defaultBranch = deps.getDefaultBranch(projectRoot);
    state.git.defaultBranch = defaultBranch;

    if (branchContext.existingPr) {
      state.github = {
        prWorkflow: true,
        prExists: true,
        prUrl: branchContext.existingPr.url,
        branchName: branchContext.taskBranchName,
        issueNumber: issueMatch ? Number(issueMatch[1]) : undefined,
      };
      state.git.notes = `Updated existing PR: ${branchContext.existingPr.url}`;
    } else {
      try {
        const prTitle = `feat: complete ${state.taskId} - ${state.taskTitle}`;
        const prBody =
          '## Summary\n' +
          `Completes ${state.taskId}: ${state.taskTitle}\n\n` +
          '🤖 Generated with [Claude Code](https://claude.ai/code)';
        const escapedDefaultBranch = defaultBranch.replace(/'/g, "'\\''");
        const escapedBranchName = branchContext.taskBranchName.replace(/'/g, "'\\''");
        const escapedTitle = prTitle.replace(/'/g, "'\\''");
        const escapedBody = prBody.replace(/'/g, "'\\''");

        const prUrl = deps
          .execSync(
            `gh pr create --base '${escapedDefaultBranch}' --head '${escapedBranchName}' --title '${escapedTitle}' --body '${escapedBody}'`,
            { cwd: projectRoot, encoding: 'utf-8' },
          )
          .trim();

        state.github = {
          prWorkflow: true,
          prCreated: true,
          prUrl,
          branchName: branchContext.taskBranchName,
          issueNumber: issueMatch ? Number(issueMatch[1]) : undefined,
        };
        state.git.notes = `Created PR: ${prUrl}`;
      } catch (error) {
        warnings.push(`Failed to create PR: ${error instanceof Error ? error.message : error}`);
        state.git.notes = `Pushed ${branchContext.taskBranchName} to origin - ready for manual PR creation`;
        state.github = {
          prWorkflow: true,
          branchName: branchContext.taskBranchName,
          issueNumber: issueMatch ? Number(issueMatch[1]) : undefined,
        };
      }
    }

    try {
      deps.execSync(`git checkout ${defaultBranch}`, { cwd: projectRoot });
      deps.execSync(`git pull origin ${defaultBranch}`, { cwd: projectRoot });
      state.git.branchSwitched = true;
    } catch (switchError) {
      deps.logger.warn('Failed to switch to default branch after push', { error: switchError });
    }

    return null;
  }

  const config = deps.getConfig();
  if (config.features?.git_branching?.enabled) {
    const branchMatch = taskContent.match(/<!-- branch: (.*?) -->/);
    if (branchMatch && branchContext.currentBranch === branchMatch[1]) {
      const defaultBranch = deps.getDefaultBranch(projectRoot);
      state.git.defaultBranch = defaultBranch;
      try {
        deps.execSync(`git checkout ${defaultBranch}`, { cwd: projectRoot });
        deps.execSync(`git merge ${branchMatch[1]} --no-ff -m "Merge branch '${branchMatch[1]}'"`, {
          cwd: projectRoot,
        });
        state.git.branchMerged = true;
        state.git.notes = `Merged ${branchMatch[1]} into ${defaultBranch}`;
      } catch (mergeError) {
        const message = mergeError instanceof Error ? mergeError.message : String(mergeError);
        warnings.push(`Failed to merge branch: ${message}`);
        state.git.branchMerged = false;
        try {
          deps.execSync(`git checkout ${branchMatch[1]}`, { cwd: projectRoot });
        } catch {}
      }
    } else {
      state.git.notes = branchMatch
        ? `Task branch ${branchMatch[1]} not currently checked out`
        : 'No branch information in task file';
    }
  }

  return null;
}

export async function runCompleteTask(
  options: CompleteTaskOptions,
  deps: CompleteTaskDeps,
): Promise<CommandResult<CompleteTaskResultData>> {
  const state = createBaseState();
  const warnings: string[] = [];
  const projectRoot = deps.cwd();
  const claudeDir = deps.path.join(projectRoot, '.claude');
  const tasksDir = deps.path.join(claudeDir, 'tasks');
  const claudeMdPath = deps.path.join(projectRoot, 'CLAUDE.md');
  const noActiveTaskPath = deps.path.join(claudeDir, 'no_active_task.md');

  try {
    if (!options.skipValidation) {
      const validation = await deps.runValidationChecks(projectRoot);
      state.validation.preflightPassed = validation.readyForCompletion;
      if (!validation.readyForCompletion) {
        if (validation.validation?.typescript?.errorCount) {
          state.validation.typescript = `${validation.validation.typescript.errorCount} errors`;
        }
        if (validation.validation?.biome?.issueCount) {
          state.validation.biome = `${validation.validation.biome.issueCount} issues`;
        }
        if (validation.validation?.tests?.failCount) {
          state.validation.tests = `${validation.validation.tests.failCount} tests failing`;
        }
        if (validation.validation?.knip && validation.validation.knip.passed === false) {
          const knipIssues: string[] = [];
          if (validation.validation.knip.unusedFiles) {
            knipIssues.push(`${validation.validation.knip.unusedFiles} unused files`);
          }
          if (validation.validation.knip.unusedExports) {
            knipIssues.push(`${validation.validation.knip.unusedExports} unused exports`);
          }
          if (validation.validation.knip.unusedDeps) {
            knipIssues.push(`${validation.validation.knip.unusedDeps} unused dependencies`);
          }
          state.validation.knip = knipIssues.join(', ');
        }

        return buildFailureResult(state, buildValidationFailureMessage(state));
      }
    } else {
      state.validation.preflightPassed = true;
    }
  } catch (error) {
    return buildFailureResult(state, {
      messages: [
        '## ❌ Task Completion Failed\n',
        `Error: Pre-flight validation check failed: ${error instanceof Error ? error.message : String(error)}\n`,
        'Please resolve validation tooling issues and retry `/complete-task`.\n',
      ],
      warnings,
      error: `Pre-flight validation check failed: ${error instanceof Error ? error.message : String(error)}`,
      exitCode: 1,
    });
  }

  if (!deps.fs.existsSync(claudeMdPath)) {
    return buildFailureResult(state, {
      messages: [
        '## ❌ Task Completion Failed\n',
        'Error: CLAUDE.md not found\n',
        'Please ensure cc-track is initialized. Run `/init-track` if needed, then retry.',
      ],
      warnings,
      error: 'CLAUDE.md not found',
    });
  }

  state.originalClaudeMdContent = deps.fs.readFileSync(claudeMdPath, 'utf-8');

  const taskId = deps.getActiveTaskId(projectRoot);
  if (!taskId) {
    return buildFailureResult(state, {
      messages: [
        '## ❌ Task Completion Failed\n',
        'Error: No active task found in CLAUDE.md\n',
        'Ensure an active task is set before running `/complete-task`.',
      ],
      warnings,
      error: 'No active task found in CLAUDE.md',
    });
  }

  state.taskId = taskId;
  const taskFilePath = deps.path.join(tasksDir, `${taskId}.md`);

  if (!deps.fs.existsSync(taskFilePath)) {
    return buildFailureResult(state, {
      messages: [
        '## ❌ Task Completion Failed\n',
        `Error: Task file not found: ${taskFilePath}\n`,
        'The task referenced in CLAUDE.md does not exist. Check the task file path.',
      ],
      warnings,
      error: `Task file not found: ${taskFilePath}`,
    });
  }

  const originalTaskContent = deps.fs.readFileSync(taskFilePath, 'utf-8');
  state.originalTaskContent = originalTaskContent;

  const titleMatch = originalTaskContent.match(/^# (.+)$/m);
  state.taskTitle = titleMatch ? titleMatch[1] : taskId;

  if (!originalTaskContent.includes('**Status:** in_progress')) {
    warnings.push('Task is not marked as in_progress, continuing anyway');
  }

  const todayIso = deps.todayISO();
  let updatedTaskContent = originalTaskContent.replace(/\*\*Status:\*\* .+/, '**Status:** completed');
  updatedTaskContent = ensureCurrentFocusSection(updatedTaskContent, todayIso);
  deps.fs.writeFileSync(taskFilePath, updatedTaskContent);
  state.updates.taskFile = 'updated';

  deps.clearActiveTask(projectRoot);
  state.updates.claudeMd = 'updated';

  if (deps.fs.existsSync(noActiveTaskPath)) {
    const originalNoActiveTaskContent = deps.fs.readFileSync(noActiveTaskPath, 'utf-8');
    state.originalNoActiveTaskContent = originalNoActiveTaskContent;
    const entry = `- ${taskId}: ${state.taskTitle}`;
    const newContent = appendCompletedTaskEntry(originalNoActiveTaskContent, entry);
    deps.fs.writeFileSync(noActiveTaskPath, newContent);
    state.updates.noActiveTask = 'updated';
  } else {
    warnings.push('no_active_task.md not found');
  }

  const branchContext = detectBranchContext(projectRoot, updatedTaskContent, deps, options);
  await performSquashAndSummary(projectRoot, options, deps, state, branchContext, warnings);

  const failureResult = handleGitHubWorkflow(
    projectRoot,
    updatedTaskContent,
    deps,
    state,
    branchContext,
    warnings,
    options,
  );

  if (failureResult) {
    state.git.reverted = true;
    revertTaskChanges(projectRoot, state, deps);
    return buildFailureResult(state, failureResult);
  }

  const messages = buildSuccessMessages(state, warnings);
  return buildSuccessResult(state, messages);
}

export function createCompleteTaskCommand(overrides?: PartialCommandDeps): Command {
  return new Command('complete-task')
    .description('Mark the active task as completed')
    .option('--no-squash', 'skip squashing WIP commits')
    .option('--no-branch', 'skip branch operations')
    .option('--skip-validation', 'skip pre-flight validation check')
    .option('-m, --message <message>', 'custom completion commit message')
    .action(async (options: CompleteTaskOptions) => {
      const deps = resolveCommandDeps(overrides);
      const mappedDeps = mapCompleteTaskDeps(deps);
      try {
        const result = await runCompleteTask(options ?? {}, mappedDeps);
        applyCommandResult(result, deps);
      } catch (error) {
        handleCommandException(error, deps);
      }
    });
}

export const completeTaskCommand = createCompleteTaskCommand();
