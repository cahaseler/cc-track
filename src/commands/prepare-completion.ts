import { Command } from 'commander';
import { type PreparationResult, runValidationChecks } from '../lib/validation';

/**
 * Prepare completion command action
 * Runs validation checks and generates dynamic instructions based on results
 */
async function prepareCompletionAction() {
  const projectRoot = process.cwd();

  try {
    // Run validation checks directly
    const result: PreparationResult = await runValidationChecks(projectRoot);

    // Handle case where validation failed to run
    if (!result.success && result.error) {
      throw new Error(result.error);
    }

    // Generate dynamic instructions based on the results
    console.log('## Prepare Task for Completion\n');

    // Check if validation passed
    const validationPassed = result.readyForCompletion;

    // Show validation status
    if (validationPassed) {
      console.log('### ✅ Validation Passed\n');
      console.log('All validation checks have passed successfully!\n');
    } else {
      console.log('### ⚠️ Validation Issues Found\n');
      console.log('The following issues need to be resolved before task completion:\n');

      // TypeScript errors
      if (result.validation?.typescript?.passed === false) {
        console.log('#### TypeScript Errors');
        console.log(`Found ${result.validation.typescript.errorCount || 'multiple'} TypeScript errors.\n`);
        if (result.validation.typescript.errors) {
          console.log('```');
          console.log(result.validation.typescript.errors.substring(0, 1000));
          if (result.validation.typescript.errors.length > 1000) {
            console.log('... (truncated)');
          }
          console.log('```\n');
        }
        console.log(
          '**Action:** Fix all TypeScript errors by updating type definitions and resolving type mismatches.\n',
        );
      }

      // Biome/linting issues
      if (result.validation?.biome?.passed === false) {
        console.log('#### Linting Issues');
        console.log(`Found ${result.validation.biome.issueCount || 'multiple'} Biome issues.\n`);
        if (result.validation.biome.errors) {
          console.log('```');
          console.log(result.validation.biome.errors.substring(0, 1000));
          if (result.validation.biome.errors.length > 1000) {
            console.log('... (truncated)');
          }
          console.log('```\n');
        }
        console.log('**Action:** Fix linting issues. Many can be auto-fixed with `bunx biome check --write`.\n');
      }

      // Test failures
      if (result.validation?.tests?.passed === false) {
        console.log('#### Test Failures');
        console.log(`Found ${result.validation.tests.failCount || 'multiple'} failing tests.\n`);
        if (result.validation.tests.errors) {
          console.log('```');
          console.log(result.validation.tests.errors.substring(0, 1000));
          if (result.validation.tests.errors.length > 1000) {
            console.log('... (truncated)');
          }
          console.log('```\n');
        }
        console.log('**Action:** Fix failing tests or update test expectations as needed.\n');
      }

      // Knip unused code warnings (non-blocking)
      if (result.validation?.knip?.passed === false) {
        console.log('#### Unused Code (Optional)');
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
        console.log(`Knip found: ${issues.join(', ')}\n`);
        console.log("**Note:** These are warnings and won't block completion, but consider cleaning them up.\n");
      }
    }

    // Git status information
    if (result.git?.hasUncommittedChanges) {
      console.log('#### Uncommitted Changes');
      console.log(`Found ${result.git.modifiedFiles?.length || 'uncommitted'} modified files.\n`);
      console.log('**Note:** These will be automatically committed during task completion.\n');
    }

    if (result.git?.wipCommitCount > 0) {
      console.log('#### WIP Commits');
      console.log(`Found ${result.git.wipCommitCount} WIP commits that will be squashed during completion.\n`);
    }

    // Task status check
    if (result.task?.status !== 'in_progress') {
      console.log('#### Task Status');
      console.log(`Task status is '${result.task?.status || 'unknown'}', expected 'in_progress'.\n`);
      console.log("**Note:** This won't block completion but is unusual.\n");
    }

    // Documentation update reminder
    console.log('### Documentation Updates\n');
    if (!validationPassed) {
      console.log('After fixing validation issues, update the task documentation:');
    } else {
      console.log('Update the task documentation:');
    }
    console.log('1. Update "## Recent Progress" section in the task file, but do not update the status yet');
    console.log('2. Note any significant decisions in decision_log.md');
    console.log('3. Document any new patterns in system_patterns.md');
    console.log('4. Let the stop-review hook automatically commit your changes\n');

    // Journal reflection reminder
    console.log('### Journal Reflection\n');
    console.log('Consider recording insights about:');
    console.log('- Technical challenges encountered and solutions');
    console.log('- Patterns that worked well or poorly');
    console.log('- Any learnings for future tasks\n');

    console.log('### Next Steps\n');
    if (!validationPassed) {
      console.log('1. Fix the validation issues listed above');
      console.log('2. Update documentation and record insights');
      console.log('3. Ask the user to run `/prepare-completion` again to verify all issues are resolved');
      console.log('4. Once all checks pass, ask the user to run `/complete-task` to finalize\n');
    } else {
      console.log('1. Complete the documentation updates above');
      console.log('2. Record any insights in your journal');
      console.log('3. Ask the user to run `/complete-task` to finalize the task\n');
      console.log('**✅ Task is ready for completion!**\n');
    }

    // Exit with appropriate code
    process.exit(validationPassed ? 0 : 1);
  } catch (error) {
    // Handle cases where validation-checks command fails completely
    console.log('## ❌ Validation Check Failed\n');

    const err = error as { code?: string; status?: number; message?: string; stderr?: string };
    if (err.code === 'ENOENT') {
      console.log('Error: Could not find cc-track binary.\n');
      console.log(
        'Please ensure the project is built with: `bun build ./src/cli/index.ts --compile --outfile dist/cc-track`',
      );
    } else if (err.status === 127) {
      console.log('Error: cc-track command not found.\n');
      console.log('Please ensure the project is built properly.');
    } else {
      console.log(`Error running validation checks: ${err.message || 'Unknown error'}\n`);
      if (err.stderr) {
        console.log('Error details:');
        console.log(err.stderr);
      }
    }

    process.exit(1);
  }
}

/**
 * Create prepare-completion command
 */
export function createPrepareCompletionCommand(): Command {
  return new Command('prepare-completion')
    .description('Prepare task for completion by running validation and generating fix instructions')
    .action(prepareCompletionAction);
}
