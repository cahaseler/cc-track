import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { getActiveTaskId } from '../lib/claude-md';
import { performCodeReview } from '../lib/code-review';
import { getCodeReviewTool, getConfig, isCodeReviewEnabled } from '../lib/config';
import { getCurrentBranch, getDefaultBranch, getMergeBase } from '../lib/git-helpers';
import { createLogger } from '../lib/logger';
import { type PreparationResult, runValidationChecks } from '../lib/validation';

export interface PrepareCompletionDeps {
  execSync?: typeof execSync;
  fileOps?: {
    existsSync: typeof existsSync;
    mkdirSync: typeof mkdirSync;
    readFileSync: typeof readFileSync;
    readdirSync: typeof readdirSync;
  };
  performCodeReview?: typeof performCodeReview;
  getActiveTaskId?: typeof getActiveTaskId;
  isCodeReviewEnabled?: typeof isCodeReviewEnabled;
  getCodeReviewTool?: typeof getCodeReviewTool;
  getConfig?: typeof getConfig;
  getCurrentBranch?: typeof getCurrentBranch;
  getDefaultBranch?: typeof getDefaultBranch;
  getMergeBase?: typeof getMergeBase;
  runValidationChecks?: typeof runValidationChecks;
  logger?: ReturnType<typeof createLogger>;
  console?: typeof console;
  process?: typeof process;
}

/**
 * Run code review for the active task
 */
export async function runCodeReview(
  projectRoot: string,
  validationPassed: boolean,
  deps: PrepareCompletionDeps = {},
): Promise<void> {
  const {
    execSync: exec = execSync,
    fileOps = { existsSync, mkdirSync, readFileSync, readdirSync },
    performCodeReview: performReview = performCodeReview,
    getActiveTaskId: getTaskId = getActiveTaskId,
    isCodeReviewEnabled: isReviewEnabled = isCodeReviewEnabled,
    getCodeReviewTool: getReviewTool = getCodeReviewTool,
    getCurrentBranch: getCurrent = getCurrentBranch,
    getDefaultBranch: getDefault = getDefaultBranch,
    getMergeBase: getMerge = getMergeBase,
    logger = createLogger('prepare-completion'),
    console: cons = console,
  } = deps;

  // Run code review if validation passed and feature is enabled
  if (validationPassed && isReviewEnabled()) {
    cons.log('### 🔍 Code Review\n');

    const taskId = getTaskId(projectRoot);

    if (!taskId) {
      cons.log('⚠️ Could not run code review: No active task found\n');
    } else {
      // Check if review already exists for this task
      const codeReviewsDir = join(projectRoot, 'code-reviews');
      let existingReview: string | null = null;

      if (fileOps.existsSync(codeReviewsDir)) {
        const files = fileOps.readdirSync(codeReviewsDir);
        const reviewPattern = new RegExp(`^${taskId}_.*\\.md$`);
        existingReview = files.find((f) => reviewPattern.test(f)) || null;
      }

      if (existingReview) {
        cons.log(`✅ Code review already exists: code-reviews/${existingReview}`);
        cons.log('Skipping code review generation (only one review per task).\n');
      } else {
        const reviewTool = getReviewTool();
        cons.log(
          `Running comprehensive code review with ${reviewTool === 'claude' ? 'Claude SDK' : 'CodeRabbit CLI'}...`,
        );
        cons.log(`This may take up to ${reviewTool === 'claude' ? '10' : '30'} minutes for thorough analysis.\n`);

        try {
          // Get task details
          const taskFilePath = join(projectRoot, '.claude', 'tasks', `${taskId}.md`);
          const taskContent = fileOps.readFileSync(taskFilePath, 'utf-8');

          // Extract task title
          const titleMatch = taskContent.match(/^# (.+)$/m);
          const taskTitle = titleMatch ? titleMatch[1] : taskId;

          // Get git diff from merge base
          const currentBranch = getCurrent(projectRoot);
          const defaultBranch = getDefault(projectRoot);
          let gitDiff = '';
          let mergeBase: string | null = null;

          if (currentBranch && currentBranch !== defaultBranch) {
            mergeBase = getMerge(currentBranch, defaultBranch, projectRoot);
            if (mergeBase) {
              try {
                gitDiff = exec(`git diff ${mergeBase}..HEAD`, {
                  encoding: 'utf-8',
                  cwd: projectRoot,
                  maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
                });
              } catch (diffError) {
                logger.warn('Failed to get git diff', { error: diffError });
                gitDiff = 'Failed to retrieve git diff';
              }
            }
          } else {
            // On default branch, use last commit
            try {
              gitDiff = exec('git diff HEAD~1..HEAD', {
                encoding: 'utf-8',
                cwd: projectRoot,
                maxBuffer: 10 * 1024 * 1024,
              });
            } catch {
              gitDiff = 'No changes to review';
            }
          }

          // Ensure code-reviews directory exists
          if (!fileOps.existsSync(codeReviewsDir)) {
            fileOps.mkdirSync(codeReviewsDir, { recursive: true });
          }

          logger.info('Starting code review', { taskId, taskTitle });
          const reviewResult = await performReview({
            taskId,
            taskTitle,
            taskRequirements: taskContent,
            gitDiff,
            projectRoot,
            mergeBase: mergeBase || undefined,
          });

          if (reviewResult.success) {
            // Check if a review file was created
            const files = fileOps.readdirSync(codeReviewsDir);
            const reviewPattern = new RegExp(`^${taskId}_.*\\.md$`);
            const newReview = files.find((f) => reviewPattern.test(f));

            if (newReview) {
              cons.log(`✅ Code review completed: code-reviews/${newReview}\n`);

              // Read and display the full review content
              const reviewPath = join(codeReviewsDir, newReview);
              const reviewContent = fileOps.readFileSync(reviewPath, 'utf-8');

              cons.log('### 📄 Code Review Results\n');
              cons.log('```markdown');
              cons.log(reviewContent);
              cons.log('```\n');

              cons.log('### 🎯 Required Actions for Claude\n');
              cons.log('You MUST present a comprehensive analysis of this code review to the user:\n');
              cons.log('1. **Share ALL findings** - Present every finding from the review above to the user');
              cons.log('2. **For issues you will fix:**');
              cons.log('   - List each issue you plan to address');
              cons.log('   - Explain exactly how you will fix it');
              cons.log('   - Provide your reasoning for the fix');
              cons.log('3. **For issues you disagree with:**');
              cons.log('   - Clearly identify which findings you disagree with');
              cons.log('   - Provide detailed technical justification for your disagreement');
              cons.log('   - Explain why the suggested change would not improve the code');
              cons.log('4. **For low-priority issues:**');
              cons.log('   - Identify findings you consider non-critical');
              cons.log('   - Explain why they are low priority');
              cons.log('   - Justify why they should not block task completion');
              cons.log('5. **Summary** - Provide a clear summary of:');
              cons.log('   - Critical issues that MUST be fixed before completion');
              cons.log('   - Nice-to-have improvements for future consideration');
              cons.log('   - Review findings that are incorrect or not applicable\n');
              cons.log(
                '**IMPORTANT:** Do not proceed with fixes until you have presented this analysis to the user and received their feedback.\n',
              );
            } else {
              cons.log('⚠️ Code review completed but no review file was created.\n');
            }
          } else {
            cons.log(`⚠️ Code review failed: ${reviewResult.error || 'Unknown error'}`);
            cons.log('You can proceed without the code review.\n');
          }
        } catch (reviewError) {
          logger.error('Code review failed', { error: reviewError });
          cons.log(`⚠️ Code review error: ${reviewError instanceof Error ? reviewError.message : 'Unknown error'}`);
          cons.log('You can proceed without the code review.\n');
        }
      }
    }
  }
}

/**
 * Prepare completion command action
 * Runs validation checks and generates dynamic instructions based on results
 */
export async function prepareCompletionAction(deps: PrepareCompletionDeps = {}) {
  const {
    runValidationChecks: runValidation = runValidationChecks,
    getConfig: getConf = getConfig,
    console: cons = console,
    process: proc = process,
  } = deps;

  const projectRoot = proc.cwd();

  try {
    // Run validation checks directly
    const result: PreparationResult = await runValidation(projectRoot);

    // Handle case where validation failed to run
    if (!result.success && result.error) {
      throw new Error(result.error);
    }

    // Generate dynamic instructions based on the results
    cons.log('## Prepare Task for Completion\n');

    // Check if validation passed
    const validationPassed = result.readyForCompletion;

    // Show validation status
    if (validationPassed) {
      cons.log('### ✅ Validation Passed\n');
      cons.log('All validation checks have passed successfully!\n');
    } else {
      cons.log('### ⚠️ Validation Issues Found\n');
      cons.log('The following issues need to be resolved before task completion:\n');

      // TypeScript errors
      if (result.validation?.typescript?.passed === false) {
        cons.log('#### TypeScript Errors');
        cons.log(`Found ${result.validation.typescript.errorCount || 'multiple'} TypeScript errors.\n`);
        if (result.validation.typescript.errors) {
          cons.log('```');
          cons.log(result.validation.typescript.errors.substring(0, 1000));
          if (result.validation.typescript.errors.length > 1000) {
            cons.log('... (truncated)');
          }
          cons.log('```\n');
        }
        cons.log('**Action:** Fix all TypeScript errors by updating type definitions and resolving type mismatches.\n');
      }

      // Biome/linting issues
      if (result.validation?.biome?.passed === false) {
        cons.log('#### Linting Issues');
        cons.log(`Found ${result.validation.biome.issueCount || 'multiple'} Biome issues.\n`);
        if (result.validation.biome.errors) {
          cons.log('```');
          cons.log(result.validation.biome.errors.substring(0, 1000));
          if (result.validation.biome.errors.length > 1000) {
            cons.log('... (truncated)');
          }
          cons.log('```\n');
        }
        cons.log('**Action:** Fix linting issues. Many can be auto-fixed with `bunx biome check --write`.\n');
      }

      // Test failures
      if (result.validation?.tests?.passed === false) {
        cons.log('#### Test Failures');
        cons.log(`Found ${result.validation.tests.failCount || 'multiple'} failing tests.\n`);
        if (result.validation.tests.errors) {
          cons.log('```');
          cons.log(result.validation.tests.errors.substring(0, 1000));
          if (result.validation.tests.errors.length > 1000) {
            cons.log('... (truncated)');
          }
          cons.log('```\n');
        }
        cons.log('**Action:** Fix failing tests or update test expectations as needed.\n');
      }

      // Knip unused code warnings (non-blocking)
      if (result.validation?.knip?.passed === false) {
        cons.log('#### Unused Code (Optional)');
        const issues = [];
        if (result.validation.knip.unusedFiles) {
          issues.push(`${result.validation.knip.unusedFiles} unused files`);
        }
        if (result.validation.knip.unusedExports) {
          issues.push(`${result.validation.knip.unusedExports} unused exports`);
        }
        if (result.validation.knip.unusedDeps) {
          issues.push(`${result.validation.knip.unusedDeps} unused dependencies`);
        }
        cons.log(`Knip found: ${issues.join(', ')}\n`);
        cons.log("**Note:** These are warnings and won't block completion, but consider cleaning them up.\n");
      }
    }

    // Git status information
    if (result.git?.hasUncommittedChanges) {
      cons.log('#### Uncommitted Changes');
      cons.log(`Found ${result.git.modifiedFiles?.length || 'uncommitted'} modified files.\n`);
      cons.log('**Note:** These will be automatically committed during task completion.\n');
    }

    if (result.git?.wipCommitCount > 0) {
      cons.log('#### WIP Commits');
      cons.log(`Found ${result.git.wipCommitCount} WIP commits that will be squashed during completion.\n`);
    }

    // Task status check
    if (result.task?.status !== 'in_progress') {
      cons.log('#### Task Status');
      cons.log(`Task status is '${result.task?.status || 'unknown'}', expected 'in_progress'.\n`);
      cons.log("**Note:** This won't block completion but is unusual.\n");
    }

    // Run code review
    await runCodeReview(projectRoot, validationPassed, deps);

    // Documentation update reminder - only if validation passed
    if (validationPassed) {
      cons.log('### Documentation Updates\n');
      cons.log('Update the task documentation:');
      cons.log('1. Update "## Recent Progress" section in the task file, but do not update the status yet');
      cons.log('2. Note any significant decisions in decision_log.md');
      cons.log('3. Document any new patterns in system_patterns.md');
      cons.log('4. Update progress_log.md with what was accomplished');
      cons.log('5. If this task came from the backlog, remove it from backlog.md');
      cons.log('6. Let the stop-review hook automatically commit your changes\n');
    }

    // Journal reflection reminder (only if validation passed and private journal is enabled)
    const config = getConf();
    const hasPrivateJournal = config.features?.private_journal?.enabled === true;

    if (validationPassed && hasPrivateJournal) {
      cons.log('### Journal Reflection\n');
      cons.log('Consider recording insights about:');
      cons.log('- Technical challenges encountered and solutions');
      cons.log('- Patterns that worked well or poorly');
      cons.log('- Any learnings for future tasks\n');
    }

    cons.log('### Next Steps\n');
    if (!validationPassed) {
      cons.log('1. Fix the validation issues listed above');
      cons.log('2. Ask the user to run `/prepare-completion` again to verify all issues are resolved\n');
    } else {
      cons.log('1. Complete all documentation updates above');
      if (hasPrivateJournal) {
        cons.log('2. Record any insights in your journal');
        cons.log('3. Ask the user to run `/complete-task` to finalize the task\n');
      } else {
        cons.log('2. Ask the user to run `/complete-task` to finalize the task\n');
      }
      cons.log('**✅ Task is ready for completion!**\n');
    }

    // Always exit with success so the output is passed to Claude
    // The command already outputs detailed feedback about what needs fixing
    proc.exit(0);
  } catch (error) {
    // Handle cases where validation-checks command fails completely
    cons.log('## ❌ Validation Check Failed\n');

    const err = error as { code?: string; status?: number; message?: string; stderr?: string };
    if (err.code === 'ENOENT') {
      cons.log('Error: Could not find cc-track binary.\n');
      cons.log(
        'Please ensure the project is built with: `bun build ./src/cli/index.ts --compile --outfile dist/cc-track`',
      );
    } else if (err.status === 127) {
      cons.log('Error: cc-track command not found.\n');
      cons.log('Please ensure the project is built properly.');
    } else {
      cons.log(`Error running validation checks: ${err.message || 'Unknown error'}\n`);
      if (err.stderr) {
        cons.log('Error details:');
        cons.log(err.stderr);
      }
    }

    // Exit with 0 so Claude sees the error message
    proc.exit(0);
  }
}

/**
 * Create prepare-completion command
 */
export function createPrepareCompletionCommand(): Command {
  return new Command('prepare-completion')
    .description('Prepare task for completion by running validation and generating fix instructions')
    .action(() => prepareCompletionAction());
}
