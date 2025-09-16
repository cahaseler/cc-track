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
import type { CommandResult, PartialCommandDeps } from './context';
import { applyCommandResult, handleCommandException, isCommandSuccess, resolveCommandDeps } from './context';

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
  cwd?: () => string;
}

/**
 * Run code review for the active task
 */
export interface CodeReviewResultData {
  reviewFile?: string;
  reviewGenerated?: boolean;
}

export async function runCodeReview(
  projectRoot: string,
  validationPassed: boolean,
  deps: PrepareCompletionDeps = {},
): Promise<CommandResult<CodeReviewResultData>> {
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
  } = deps;

  const messages: string[] = [];
  const warnings: string[] = [];

  // Run code review if validation passed and feature is enabled
  if (validationPassed && isReviewEnabled()) {
    messages.push('### 🔍 Code Review\n');

    const taskId = getTaskId(projectRoot);

    if (!taskId) {
      messages.push('⚠️ Could not run code review: No active task found\n');
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
        messages.push(`✅ Code review already exists: code-reviews/${existingReview}`);
        messages.push('Skipping code review generation (only one review per task).\n');
      } else {
        const reviewTool = getReviewTool();
        messages.push(
          `Running comprehensive code review with ${reviewTool === 'claude' ? 'Claude SDK' : 'CodeRabbit CLI'}...`,
        );
        messages.push(`This may take up to ${reviewTool === 'claude' ? '10' : '30'} minutes for thorough analysis.\n`);

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
              messages.push(`✅ Code review completed: code-reviews/${newReview}\n`);

              // Read and display the full review content
              const reviewPath = join(codeReviewsDir, newReview);
              const reviewContent = fileOps.readFileSync(reviewPath, 'utf-8');

              messages.push('### 📄 Code Review Results\n');
              messages.push('```markdown');
              messages.push(reviewContent);
              messages.push('```\n');

              messages.push('### 🎯 Required Actions for Claude\n');
              messages.push('You MUST present a comprehensive analysis of this code review to the user:\n');
              messages.push('1. **Share ALL findings** - Present every finding from the review above to the user');
              messages.push('2. **For issues you will fix:**');
              messages.push('   - List each issue you plan to address');
              messages.push('   - Explain exactly how you will fix it');
              messages.push('   - Provide your reasoning for the fix');
              messages.push('3. **For issues you disagree with:**');
              messages.push('   - Clearly identify which findings you disagree with');
              messages.push('   - Provide detailed technical justification for your disagreement');
              messages.push('   - Explain why the suggested change would not improve the code');
              messages.push('4. **For low-priority issues:**');
              messages.push('   - Identify findings you consider non-critical');
              messages.push('   - Explain why they are low priority');
              messages.push('   - Justify why they should not block task completion');
              messages.push('5. **Summary** - Provide a clear summary of:');
              messages.push('   - Critical issues that MUST be fixed before completion');
              messages.push('   - Nice-to-have improvements for future consideration');
              messages.push('   - Review findings that are incorrect or not applicable\n');
              messages.push(
                '**IMPORTANT:** Do not proceed with fixes until you have presented this analysis to the user and received their feedback.\n',
              );

              return {
                success: true,
                messages,
                warnings,
                data: { reviewFile: join('code-reviews', newReview), reviewGenerated: true },
              };
            } else {
              warnings.push('⚠️ Code review completed but no review file was created.');
            }
          } else {
            warnings.push(`⚠️ Code review failed: ${reviewResult.error || 'Unknown error'}`);
            messages.push('You can proceed without the code review.\n');
          }
        } catch (reviewError) {
          logger.error('Code review failed', { error: reviewError });
          warnings.push(`⚠️ Code review error: ${reviewError instanceof Error ? reviewError.message : 'Unknown error'}`);
          messages.push('You can proceed without the code review.\n');
        }
      }
    }
  }

  return {
    success: true,
    messages,
    warnings,
  };
}

/**
 * Prepare completion command action
 * Runs validation checks and generates dynamic instructions based on results
 */
export interface PrepareCompletionResultData {
  validation?: PreparationResult;
  readyForCompletion?: boolean;
  codeReview?: CodeReviewResultData;
  error?: string;
}

export async function prepareCompletionAction(
  deps: PrepareCompletionDeps = {},
): Promise<CommandResult<PrepareCompletionResultData>> {
  const { runValidationChecks: runValidation = runValidationChecks, getConfig: getConf = getConfig } = deps;

  const projectRoot = deps.cwd ? deps.cwd() : process.cwd();
  const messages: string[] = [];
  const warnings: string[] = [];

  try {
    // Run validation checks directly
    const result: PreparationResult = await runValidation(projectRoot);

    // Handle case where validation failed to run
    if (!result.success && result.error) {
      throw new Error(result.error);
    }

    // Generate dynamic instructions based on the results
    messages.push('## Prepare Task for Completion\n');

    // Check if validation passed
    const validationPassed = result.readyForCompletion;

    // Show validation status
    if (validationPassed) {
      messages.push('### ✅ Validation Passed\n');
      messages.push('All validation checks have passed successfully!\n');
    } else {
      messages.push('### ⚠️ Validation Issues Found\n');
      messages.push('The following issues need to be resolved before task completion:\n');

      // TypeScript errors
      if (result.validation?.typescript?.passed === false) {
        messages.push('#### TypeScript Errors');
        messages.push(`Found ${result.validation.typescript.errorCount || 'multiple'} TypeScript errors.\n`);
        if (result.validation.typescript.errors) {
          messages.push('```');
          messages.push(result.validation.typescript.errors.substring(0, 1000));
          if (result.validation.typescript.errors.length > 1000) {
            messages.push('... (truncated)');
          }
          messages.push('```\n');
        }
        messages.push(
          '**Action:** Fix all TypeScript errors by updating type definitions and resolving type mismatches.\n',
        );
      }

      // Biome/linting issues
      if (result.validation?.biome?.passed === false) {
        messages.push('#### Linting Issues');
        messages.push(`Found ${result.validation.biome.issueCount || 'multiple'} Biome issues.\n`);
        if (result.validation.biome.errors) {
          messages.push('```');
          messages.push(result.validation.biome.errors.substring(0, 1000));
          if (result.validation.biome.errors.length > 1000) {
            messages.push('... (truncated)');
          }
          messages.push('```\n');
        }
        messages.push('**Action:** Fix linting issues. Many can be auto-fixed with `bunx biome check --write`.\n');
      }

      // Test failures
      if (result.validation?.tests?.passed === false) {
        messages.push('#### Test Failures');
        messages.push(`Found ${result.validation.tests.failCount || 'multiple'} failing tests.\n`);
        if (result.validation.tests.errors) {
          messages.push('```');
          messages.push(result.validation.tests.errors.substring(0, 1000));
          if (result.validation.tests.errors.length > 1000) {
            messages.push('... (truncated)');
          }
          messages.push('```\n');
        }
        messages.push('**Action:** Fix failing tests or update test expectations as needed.\n');
      }

      // Knip unused code warnings (non-blocking)
      if (result.validation?.knip?.passed === false) {
        messages.push('#### Unused Code (Optional)');
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
        messages.push(`Knip found: ${issues.join(', ')}\n`);
        messages.push("**Note:** These are warnings and won't block completion, but consider cleaning them up.\n");
      }
    }

    // Git status information
    if (result.git?.hasUncommittedChanges) {
      messages.push('#### Uncommitted Changes');
      messages.push(`Found ${result.git.modifiedFiles?.length || 'uncommitted'} modified files.\n`);
      messages.push('**Note:** These will be automatically committed during task completion.\n');
    }

    if (result.git?.wipCommitCount > 0) {
      messages.push('#### WIP Commits');
      messages.push(`Found ${result.git.wipCommitCount} WIP commits that will be squashed during completion.\n`);
    }

    // Task status check
    if (result.task?.status !== 'in_progress') {
      messages.push('#### Task Status');
      messages.push(`Task status is '${result.task?.status || 'unknown'}', expected 'in_progress'.\n`);
      messages.push("**Note:** This won't block completion but is unusual.\n");
    }

    // Run code review
    const codeReviewResult = await runCodeReview(projectRoot, validationPassed, deps);
    messages.push(...(codeReviewResult.messages ?? []));
    warnings.push(...(codeReviewResult.warnings ?? []));

    // Documentation update reminder - only if validation passed
    if (validationPassed) {
      messages.push('### Documentation Updates\n');
      messages.push('Update the task documentation:');
      messages.push('1. Update "## Recent Progress" section in the task file, but do not update the status yet');
      messages.push('2. Note any significant decisions in decision_log.md');
      messages.push('3. Document any new patterns in system_patterns.md');
      messages.push('4. Update progress_log.md with what was accomplished');
      messages.push('5. If this task came from the backlog, remove it from backlog.md');
      messages.push('6. Let the stop-review hook automatically commit your changes\n');
    }

    // Journal reflection reminder (only if validation passed and private journal is enabled)
    const config = getConf();
    const hasPrivateJournal = config.features?.private_journal?.enabled === true;

    if (validationPassed && hasPrivateJournal) {
      messages.push('### Journal Reflection\n');
      messages.push('Consider recording insights about:');
      messages.push('- Technical challenges encountered and solutions');
      messages.push('- Patterns that worked well or poorly');
      messages.push('- Any learnings for future tasks\n');
    }

    messages.push('### Next Steps\n');
    if (!validationPassed) {
      messages.push('1. Fix the validation issues listed above');
      messages.push('2. Ask the user to run `/prepare-completion` again to verify all issues are resolved\n');
    } else {
      messages.push('1. Complete all documentation updates above');
      if (hasPrivateJournal) {
        messages.push('2. Record any insights in your journal');
        messages.push('3. Ask the user to run `/complete-task` to finalize the task\n');
      } else {
        messages.push('2. Ask the user to run `/complete-task` to finalize the task\n');
      }
      messages.push('**✅ Task is ready for completion!**\n');
    }

    const codeReviewData = isCommandSuccess(codeReviewResult) ? codeReviewResult.data : undefined;

    return {
      success: true,
      messages,
      warnings,
      data: {
        validation: result,
        readyForCompletion: validationPassed,
        codeReview: codeReviewData,
      },
      exitCode: 0,
    };
  } catch (error) {
    // Handle cases where validation-checks command fails completely
    messages.push('## ❌ Validation Check Failed\n');

    const err = error as { code?: string; status?: number; message?: string; stderr?: string };
    if (err.code === 'ENOENT') {
      messages.push('Error: Could not find cc-track binary.\n');
      messages.push(
        'Please ensure the project is built with: `bun build ./src/cli/index.ts --compile --outfile dist/cc-track`',
      );
    } else if (err.status === 127) {
      messages.push('Error: cc-track command not found.\n');
      messages.push('Please ensure the project is built properly.');
    } else {
      messages.push(`Error running validation checks: ${err.message || 'Unknown error'}\n`);
      if (err.stderr) {
        messages.push('Error details:');
        messages.push(err.stderr);
      }
    }

    return {
      success: true,
      messages,
      warnings,
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      exitCode: 0,
    };
  }
}

/**
 * Create prepare-completion command
 */
export function createPrepareCompletionCommand(overrides?: PartialCommandDeps): Command {
  return new Command('prepare-completion')
    .description('Prepare task for completion by running validation and generating fix instructions')
    .action(async () => {
      const deps = resolveCommandDeps(overrides);
      try {
        // Inline the dependency mapping - no need for separate function
        const prepDeps: PrepareCompletionDeps = {
          execSync: deps.childProcess.execSync,
          fileOps: {
            existsSync: deps.fs.existsSync,
            mkdirSync: deps.fs.mkdirSync,
            readFileSync: deps.fs.readFileSync,
            readdirSync: deps.fs.readdirSync,
          },
          performCodeReview,
          getActiveTaskId: deps.claudeMd.getActiveTaskId,
          isCodeReviewEnabled: deps.config.isCodeReviewEnabled,
          getCodeReviewTool,
          getConfig: deps.config.getConfig,
          getCurrentBranch: (cwd: string) => deps.git.getCurrentBranch(cwd),
          getDefaultBranch: (cwd: string) => deps.git.getDefaultBranch(cwd),
          getMergeBase: (branch: string, defaultBranch: string, cwd: string) =>
            deps.git.getMergeBase(branch, defaultBranch, cwd),
          runValidationChecks: deps.validation.runValidationChecks,
          logger: deps.logger('prepare-completion-command'),
          cwd: () => deps.process.cwd(),
        };
        const result = await prepareCompletionAction(prepDeps);
        applyCommandResult(result, deps);
      } catch (error) {
        handleCommandException(error, deps);
      }
    });
}
