import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getActiveTaskId } from './claude-md';
import { type EditValidationConfig, getConfig } from './config';
import { isWipCommit } from './git-helpers';
import { createLogger } from './logger';

const logger = createLogger('validation');

interface ValidationResult {
  typescript?: {
    passed: boolean;
    errors?: string;
    errorCount?: number;
  };
  biome?: {
    passed: boolean;
    errors?: string;
    issueCount?: number;
  };
  tests?: {
    passed: boolean;
    errors?: string;
    failCount?: number;
  };
  knip?: {
    passed: boolean;
    unusedFiles?: number;
    unusedExports?: number;
    unusedDeps?: number;
    details?: string;
  };
}

interface GitStatus {
  hasUncommittedChanges: boolean;
  modifiedFiles: string[];
  wipCommitCount: number;
  currentBranch: string;
  isTaskBranch: boolean;
}

interface TaskInfo {
  exists: boolean;
  taskId?: string;
  taskTitle?: string;
  status?: string;
  filePath?: string;
}

export interface PreparationResult {
  success: boolean;
  readyForCompletion: boolean;
  task: TaskInfo;
  validation: ValidationResult;
  git: GitStatus;
  warnings: string[];
  error?: string;
}

/**
 * Run TypeScript validation
 */
function runTypeScriptCheck(projectRoot: string): ValidationResult['typescript'] {
  try {
    const config = getConfig();
    const editValidation = config.hooks?.edit_validation as EditValidationConfig | undefined;
    const tsConfig = editValidation?.typecheck;
    const command = tsConfig?.command || 'bunx tsc --noEmit';

    logger.info('Running TypeScript check', { command });
    execSync(command, { cwd: projectRoot, encoding: 'utf-8' });

    return { passed: true };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    const output = err.stdout || err.stderr || 'TypeScript check failed';
    const errorCount = (output.match(/error TS/g) || []).length;

    logger.error('TypeScript check failed', { errorCount });
    return {
      passed: false,
      errors: output.substring(0, 2000), // Limit output size
      errorCount,
    };
  }
}

/**
 * Run Biome linting and auto-formatting
 */
function runBiomeCheck(projectRoot: string): ValidationResult['biome'] {
  try {
    // First, run auto-formatter
    try {
      logger.info('Running Biome auto-formatter');
      execSync('bunx biome check --write', { cwd: projectRoot, encoding: 'utf-8' });
    } catch {
      // Auto-formatter might fail if there are syntax errors, continue to check
    }

    // Now run the check
    const config = getConfig();
    const editValidation = config.hooks?.edit_validation as EditValidationConfig | undefined;
    const biomeConfig = editValidation?.lint;
    const command = biomeConfig?.command || 'bunx biome check';

    logger.info('Running Biome check', { command });
    execSync(command, { cwd: projectRoot, encoding: 'utf-8' });

    return { passed: true };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    const output = err.stdout || err.stderr || 'Biome check failed';

    // Try to parse Biome output for issue count
    const issueMatch = output.match(/(\d+)\s+diagnostic/);
    const issueCount = issueMatch ? parseInt(issueMatch[1], 10) : undefined;

    logger.error('Biome check failed', { issueCount });
    return {
      passed: false,
      errors: output.substring(0, 2000),
      issueCount,
    };
  }
}

/**
 * Run tests
 */
function runTests(projectRoot: string): ValidationResult['tests'] {
  try {
    // Check if test script exists in package.json
    const packageJsonPath = join(projectRoot, 'package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      if (!packageJson.scripts?.test) {
        logger.info('No test script found in package.json');
        return { passed: true };
      }
    }

    logger.info('Running tests');
    // Run tests silently and just check exit code
    // We redirect output to /dev/null to avoid polluting the JSON output
    try {
      execSync('bun test >/dev/null 2>&1', {
        cwd: projectRoot,
        encoding: 'utf-8',
        shell: '/bin/bash',
      });
      // If execSync doesn't throw, tests passed
      logger.info('All tests passed');
      return { passed: true };
    } catch (_testError) {
      // Tests failed - run again to get details for the error report
      const output = execSync('bun test 2>&1 || true', {
        cwd: projectRoot,
        encoding: 'utf-8',
        shell: '/bin/bash',
      });

      // Extract fail count and failed test details
      const failMatch = output.match(/(\d+)\s+fail/);
      const failCount = failMatch ? parseInt(failMatch[1], 10) : 1;

      // Extract only the failed test lines
      const failedTests = output
        .split('\n')
        .filter((line) => line.includes('(fail)'))
        .map((line) => line.trim())
        .join('\n');

      return {
        passed: false,
        errors: failedTests || 'Test failures detected',
        failCount: failCount,
      };
    }
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    const output = err.stdout || err.stderr || 'Tests failed';

    const failMatch = output.match(/(\d+)\s+fail/);
    const failCount = failMatch ? parseInt(failMatch[1], 10) : undefined;

    logger.error('Tests failed', { failCount });
    return {
      passed: false,
      errors: output.substring(0, 2000),
      failCount,
    };
  }
}

/**
 * Run Knip for unused code detection
 */
function runKnipCheck(projectRoot: string): ValidationResult['knip'] {
  try {
    const config = getConfig();
    const editValidation = config.hooks?.edit_validation as EditValidationConfig | undefined;
    const knipConfig = editValidation?.knip;

    if (!knipConfig?.enabled) {
      logger.info('Knip check disabled');
      return { passed: true };
    }

    const command = knipConfig.command || 'bunx knip';
    logger.info('Running Knip check', { command });

    const output = execSync(command, { cwd: projectRoot, encoding: 'utf-8' });

    // Parse Knip output
    const filesMatch = output.match(/Unused files\s+(\d+)/);
    const exportsMatch = output.match(/Unused exports\s+(\d+)/);
    const depsMatch = output.match(/Unused dependencies\s+(\d+)/);

    const unusedFiles = filesMatch ? parseInt(filesMatch[1], 10) : 0;
    const unusedExports = exportsMatch ? parseInt(exportsMatch[1], 10) : 0;
    const unusedDeps = depsMatch ? parseInt(depsMatch[1], 10) : 0;

    if (unusedFiles > 0 || unusedExports > 0 || unusedDeps > 0) {
      return {
        passed: false,
        unusedFiles,
        unusedExports,
        unusedDeps,
        details: output.substring(0, 1000),
      };
    }

    return { passed: true };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    const output = err.stdout || err.stderr || '';

    // Parse even from error output
    const filesMatch = output.match(/Unused files\s+(\d+)/);
    const exportsMatch = output.match(/Unused exports\s+(\d+)/);
    const depsMatch = output.match(/Unused dependencies\s+(\d+)/);

    logger.warn('Knip check completed with issues');
    return {
      passed: false,
      unusedFiles: filesMatch ? parseInt(filesMatch[1], 10) : undefined,
      unusedExports: exportsMatch ? parseInt(exportsMatch[1], 10) : undefined,
      unusedDeps: depsMatch ? parseInt(depsMatch[1], 10) : undefined,
      details: output.substring(0, 1000),
    };
  }
}

/**
 * Get git status information
 */
function getGitStatus(projectRoot: string, taskId?: string): GitStatus {
  try {
    // Check for uncommitted changes
    const statusOutput = execSync('git status --porcelain', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();

    const modifiedFiles = statusOutput
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.substring(3).trim());

    // Get current branch
    const currentBranch = execSync('git branch --show-current', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();

    // Count WIP commits
    const gitLog = execSync('git log --oneline -20', {
      cwd: projectRoot,
      encoding: 'utf-8',
    });

    const wipCommitCount = gitLog
      .split('\n')
      .filter((line) => line.trim())
      .filter((line) => isWipCommit(line)).length;

    // Check if on task branch
    const isTaskBranch = taskId ? currentBranch.includes(taskId.toLowerCase()) : false;

    logger.info('Git status', {
      hasUncommittedChanges: modifiedFiles.length > 0,
      modifiedFileCount: modifiedFiles.length,
      wipCommitCount,
      currentBranch,
      isTaskBranch,
    });

    return {
      hasUncommittedChanges: modifiedFiles.length > 0,
      modifiedFiles,
      wipCommitCount,
      currentBranch,
      isTaskBranch,
    };
  } catch (error) {
    logger.error('Failed to get git status', { error });
    return {
      hasUncommittedChanges: false,
      modifiedFiles: [],
      wipCommitCount: 0,
      currentBranch: 'unknown',
      isTaskBranch: false,
    };
  }
}

/**
 * Get task information
 */
function getTaskInfo(projectRoot: string): TaskInfo {
  try {
    const taskId = getActiveTaskId(projectRoot);
    if (!taskId) {
      return { exists: false };
    }

    const taskFilePath = join(projectRoot, '.claude', 'tasks', `${taskId}.md`);
    if (!existsSync(taskFilePath)) {
      return { exists: false };
    }

    const taskContent = readFileSync(taskFilePath, 'utf-8');

    // Extract task title
    const titleMatch = taskContent.match(/^# (.+)$/m);
    const taskTitle = titleMatch ? titleMatch[1] : taskId;

    // Extract status
    const statusMatch = taskContent.match(/\*\*Status:\*\* (\w+)/);
    const status = statusMatch ? statusMatch[1] : 'unknown';

    logger.info('Task info', { taskId, taskTitle, status });

    return {
      exists: true,
      taskId,
      taskTitle,
      status,
      filePath: taskFilePath,
    };
  } catch (error) {
    logger.error('Failed to get task info', { error });
    return { exists: false };
  }
}

/**
 * Run validation checks and return the result
 * This function can be called by other commands or used directly
 */
export async function runValidationChecks(projectRoot: string = process.cwd()): Promise<PreparationResult> {
  const result: PreparationResult = {
    success: false,
    readyForCompletion: false,
    task: { exists: false },
    validation: {},
    git: {
      hasUncommittedChanges: false,
      modifiedFiles: [],
      wipCommitCount: 0,
      currentBranch: '',
      isTaskBranch: false,
    },
    warnings: [],
  };

  try {
    // Get task information
    result.task = getTaskInfo(projectRoot);

    if (!result.task.exists) {
      result.error = 'No active task found';
      result.success = false;
      return result;
    }

    if (result.task.status !== 'in_progress') {
      result.warnings.push(`Task status is '${result.task.status}', expected 'in_progress'`);
    }

    // Get git status
    result.git = getGitStatus(projectRoot, result.task.taskId);

    // Run validation checks
    logger.info('Starting validation checks');

    // TypeScript check
    result.validation.typescript = runTypeScriptCheck(projectRoot);

    // Biome check
    result.validation.biome = runBiomeCheck(projectRoot);

    // Test check
    result.validation.tests = runTests(projectRoot);

    // Knip check
    result.validation.knip = runKnipCheck(projectRoot);

    // Determine if ready for completion
    const allValidationPassed =
      result.validation.typescript?.passed !== false &&
      result.validation.biome?.passed !== false &&
      result.validation.tests?.passed !== false;

    // Knip issues are warnings, not blockers
    if (result.validation.knip?.passed === false) {
      const knipIssues = [];
      if (result.validation.knip.unusedFiles) {
        knipIssues.push(`${result.validation.knip.unusedFiles} unused files`);
      }
      if (result.validation.knip.unusedExports) {
        knipIssues.push(`${result.validation.knip.unusedExports} unused exports`);
      }
      if (result.validation.knip.unusedDeps) {
        knipIssues.push(`${result.validation.knip.unusedDeps} unused dependencies`);
      }
      if (knipIssues.length > 0) {
        result.warnings.push(`Knip found: ${knipIssues.join(', ')}`);
      }
    }

    result.readyForCompletion = allValidationPassed;
    result.success = true;

    logger.info('Preparation check complete', {
      readyForCompletion: result.readyForCompletion,
      warnings: result.warnings,
    });
  } catch (error) {
    logger.error('Preparation failed', { error });
    result.error = error instanceof Error ? error.message : 'Unknown error';
    result.success = false;
  }

  return result;
}
