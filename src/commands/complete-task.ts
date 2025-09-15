import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { clearActiveTask, getActiveTaskId } from '../lib/claude-md';
import { getConfig, getGitHubConfig, isGitHubIntegrationEnabled } from '../lib/config';
import { getCurrentBranch, getDefaultBranch, getMergeBase } from '../lib/git-helpers';
import { pushCurrentBranch } from '../lib/github-helpers';
import { createLogger } from '../lib/logger';
import { runValidationChecks } from '../lib/validation';

const logger = createLogger('complete-task-command');

interface CompletionResult {
  success: boolean;
  taskId?: string;
  taskTitle?: string;
  updates: {
    taskFile?: string;
    claudeMd?: string;
    noActiveTask?: string;
  };
  validation: {
    typescript?: string;
    biome?: string;
    knip?: string;
    preflightPassed?: boolean;
  };
  git: {
    squashed?: boolean;
    commitMessage?: string;
    branchMerged?: boolean;
    branchPushed?: boolean;
    branchSwitched?: boolean;
    notes?: string;
    defaultBranch?: string;
    safetyCommit?: boolean;
    wipCommitCount?: number;
  };
  github?: {
    prWorkflow?: boolean;
    prCreated?: boolean;
    prExists?: boolean;
    prUrl?: string;
    issueNumber?: number;
    branchName?: string;
  };
  warnings: string[];
  filesChanged?: string[];
  error?: string;
}

/**
 * Complete task command implementation
 */
async function completeTaskAction(options: {
  noSquash?: boolean;
  noBranch?: boolean;
  message?: string;
  skipValidation?: boolean;
}) {
  const result: CompletionResult = {
    success: false,
    updates: {},
    validation: {},
    git: {},
    warnings: [],
  };

  const projectRoot = process.cwd();
  const claudeDir = join(projectRoot, '.claude');

  try {
    // 0. Run pre-flight validation check (unless skipped)
    if (!options.skipValidation) {
      logger.info('Running pre-flight validation check');
      try {
        const preflightData = await runValidationChecks(projectRoot);

        if (!preflightData.readyForCompletion) {
          result.validation.preflightPassed = false;
          result.error = 'Pre-flight validation failed. Run /prepare-completion to fix issues.';
          if (preflightData.validation?.typescript?.errorCount) {
            result.validation.typescript = `${preflightData.validation.typescript.errorCount} errors`;
          }
          if (preflightData.validation?.biome?.issueCount) {
            result.validation.biome = `${preflightData.validation.biome.issueCount} issues`;
          }
          if (preflightData.validation?.tests?.failCount) {
            result.warnings.push(`${preflightData.validation.tests.failCount} tests failing`);
          }
        } else {
          result.validation.preflightPassed = true;
          logger.info('Pre-flight validation passed');
        }
      } catch (error) {
        logger.warn('Pre-flight validation check failed: ', { error });
        result.validation.preflightPassed = false;
        result.error = `Pre-flight validation check failed: ${error}`;
      }
    }

    // 1. Validate prerequisites
    const claudeMdPath = join(projectRoot, 'CLAUDE.md');
    if (!existsSync(claudeMdPath)) {
      console.log('## ❌ Task Completion Failed\n');
      console.log('Error: CLAUDE.md not found\n');
      console.log('Please ensure cc-track is properly initialized in this project.');
      console.log('Run `/init-track` if needed, then try again.');
      process.exit(1);
    }

    // Save original content for potential restoration if push fails
    let originalClaudeMdContent = '';
    let originalNoActiveTaskContent = '';

    const taskId = getActiveTaskId(projectRoot);
    if (!taskId) {
      console.log('## ❌ Task Completion Failed\n');
      console.log('Error: No active task found in CLAUDE.md\n');
      console.log('Please ensure there is an active task set in CLAUDE.md.');
      console.log('The task should be referenced with `@.claude/tasks/TASK_XXX.md`');
      process.exit(1);
    }

    result.taskId = taskId;
    const taskFilePath = join(claudeDir, 'tasks', `${result.taskId}.md`);

    if (!existsSync(taskFilePath)) {
      console.log('## ❌ Task Completion Failed\n');
      console.log(`Error: Task file not found: ${taskFilePath}\n`);
      console.log('The task file referenced in CLAUDE.md does not exist.');
      console.log('Please check that the task file path is correct.');
      process.exit(1);
    }

    // 2. Update task status
    let taskContent = readFileSync(taskFilePath, 'utf-8');

    // Extract task title from first line
    const titleMatch = taskContent.match(/^# (.+)$/m);
    result.taskTitle = titleMatch ? titleMatch[1] : result.taskId;

    // Check if task is in_progress
    if (!taskContent.includes('**Status:** in_progress')) {
      result.warnings.push('Task is not marked as in_progress, but continuing anyway');
    }

    // Update status to completed
    taskContent = taskContent.replace(/\*\*Status:\*\* .+/, '**Status:** completed');

    // Update current focus with completion date
    const today = new Date().toISOString().split('T')[0];
    taskContent = taskContent.replace(/## Current Focus\n+.*/, `## Current Focus\n\nTask completed on ${today}`);

    writeFileSync(taskFilePath, taskContent);
    result.updates.taskFile = 'updated';

    // 3. Update CLAUDE.md - save original content for potential restoration
    originalClaudeMdContent = readFileSync(claudeMdPath, 'utf-8');
    clearActiveTask(projectRoot);
    result.updates.claudeMd = 'updated';

    // 4. Update no_active_task.md
    const noActiveTaskPath = join(claudeDir, 'no_active_task.md');
    if (existsSync(noActiveTaskPath)) {
      originalNoActiveTaskContent = readFileSync(noActiveTaskPath, 'utf-8');
      let noActiveContent = originalNoActiveTaskContent;

      // Add the completed task to the list
      const taskEntry = `- ${result.taskId}: ${result.taskTitle}`;

      // Check if there's already a completed tasks section
      if (noActiveContent.includes('## Completed Tasks:')) {
        // Add to the end of the completed tasks list
        noActiveContent = noActiveContent.replace(/(## Completed Tasks:[\s\S]*?)(\n\n|\n$)/, `$1\n${taskEntry}$2`);
      } else {
        // Create the completed tasks section
        noActiveContent = noActiveContent.replace(
          'The following tasks are being tracked in this project:',
          `The following tasks are being tracked in this project:\n\n## Completed Tasks:\n${taskEntry}`,
        );
      }

      writeFileSync(noActiveTaskPath, noActiveContent);
      result.updates.noActiveTask = 'updated';
    } else {
      result.warnings.push('no_active_task.md not found');
    }

    // 5. Check for existing PR early (if GitHub integration is enabled)
    let existingPR: { number: number; url: string; state: string } | undefined;
    let currentBranch: string | null = null;
    let taskBranchName: string | undefined;

    if (!options.noBranch && isGitHubIntegrationEnabled() && getGitHubConfig()?.auto_create_prs) {
      // Extract branch names from task file (both regular and issue branches)
      // Match only lines that start with the comment (not in code blocks)
      const regularBranchMatch = taskContent.match(/^<!-- branch: (.*?) -->$/m);
      const issueBranchMatch = taskContent.match(/^<!-- issue_branch: (.*?) -->$/m);

      currentBranch = getCurrentBranch(projectRoot);

      logger.info('PR detection starting', {
        currentBranch,
        regularBranch: regularBranchMatch?.[1],
        issueBranch: issueBranchMatch?.[1],
      });

      // Check both possible branch names
      if (regularBranchMatch && currentBranch === regularBranchMatch[1]) {
        taskBranchName = regularBranchMatch[1];
      } else if (issueBranchMatch && currentBranch === issueBranchMatch[1]) {
        taskBranchName = issueBranchMatch[1];
      }

      // Check if we're on the task branch and if a PR already exists
      if (taskBranchName && currentBranch === taskBranchName) {
        try {
          // Escape branch name to prevent command injection
          const escapedBranchName = taskBranchName.replace(/'/g, "'\\''");
          const prListOutput = execSync(`gh pr list --head '${escapedBranchName}' --json number,url,state`, {
            encoding: 'utf-8',
            cwd: projectRoot,
          });

          let existingPRs: Array<{ number: number; url: string; state: string }> = [];
          try {
            existingPRs = JSON.parse(prListOutput);
          } catch (parseError) {
            logger.debug('Failed to parse PR list output', { error: parseError, output: prListOutput });
            // Continue without existing PR check
          }

          existingPR = existingPRs.find((pr) => pr.state === 'OPEN');
          if (existingPR) {
            logger.info('Found existing PR for branch', { branch: taskBranchName, pr: existingPR.url });
          }
        } catch (error) {
          logger.debug('Could not check for existing PRs', { error });
        }
      }
    }

    // 6. Git operations (unless --no-squash is specified or PR already exists)
    const shouldSquash = !options.noSquash && !existingPR;

    if (shouldSquash) {
      try {
        // Check for uncommitted changes and commit them first
        const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8', cwd: projectRoot }).trim();
        if (gitStatus) {
          // Safety commit: commit any remaining changes (likely just documentation)
          try {
            execSync('git add -A', { cwd: projectRoot });
            const message = options.message || `docs: final ${result.taskId} documentation updates`;
            const escapedMessage = message.replace(/'/g, "'\\''");
            execSync(`git commit -m '${escapedMessage}'`, { cwd: projectRoot });
            result.git.safetyCommit = true;
            result.git.notes = 'Committed final changes before squashing';
            logger.info('Created safety commit for uncommitted changes');
          } catch (_commitError) {
            result.warnings.push('Failed to commit final changes');
          }
        }

        // Get current branch and default branch
        if (!currentBranch) {
          currentBranch = getCurrentBranch(projectRoot);
        }
        const defaultBranch = getDefaultBranch(projectRoot);

        if (currentBranch && currentBranch !== defaultBranch) {
          // We're on a feature/task branch - check if we can squash
          const mergeBase = getMergeBase(currentBranch, defaultBranch, projectRoot);

          if (mergeBase) {
            // Count commits since merge base
            const commitCount = execSync(`git rev-list --count ${mergeBase}..HEAD`, {
              encoding: 'utf-8',
              cwd: projectRoot,
            }).trim();

            const numCommits = parseInt(commitCount, 10);

            if (numCommits > 1) {
              // Multiple commits to squash
              const commitMessage = options.message || `feat: complete ${result.taskId} - ${result.taskTitle}`;

              try {
                execSync(`git reset --soft ${mergeBase}`, { cwd: projectRoot });
                const escapedCommitMessage = commitMessage.replace(/'/g, "'\\''");
                execSync(`git commit -m '${escapedCommitMessage}'`, { cwd: projectRoot });
                result.git.squashed = true;
                result.git.wipCommitCount = numCommits; // Keep this field for compatibility
                result.git.commitMessage = commitMessage;
                result.git.notes = `Squashed ${numCommits} commits from branch into single commit`;
                logger.info(`Squashed ${numCommits} commits into single commit`);
              } catch (squashError) {
                result.warnings.push(`Failed to squash commits: ${squashError}`);
                result.git.notes = 'Squash attempted but failed';
              }
            } else if (numCommits === 1) {
              result.git.notes = 'Only one commit on branch - no squashing needed';
            } else {
              result.git.notes = 'No commits to squash on this branch';
            }

            // Get list of changed files
            try {
              const diffFiles = execSync(`git diff --name-only ${mergeBase}..HEAD`, {
                encoding: 'utf-8',
                cwd: projectRoot,
              })
                .trim()
                .split('\n')
                .filter((f) => f);
              result.filesChanged = diffFiles;
            } catch {
              // Ignore if we can't get the file list
            }
          } else {
            result.git.notes = 'Could not determine merge base with default branch';
          }
        } else {
          result.git.notes = 'Already on default branch - no squashing needed';

          // Get list of changed files from last commit
          try {
            const diffFiles = execSync('git diff --name-only HEAD~1..HEAD', {
              encoding: 'utf-8',
              cwd: projectRoot,
            })
              .trim()
              .split('\n')
              .filter((f) => f);
            result.filesChanged = diffFiles;
          } catch {
            // Ignore if we can't get the file list
          }
        }
      } catch (gitError) {
        const error = gitError as Error;
        result.warnings.push(`Git operations failed: ${error.message}`);
      }
    } else if (existingPR) {
      // PR already exists - just commit any uncommitted changes
      try {
        const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8', cwd: projectRoot }).trim();
        if (gitStatus) {
          try {
            execSync('git add -A', { cwd: projectRoot });
            const message = options.message || `docs: update ${result.taskId} based on PR feedback`;
            const escapedMessage = message.replace(/'/g, "'\\''");
            execSync(`git commit -m '${escapedMessage}'`, { cwd: projectRoot });
            result.git.safetyCommit = true;
            result.git.notes = 'Committed changes for existing PR';
            logger.info('Created commit for existing PR');
          } catch (_commitError) {
            result.warnings.push('No changes to commit');
          }
        }
      } catch (error) {
        logger.debug('Error checking git status', { error });
      }
    }

    // 7. Handle branching/GitHub workflow if enabled (unless --no-branch is specified)
    if (!options.noBranch) {
      try {
        // Check if GitHub integration is enabled
        const githubEnabled = isGitHubIntegrationEnabled();
        const githubConfig = getGitHubConfig();
        const prWorkflow = githubEnabled && githubConfig?.auto_create_prs;

        if (prWorkflow) {
          // GitHub PR workflow - just push the branch, don't merge
          const issueMatch = taskContent.match(/<!-- github_issue: (\d+) -->/);

          if (taskBranchName) {
            if (!currentBranch) {
              currentBranch = execSync('git branch --show-current', {
                encoding: 'utf-8',
                cwd: projectRoot,
              }).trim();
            }

            if (currentBranch === taskBranchName) {
              // Push the current branch
              const pushSuccess = pushCurrentBranch(projectRoot);
              if (pushSuccess) {
                result.git.branchPushed = true;
                const defaultBranch = getDefaultBranch(projectRoot);
                result.git.defaultBranch = defaultBranch;

                // Use the existing PR check from earlier
                if (existingPR) {
                  result.github = {
                    prWorkflow: true,
                    prExists: true,
                    prUrl: existingPR.url,
                    branchName: taskBranchName,
                    issueNumber: issueMatch ? parseInt(issueMatch[1], 10) : undefined,
                  };
                  result.git.notes = `Updated existing PR: ${existingPR.url}`;
                } else {
                  // Create new PR
                  try {
                    const prTitle = `feat: complete ${result.taskId} - ${result.taskTitle}`;
                    const prBody = `## Summary\nCompletes ${result.taskId}: ${result.taskTitle}\n\n🤖 Generated with [Claude Code](https://claude.ai/code)`;

                    // Escape all shell arguments to prevent command injection
                    const escapedDefaultBranch = defaultBranch.replace(/'/g, "'\\''");
                    const escapedBranchName = taskBranchName.replace(/'/g, "'\\''");
                    const escapedTitle = prTitle.replace(/'/g, "'\\''");
                    const escapedBody = prBody.replace(/'/g, "'\\''");

                    const prCreateCmd = `gh pr create --base '${escapedDefaultBranch}' --head '${escapedBranchName}' --title '${escapedTitle}' --body '${escapedBody}'`;
                    const prUrl = execSync(prCreateCmd, {
                      encoding: 'utf-8',
                      cwd: projectRoot,
                    }).trim();

                    result.github = {
                      prWorkflow: true,
                      prCreated: true,
                      prUrl,
                      branchName: taskBranchName,
                      issueNumber: issueMatch ? parseInt(issueMatch[1], 10) : undefined,
                    };
                    result.git.notes = `Created PR: ${prUrl}`;
                  } catch (prError) {
                    result.warnings.push(`Failed to create PR: ${prError}`);
                    result.git.notes = `Pushed ${taskBranchName} to origin - ready for manual PR creation`;
                    result.github = {
                      prWorkflow: true,
                      branchName: taskBranchName,
                      issueNumber: issueMatch ? parseInt(issueMatch[1], 10) : undefined,
                    };
                  }
                }

                // Switch back to default branch and pull latest
                try {
                  execSync(`git checkout ${defaultBranch}`, { cwd: projectRoot });
                  execSync(`git pull origin ${defaultBranch}`, { cwd: projectRoot });
                  result.git.branchSwitched = true;
                } catch (switchError) {
                  logger.warn('Failed to switch to default branch', { error: switchError });
                }
              } else {
                // Push failed - need to revert task completion
                result.warnings.push('Failed to push branch to origin');
                result.git.branchPushed = false;

                // Revert task status back to in_progress
                try {
                  let revertedTaskContent = readFileSync(taskFilePath, 'utf-8');
                  revertedTaskContent = revertedTaskContent.replace(
                    /\*\*Status:\*\* completed/,
                    '**Status:** in_progress',
                  );
                  revertedTaskContent = revertedTaskContent.replace(
                    /## Current Focus\n\nTask completed on .+/,
                    '## Current Focus\n\nPush failed - task completion reverted. Fix push issues and retry.',
                  );
                  writeFileSync(taskFilePath, revertedTaskContent);

                  // Restore original CLAUDE.md content
                  writeFileSync(claudeMdPath, originalClaudeMdContent);

                  // Restore original no_active_task.md content
                  if (originalNoActiveTaskContent && existsSync(noActiveTaskPath)) {
                    writeFileSync(noActiveTaskPath, originalNoActiveTaskContent);
                  }

                  result.updates.taskFile = 'reverted to in_progress';
                  result.updates.claudeMd = 'restored active task';
                  result.updates.noActiveTask = 'restored original content';

                  logger.error('Push failed - reverted task completion', {
                    taskId: result.taskId,
                    branch: taskBranchName,
                  });
                } catch (revertError) {
                  logger.error('Failed to revert task status', { error: revertError });
                  result.warnings.push('Failed to revert task status - manual fix required');
                }
              }
            } else {
              result.git.notes = `Task branch ${taskBranchName} not currently checked out`;
            }
          } else {
            result.git.notes = 'No branch information found for GitHub PR workflow';
          }
        } else if (getConfig().features?.git_branching?.enabled) {
          // Traditional git branching workflow - merge locally
          const branchMatch = taskContent.match(/<!-- branch: (.*?) -->/);

          if (branchMatch) {
            const branchName = branchMatch[1];
            const currentBranch = execSync('git branch --show-current', {
              encoding: 'utf-8',
              cwd: projectRoot,
            }).trim();

            if (currentBranch === branchName) {
              // Get default branch
              const defaultBranch = getDefaultBranch(projectRoot);
              result.git.defaultBranch = defaultBranch;

              // Attempt to merge
              try {
                execSync(`git checkout ${defaultBranch}`, { cwd: projectRoot });
                execSync(`git merge ${branchName} --no-ff -m "Merge branch '${branchName}'"`, { cwd: projectRoot });
                result.git.branchMerged = true;
                result.git.notes = `Merged ${branchName} into ${defaultBranch}`;
              } catch (mergeError) {
                const error = mergeError as Error;
                result.warnings.push(`Failed to merge branch: ${error.message}`);
                result.git.branchMerged = false;
                // Try to switch back to task branch
                try {
                  execSync(`git checkout ${branchName}`, { cwd: projectRoot });
                } catch {}
              }
            } else {
              result.git.notes = `Task branch ${branchName} not currently checked out`;
            }
          } else {
            result.git.notes = 'No branch information in task file';
          }
        }
      } catch (branchError) {
        const error = branchError as Error;
        result.warnings.push(`Branch/GitHub operations failed: ${error.message}`);
      }
    }

    result.success = true;
  } catch (error) {
    const err = error as Error;
    result.error = err.message;
    logger.error('Task completion failed', { error: err.message, taskId: result.taskId });
  }

  // Generate context-specific instructions for Claude
  console.log('## Your Tasks\n');

  // Check for critical errors first
  if (result.error) {
    console.log('### ❌ Task Completion Failed\n');
    console.log(`Error: ${result.error}\n`);
    console.log('Please inform the user of this error. Cannot proceed with task completion.');
    process.exit(1);
  }

  // 1. Check pre-flight validation
  if (result.validation.preflightPassed === false) {
    console.log('### ⚠️ Pre-flight Validation Failed\n');
    console.log('The task is not ready for completion. Please inform the user:');
    console.log('- Run `/prepare-completion` first to fix validation issues');
    if (result.validation.typescript) {
      console.log(`- TypeScript has ${result.validation.typescript}`);
    }
    if (result.validation.biome) {
      console.log(`- Biome has ${result.validation.biome}`);
    }
    console.log('\n**Stop here - do not proceed with completion.**');
    process.exit(1);
  }

  // 2. Check for push failure
  if (result.git?.branchPushed === false && result.warnings.some((w) => w.includes('Failed to push branch'))) {
    console.log('### ❌ Push Failed - Task Completion Reverted\n');
    console.log('The push to origin failed, so the task completion has been reverted.');
    console.log('The task status has been set back to in_progress.\n');
    console.log('**Next steps:**');
    console.log('1. Check for merge conflicts or authentication issues');
    console.log('2. Manually push the branch: `git push -u origin HEAD`');
    console.log('3. Once push succeeds, run `/complete-task` again\n');
    console.log('**Current state:**');
    console.log(`- Still on branch: ${result.github?.branchName || 'feature branch'}`);
    console.log('- Task marked as in_progress');
    console.log('- Commits were squashed but not pushed');
    process.exit(1);
  }

  // 3. Handle GitHub PR if applicable
  if (result.github?.prCreated && result.github.prUrl) {
    console.log('### 1. Enhance the Pull Request\n');
    console.log('A PR was created automatically. Enhance its description with comprehensive details:\n');
    console.log('```bash');
    console.log(`gh pr edit ${result.github.prUrl} --body "## Summary`);
    console.log(`Completes ${result.taskId}: ${result.taskTitle}\n`);
    console.log('## What Was Delivered');
    console.log('[List the key deliverables from this task]\n');
    console.log('## Technical Implementation');
    console.log('[Describe important technical details, architecture decisions, patterns used]\n');
    console.log('## Testing');
    console.log('[Explain how changes were tested and the results]\n');
    console.log('🤖 Generated with [Claude Code](https://claude.ai/code)"');
    console.log('```\n');
  } else if (result.github?.prExists && result.github.prUrl) {
    console.log('### 1. Pull Request Updated\n');
    console.log(`Updated existing PR with new commits: ${result.github.prUrl}`);
    console.log('The PR was not recreated since it already exists.\n');
    console.log('If there were new changes, they have been pushed to the PR.');
    console.log('No squashing was performed to preserve PR review history.\n');
  } else if (result.git?.branchPushed) {
    console.log('### 1. Note About Pull Request\n');
    console.log('The branch was pushed but PR creation failed or was skipped.');
    console.log('Manual PR creation may be needed.\n');
  }

  // 4. Summary for user
  const summaryNumber = result.github?.prCreated || result.github?.prExists ? 2 : 1;
  console.log(`### ${summaryNumber}. Provide Summary to User\n`);
  console.log('Report the completion status including:');
  console.log(`- Task ${result.taskId} completed: ${result.taskTitle}`);
  if (result.git?.squashed) {
    console.log(`- Git: ${result.git.wipCommitCount || 'Multiple'} WIP commits squashed successfully`);
  } else if (result.github?.prExists) {
    console.log(`- Git: Pushed new commits to existing PR (no squashing to preserve history)`);
  }
  if (result.github?.prCreated) {
    console.log(`- PR created: ${result.github.prUrl}`);
  } else if (result.github?.prExists) {
    console.log(`- PR updated: ${result.github.prUrl}`);
  }
  if (result.git?.branchSwitched) {
    console.log(`- Switched to ${result.git.defaultBranch} branch`);
  }
  if (result.warnings.length > 0) {
    console.log(`- Warnings: ${result.warnings.join(', ')}`);
  }

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Create the command
export const completeTaskCommand = new Command('complete-task')
  .description('Mark the active task as completed')
  .option('--no-squash', 'skip squashing WIP commits')
  .option('--no-branch', 'skip branch operations')
  .option('--skip-validation', 'skip pre-flight validation check')
  .option('-m, --message <message>', 'custom completion commit message')
  .action(completeTaskAction);
