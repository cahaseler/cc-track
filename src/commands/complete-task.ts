import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
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
  };
  git: {
    squashed?: boolean;
    commitMessage?: string;
    branchMerged?: boolean;
    branchPushed?: boolean;
    notes?: string;
  };
  github?: {
    prWorkflow?: boolean;
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
async function completeTaskAction(options: { noSquash?: boolean; noBranch?: boolean; message?: string }) {
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
    // 1. Validate prerequisites
    const claudeMdPath = join(projectRoot, 'CLAUDE.md');
    if (!existsSync(claudeMdPath)) {
      result.error = 'CLAUDE.md not found';
      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    const claudeMdContent = readFileSync(claudeMdPath, 'utf-8');
    const taskMatch = claudeMdContent.match(/@\.claude\/tasks\/(TASK_\d+)\.md/);

    if (!taskMatch) {
      result.error = 'No active task found in CLAUDE.md';
      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    result.taskId = taskMatch[1];
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
    const updatedClaudeMd = claudeMdContent.replace(/@\.claude\/tasks\/TASK_\d+\.md/, '@.claude/no_active_task.md');
    writeFileSync(claudeMdPath, updatedClaudeMd);
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
    const configPath = join(claudeDir, 'track.config.json');
    let validationConfig: ValidationConfig = {
      typecheck: { enabled: true, command: 'bunx tsc --noEmit' },
      lint: { enabled: true, command: 'bunx biome check' },
      knip: { enabled: true, command: 'bunx knip' },
    };

    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      // Check if validation config exists in edit_validation hook config
      if (config.hooks?.edit_validation) {
        validationConfig = {
          typecheck: config.hooks.edit_validation.typecheck || validationConfig.typecheck,
          lint: config.hooks.edit_validation.lint || validationConfig.lint,
          knip: config.hooks.edit_validation.knip || validationConfig.knip,
        };
      }
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
          // Commit any remaining changes (likely just documentation)
          try {
            execSync('git add -A', { cwd: projectRoot });
            const message = options.message || `[wip] ${result.taskId}: Final documentation updates`;
            execSync(`git commit -m "${message}"`, { cwd: projectRoot });
            result.git.notes = 'Committed final changes before squashing';
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
          if (lines[i].includes('[wip]')) {
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
          const allWips = recentCommits.every((line) => line.includes('[wip]'));

          if (allWips && !gitStatus) {
            // Safe to squash
            const commitMessage = options.message || `${result.taskId}: ${result.taskTitle}`;

            try {
              execSync(`git reset --soft ${lastNonWipHash}`, { cwd: projectRoot });
              execSync(`git commit -m "${commitMessage}"`, { cwd: projectRoot });
              result.git.squashed = true;
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
        const configPath = join(claudeDir, 'track.config.json');
        if (existsSync(configPath)) {
          const config = JSON.parse(readFileSync(configPath, 'utf-8'));

          // Check if GitHub integration is enabled
          const githubEnabled = config.features?.github_integration?.enabled;
          const prWorkflow = githubEnabled && config.features?.github_integration?.auto_create_prs;

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
                  result.git.notes = `Pushed ${branchName} to origin - ready for PR creation`;

                  // Set up GitHub workflow info
                  result.github = {
                    prWorkflow: true,
                    branchName,
                    issueNumber: issueMatch ? parseInt(issueMatch[1], 10) : undefined,
                  };
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
          } else if (config.hooks?.git_branching?.enabled) {
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
                let defaultBranch = 'main';
                try {
                  execSync('git show-ref --verify --quiet refs/heads/main', { cwd: projectRoot });
                } catch {
                  try {
                    execSync('git show-ref --verify --quiet refs/heads/master', { cwd: projectRoot });
                    defaultBranch = 'master';
                  } catch {
                    result.warnings.push('Could not determine default branch');
                  }
                }

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

  // Output the result as JSON (for backward compatibility)
  console.log(JSON.stringify(result, null, 2));

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Create the command
export const completeTaskCommand = new Command('complete-task')
  .description('Mark the active task as completed')
  .option('--no-squash', 'skip squashing WIP commits')
  .option('--no-branch', 'skip branch operations')
  .option('-m, --message <message>', 'custom completion commit message')
  .action(completeTaskAction);
