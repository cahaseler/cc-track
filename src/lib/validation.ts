import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getActiveTaskId } from './claude-md';
import { type EditValidationConfig, getConfig, getLintConfig, getTestConfig } from './config';
import { isWipCommit } from './git-helpers';
import { getLintParser } from './lint-parsers';
import { createLogger } from './logger';

const logger = createLogger('validation');

interface ValidationResult {
  typescript?: {
    passed: boolean;
    errors?: string;
    errorCount?: number;
  };
  lint?: {
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
function runTypeScriptCheck(projectRoot: string, deps: ValidationDeps = {}): ValidationResult['typescript'] {
  const getConfigFn = deps.getConfig || getConfig;
  const exec = deps.execSync || execSync;
  const log = deps.logger || logger;

  try {
    const config = getConfigFn();
    const editValidation = config.hooks?.edit_validation as EditValidationConfig | undefined;
    const tsConfig = editValidation?.typecheck;

    if (!tsConfig?.enabled) {
      log.info('TypeScript check disabled');
      return { passed: true };
    }

    const command = tsConfig?.command || 'bunx tsc --noEmit';

    log.info('Running TypeScript check', { command });
    exec(command, { cwd: projectRoot, encoding: 'utf-8' });

    return { passed: true };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    const output = err.stdout || err.stderr || 'TypeScript check failed';
    const errorCount = (output.match(/error TS/g) || []).length;

    log.error('TypeScript check failed', { errorCount });
    return {
      passed: false,
      errors: output.substring(0, 2000), // Limit output size
      errorCount,
    };
  }
}

/**
 * Run linting and auto-formatting
 */
function runLintCheck(projectRoot: string, deps: ValidationDeps = {}): ValidationResult['lint'] {
  const getLintConfigFn = deps.getLintConfig || getLintConfig;
  const exec = deps.execSync || execSync;
  const getParserFn = deps.getLintParser || getLintParser;
  const log = deps.logger || logger;

  try {
    const lintConfig = getLintConfigFn();
    if (!lintConfig || !lintConfig.enabled) {
      log.info('Lint check disabled');
      return { passed: true };
    }

    // First, run auto-formatter if configured
    if (lintConfig.autoFixCommand) {
      try {
        log.info('Running lint auto-formatter', { command: lintConfig.autoFixCommand });
        exec(lintConfig.autoFixCommand, { cwd: projectRoot, encoding: 'utf-8' });
      } catch {
        // Auto-formatter might fail if there are syntax errors, continue to check
      }
    }

    // Now run the lint check
    const command = lintConfig.command;
    log.info('Running lint check', { command, tool: lintConfig.tool || 'biome' });
    exec(command, { cwd: projectRoot, encoding: 'utf-8' });

    return { passed: true };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    const output = err.stdout || err.stderr || 'Lint check failed';

    // Parse output using the appropriate parser
    const lintConfig = getLintConfigFn();
    const parser = getParserFn(lintConfig?.tool || 'biome');
    const parseResult = parser.parseOutput(output);

    log.error('Lint check failed', { issueCount: parseResult.issueCount });
    return {
      passed: false,
      errors: output.substring(0, 2000),
      issueCount: parseResult.issueCount,
    };
  }
}

/**
 * Run tests
 */
function runTests(projectRoot: string, deps: ValidationDeps = {}): ValidationResult['tests'] {
  const fs = deps.fileOps || { existsSync, readFileSync };
  const exec = deps.execSync || execSync;
  const getTestConfigFn = deps.getTestConfig || getTestConfig;
  const log = deps.logger || logger;

  try {
    const testConfig = getTestConfigFn();
    if (!testConfig || !testConfig.enabled) {
      log.info('Tests disabled');
      return { passed: true };
    }

    const command = testConfig.command || 'bun test';

    // Check if test script exists in package.json
    const packageJsonPath = join(projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (!packageJson.scripts?.test) {
        log.info('No test script found in package.json');
        return { passed: true };
      }
    }

    log.info('Running tests', { command });
    // Run tests silently and just check exit code
    // We redirect output to /dev/null to avoid polluting the JSON output
    try {
      exec(`${command} >/dev/null 2>&1`, {
        cwd: projectRoot,
        encoding: 'utf-8',
        shell: '/bin/bash',
      });
      // If exec doesn't throw, tests passed
      log.info('All tests passed');
      return { passed: true };
    } catch (_testError) {
      // Tests failed - run again to get details for the error report
      const output = exec(`${command} 2>&1 || true`, {
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

    log.error('Tests failed', { failCount });
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
function runKnipCheck(projectRoot: string, deps: ValidationDeps = {}): ValidationResult['knip'] {
  const getConfigFn = deps.getConfig || getConfig;
  const exec = deps.execSync || execSync;
  const log = deps.logger || logger;

  try {
    const config = getConfigFn();
    const editValidation = config.hooks?.edit_validation as EditValidationConfig | undefined;
    const knipConfig = editValidation?.knip;

    if (!knipConfig?.enabled) {
      log.info('Knip check disabled');
      return { passed: true };
    }

    const command = knipConfig.command || 'bunx knip';
    log.info('Running Knip check', { command });

    const output = exec(command, { cwd: projectRoot, encoding: 'utf-8' });

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

    log.warn('Knip check completed with issues');
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
function getGitStatus(projectRoot: string, taskId?: string, deps: ValidationDeps = {}): GitStatus {
  const exec = deps.execSync || execSync;
  const isWipCommitFn = deps.isWipCommit || isWipCommit;
  const log = deps.logger || logger;

  try {
    // Check for uncommitted changes
    const statusOutput = exec('git status --porcelain', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();

    const modifiedFiles = statusOutput
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.substring(3).trim());

    // Get current branch
    const currentBranch = exec('git branch --show-current', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();

    // Count WIP commits
    const gitLog = exec('git log --oneline -20', {
      cwd: projectRoot,
      encoding: 'utf-8',
    });

    const wipCommitCount = gitLog
      .split('\n')
      .filter((line) => line.trim())
      .filter((line) => isWipCommitFn(line)).length;

    // Check if on task branch
    const isTaskBranch = taskId ? currentBranch.includes(taskId.toLowerCase()) : false;

    log.info('Git status', {
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
    log.error('Failed to get git status', { error });
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
function getTaskInfo(projectRoot: string, deps: ValidationDeps = {}): TaskInfo {
  const getActiveTaskIdFn = deps.getActiveTaskId || getActiveTaskId;
  const fs = deps.fileOps || { existsSync, readFileSync };
  const log = deps.logger || logger;

  try {
    const taskId = getActiveTaskIdFn(projectRoot);
    if (!taskId) {
      return { exists: false };
    }

    const taskFilePath = join(projectRoot, '.claude', 'tasks', `${taskId}.md`);
    if (!fs.existsSync(taskFilePath)) {
      return { exists: false };
    }

    const taskContent = fs.readFileSync(taskFilePath, 'utf-8');

    // Extract task title
    const titleMatch = taskContent.match(/^# (.+)$/m);
    const taskTitle = titleMatch ? titleMatch[1] : taskId;

    // Extract status
    const statusMatch = taskContent.match(/\*\*Status:\*\* (\w+)/);
    const status = statusMatch ? statusMatch[1] : 'unknown';

    log.info('Task info', { taskId, taskTitle, status });

    return {
      exists: true,
      taskId,
      taskTitle,
      status,
      filePath: taskFilePath,
    };
  } catch (error) {
    log.error('Failed to get task info', { error });
    return { exists: false };
  }
}

export interface ValidationDeps {
  execSync?: typeof execSync;
  fileOps?: {
    existsSync: typeof existsSync;
    readFileSync: typeof readFileSync;
  };
  getConfig?: typeof getConfig;
  getLintConfig?: typeof getLintConfig;
  getTestConfig?: typeof getTestConfig;
  getActiveTaskId?: typeof getActiveTaskId;
  isWipCommit?: typeof isWipCommit;
  getLintParser?: typeof getLintParser;
  logger?: ReturnType<typeof createLogger>;
}

/**
 * Run validation checks and return the result
 * This function can be called by other commands or used directly
 */
export async function runValidationChecks(
  projectRoot: string = process.cwd(),
  deps: ValidationDeps = {},
): Promise<PreparationResult> {
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

  const log = deps.logger || logger;

  try {
    // Get task information
    result.task = getTaskInfo(projectRoot, deps);

    if (!result.task.exists) {
      result.error = 'No active task found';
      result.success = false;
      return result;
    }

    if (result.task.status !== 'in_progress') {
      result.warnings.push(`Task status is '${result.task.status}', expected 'in_progress'`);
    }

    // Get git status
    result.git = getGitStatus(projectRoot, result.task.taskId, deps);

    // Run validation checks
    log.info('Starting validation checks');

    // TypeScript check
    result.validation.typescript = runTypeScriptCheck(projectRoot, deps);

    // Lint check
    result.validation.lint = runLintCheck(projectRoot, deps);

    // Test check
    result.validation.tests = runTests(projectRoot, deps);

    // Knip check
    result.validation.knip = runKnipCheck(projectRoot, deps);

    // Determine if ready for completion
    const allValidationPassed =
      result.validation.typescript?.passed !== false &&
      result.validation.lint?.passed !== false &&
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

    log.info('Preparation check complete', {
      readyForCompletion: result.readyForCompletion,
      warnings: result.warnings,
    });
  } catch (error) {
    log.error('Preparation failed', { error });
    result.error = error instanceof Error ? error.message : 'Unknown error';
    result.success = false;
  }

  return result;
}
