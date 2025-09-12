import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { clearActiveTask, getActiveTaskId } from '../lib/claude-md';
import { type EditValidationConfig, getConfig, getGitHubConfig, isGitHubIntegrationEnabled } from '../lib/config';
import { getDefaultBranch, isWipCommit } from '../lib/git-helpers';
import { pushCurrentBranch } from '../lib/github-helpers';
import { createLogger } from '../lib/logger';

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

interface ValidationConfig {
  typecheck?: { enabled: boolean; command: string };
  lint?: { enabled: boolean; command: string };
  knip?: { enabled: boolean; command: string };
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
        const preflightResult = execSync('./dist/cc-track prepare-completion', {
          encoding: 'utf-8',
          cwd: projectRoot,
        });
        const preflightData = JSON.parse(preflightResult);

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
          console.log(JSON.stringify(result, null, 2));
          process.exit(1);
        }
        result.validation.preflightPassed = true;
        logger.info('Pre-flight validation passed');
      } catch (error) {
        logger.warn('Pre-flight validation check failed', { error });
        result.warnings.push('Pre-flight validation check failed - continuing anyway');
      }
    }

    // 1. Validate prerequisites
    const claudeMdPath = join(projectRoot, 'CLAUDE.md');
    if (!existsSync(claudeMdPath)) {
      result.error = 'CLAUDE.md not found';
      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    const taskId = getActiveTaskId(projectRoot);
    if (!taskId) {
      result.error = 'No active task found in CLAUDE.md';
      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    result.taskId = taskId;
    const taskFilePath = join(claudeDir, 'tasks', `${result.taskId}.md`);

    if (!existsSync(taskFilePath)) {
      result.error = `Task file not found: ${taskFilePath}`;
      console.log(JSON.stringify(result, null, 2));
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

    // 3. Update CLAUDE.md
    clearActiveTask(projectRoot);
    result.updates.claudeMd = 'updated';

    // 4. Update no_active_task.md
    const noActiveTaskPath = join(claudeDir, 'no_active_task.md');
    if (existsSync(noActiveTaskPath)) {
      let noActiveContent = readFileSync(noActiveTaskPath, 'utf-8');

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

    // 5. Run validation checks (read config to see what's enabled)
    const config = getConfig();
    let validationConfig: ValidationConfig = {
      typecheck: { enabled: true, command: 'bunx tsc --noEmit' },
      lint: { enabled: true, command: 'bunx biome check' },
      knip: { enabled: true, command: 'bunx knip' },
    };

    // Check if validation config exists in edit_validation hook config
    const editValidation = config.hooks?.edit_validation;
    if (editValidation && 'typecheck' in editValidation) {
      const editConfig = editValidation as EditValidationConfig;
      validationConfig = {
        typecheck: editConfig.typecheck || validationConfig.typecheck,
        lint: editConfig.lint || validationConfig.lint,
        knip: editConfig.knip || validationConfig.knip,
      };
    }

    // Run TypeScript check if enabled
    if (validationConfig.typecheck?.enabled) {
      try {
        execSync(validationConfig.typecheck.command, { encoding: 'utf-8', cwd: projectRoot });
        result.validation.typescript = 'No errors';
      } catch (error) {
        const execError = error as { stdout?: string; stderr?: string };
        const output = execError.stdout || execError.stderr || '';
        const errorCount = (output.match(/error TS/g) || []).length;
        result.validation.typescript = `${errorCount} error${errorCount !== 1 ? 's' : ''}`;
        result.warnings.push(`TypeScript validation found ${errorCount} errors`);
      }
    }

    // Run Biome check if enabled
    if (validationConfig.lint?.enabled) {
      try {
        execSync(validationConfig.lint.command, { encoding: 'utf-8', cwd: projectRoot });
        result.validation.biome = 'No issues';
      } catch (error) {
        const execError = error as { stdout?: string; stderr?: string };
        const output = execError.stdout || execError.stderr || '';
        // Try to extract error count from Biome output
        const match = output.match(/Found (\d+) error/);
        const errorCount = match ? parseInt(match[1], 10) : 'unknown';
        result.validation.biome = `${errorCount} issue${errorCount !== 1 ? 's' : ''}`;
        result.warnings.push(`Biome validation found ${errorCount} issues`);
      }
    }

    // Run knip check if enabled
    if (validationConfig.knip?.enabled) {
      try {
        execSync(validationConfig.knip.command, { encoding: 'utf-8', cwd: projectRoot });
        result.validation.knip = 'No unused code';
      } catch (error) {
        const execError = error as { stdout?: string; stderr?: string };
        const output = execError.stdout || execError.stderr || '';
        // Parse knip output to extract counts
        const filesMatch = output.match(/Unused files\s+(\d+)/);
        const exportsMatch = output.match(/Unused exports\s+(\d+)/);
        const depsMatch = output.match(/Unused dependencies\s+(\d+)/);

        const issues = [];
        if (filesMatch && filesMatch[1] !== '0')
          issues.push(`${filesMatch[1]} unused file${filesMatch[1] !== '1' ? 's' : ''}`);
        if (exportsMatch && exportsMatch[1] !== '0')
          issues.push(`${exportsMatch[1]} unused export${exportsMatch[1] !== '1' ? 's' : ''}`);
        if (depsMatch && depsMatch[1] !== '0')
          issues.push(`${depsMatch[1]} unused dep${depsMatch[1] !== '1' ? 's' : ''}`);

        if (issues.length > 0) {
          result.validation.knip = issues.join(', ');
          result.warnings.push(`Knip found: ${issues.join(', ')}`);
        } else {
          result.validation.knip = 'Check completed';
        }
      }
    }

    // 6. Git operations (unless --no-squash is specified)
    if (!options.noSquash) {
      try {
        // Check for uncommitted changes and commit them first
        const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8', cwd: projectRoot }).trim();
        if (gitStatus) {
          // Safety commit: commit any remaining changes (likely just documentation)
          try {
            execSync('git add -A', { cwd: projectRoot });
            const message = options.message || `docs: final ${result.taskId} documentation updates`;
            execSync(`git commit -m "${message}"`, { cwd: projectRoot });
            result.git.safetyCommit = true;
            result.git.notes = 'Committed final changes before squashing';
            logger.info('Created safety commit for uncommitted changes');
          } catch (_commitError) {
            result.warnings.push('Failed to commit final changes');
          }
        }

        // Look for WIP commits
        const gitLog = execSync('git log --oneline -20', { encoding: 'utf-8', cwd: projectRoot });
        const lines = gitLog.split('\n').filter((line) => line.trim());

        let wipCount = 0;
        let lastNonWipIndex = -1;

        for (let i = 0; i < lines.length; i++) {
          if (isWipCommit(lines[i])) {
            wipCount++;
          } else if (lastNonWipIndex === -1) {
            lastNonWipIndex = i;
            break;
          }
        }

        if (wipCount > 0 && lastNonWipIndex > 0) {
          // We have WIP commits that can be squashed
          const lastNonWipHash = lines[lastNonWipIndex].split(' ')[0];

          // Check if all commits between HEAD and lastNonWip are WIPs
          const recentCommits = lines.slice(0, lastNonWipIndex);
          const allWips = recentCommits.every((line) => isWipCommit(line));

          if (allWips && !gitStatus) {
            // Safe to squash
            const commitMessage = options.message || `feat: complete ${result.taskId} - ${result.taskTitle}`;

            try {
              execSync(`git reset --soft ${lastNonWipHash}`, { cwd: projectRoot });
              execSync(`git commit -m "${commitMessage}"`, { cwd: projectRoot });
              result.git.squashed = true;
              result.git.wipCommitCount = wipCount;
              result.git.commitMessage = commitMessage;
            } catch (squashError) {
              result.warnings.push(`Failed to squash commits: ${squashError}`);
              result.git.notes = 'Squash attempted but failed';
            }
          } else if (!allWips) {
            result.git.notes = `Found ${wipCount} WIP commits mixed with regular commits - manual review needed`;
          } else {
            result.git.notes = 'Uncommitted changes prevent automatic squashing';
          }
        } else if (wipCount === 0) {
          result.git.notes = 'No WIP commits found';
        } else {
          result.git.notes = 'All recent commits are WIPs - nothing to squash to';
        }

        // Get list of changed files
        try {
          const diffFiles = execSync(
            `git diff --name-only ${lastNonWipIndex >= 0 ? lines[lastNonWipIndex].split(' ')[0] : 'HEAD~1'}..HEAD`,
            {
              encoding: 'utf-8',
              cwd: projectRoot,
            },
          )
            .trim()
            .split('\n')
            .filter((f) => f);
          result.filesChanged = diffFiles;
        } catch {
          // Ignore if we can't get the file list
        }
      } catch (gitError) {
        const error = gitError as Error;
        result.warnings.push(`Git operations failed: ${error.message}`);
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
          const branchMatch =
            taskContent.match(/<!-- branch: (.*?) -->/) || taskContent.match(/<!-- issue_branch: (.*?) -->/);
          const issueMatch = taskContent.match(/<!-- github_issue: (\d+) -->/);

          if (branchMatch) {
            const branchName = branchMatch[1];
            const currentBranch = execSync('git branch --show-current', {
              encoding: 'utf-8',
              cwd: projectRoot,
            }).trim();

            if (currentBranch === branchName) {
              // Push the current branch
              const pushSuccess = pushCurrentBranch(projectRoot);
              if (pushSuccess) {
                result.git.branchPushed = true;
                const defaultBranch = getDefaultBranch(projectRoot);
                result.git.defaultBranch = defaultBranch;

                // Check if PR already exists for this branch
                try {
                  const prListOutput = execSync(`gh pr list --head ${branchName} --json number,url,state`, {
                    encoding: 'utf-8',
                    cwd: projectRoot,
                  });
                  const existingPRs = JSON.parse(prListOutput) as Array<{ number: number; url: string; state: string }>;

                  const openPR = existingPRs.find((pr) => pr.state === 'OPEN');
                  if (openPR) {
                    result.github = {
                      prWorkflow: true,
                      prExists: true,
                      prUrl: openPR.url,
                      branchName,
                      issueNumber: issueMatch ? parseInt(issueMatch[1], 10) : undefined,
                    };
                    result.git.notes = `PR already exists: ${openPR.url}`;
                  } else {
                    // Create new PR
                    try {
                      const prTitle = `feat: complete ${result.taskId} - ${result.taskTitle}`;
                      const prBody = `## Summary\nCompletes ${result.taskId}: ${result.taskTitle}\n\n🤖 Generated with [Claude Code](https://claude.ai/code)`;

                      const prCreateCmd = `gh pr create --base ${defaultBranch} --head ${branchName} --title "${prTitle}" --body "${prBody}"`;
                      const prUrl = execSync(prCreateCmd, {
                        encoding: 'utf-8',
                        cwd: projectRoot,
                      }).trim();

                      result.github = {
                        prWorkflow: true,
                        prCreated: true,
                        prUrl,
                        branchName,
                        issueNumber: issueMatch ? parseInt(issueMatch[1], 10) : undefined,
                      };
                      result.git.notes = `Created PR: ${prUrl}`;
                    } catch (prError) {
                      result.warnings.push(`Failed to create PR: ${prError}`);
                      result.git.notes = `Pushed ${branchName} to origin - ready for manual PR creation`;
                      result.github = {
                        prWorkflow: true,
                        branchName,
                        issueNumber: issueMatch ? parseInt(issueMatch[1], 10) : undefined,
                      };
                    }
                  }
                } catch (listError) {
                  logger.warn('Failed to check for existing PRs', { error: listError });
                  result.git.notes = `Pushed ${branchName} to origin - ready for PR creation`;
                  result.github = {
                    prWorkflow: true,
                    branchName,
                    issueNumber: issueMatch ? parseInt(issueMatch[1], 10) : undefined,
                  };
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
                result.warnings.push('Failed to push branch to origin');
                result.git.branchPushed = false;
              }
            } else {
              result.git.notes = `Task branch ${branchName} not currently checked out`;
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
  console.log(JSON.stringify(result, null, 2));
  console.log('\n## Your Tasks\n');

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

  // 2. Handle GitHub PR if applicable
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
    console.log('### 1. Pull Request Already Exists\n');
    console.log(`A PR already exists for this branch: ${result.github.prUrl}`);
    console.log('No action needed - the duplicate prevention worked correctly.\n');
  } else if (result.git?.branchPushed) {
    console.log('### 1. Note About Pull Request\n');
    console.log('The branch was pushed but PR creation failed or was skipped.');
    console.log('Manual PR creation may be needed.\n');
  }

  // 3. Documentation updates
  const docNumber = result.github?.prCreated ? 2 : 1;
  console.log(`### ${docNumber}. Update Project Documentation\n`);
  console.log('Update the following documentation files as needed:\n');
  console.log(`**Progress Log** (\`.claude/progress_log.md\`):`);
  console.log(`- Add entry: "${result.taskId} completed: ${result.taskTitle}"`);
  console.log(`- Note key files changed (${result.filesChanged?.length || 0} files modified)`);
  console.log('');
  console.log('**Decision Log** (`.claude/decision_log.md`) - Only if significant decisions were made');
  console.log('**System Patterns** (`.claude/system_patterns.md`) - Only if new patterns were established');
  console.log('**Backlog** (`.claude/backlog.md`) - Remove this task if it was listed there\n');

  // 4. Summary for user
  const summaryNumber = result.github?.prCreated ? 3 : 2;
  console.log(`### ${summaryNumber}. Provide Summary to User\n`);
  console.log('Report the completion status including:');
  console.log(`- Task ${result.taskId} completed: ${result.taskTitle}`);
  if (result.git?.squashed) {
    console.log(`- Git: ${result.git.wipCommitCount || 'Multiple'} WIP commits squashed successfully`);
  }
  if (result.github?.prUrl) {
    console.log(`- PR: ${result.github.prUrl}`);
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
