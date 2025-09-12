import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { isHookEnabled } from '../lib/config';
import { createLogger } from '../lib/logger';
import type { HookInput, HookOutput } from '../types';

const logger = createLogger('edit_validation');

export interface EditValidationConfig {
  enabled: boolean;
  description: string;
  typecheck?: {
    enabled: boolean;
    command: string;
  };
  lint?: {
    enabled: boolean;
    command: string;
  };
}

export interface ValidationResult {
  fileName: string;
  errors: string[];
}

/**
 * Extract file paths from tool input based on tool type
 */
export function extractFilePaths(toolName: string, toolInput: unknown): string[] {
  const filePaths: string[] = [];

  const input = toolInput as { file_path?: string };
  if (toolName === 'MultiEdit' && input.file_path) {
    filePaths.push(input.file_path);
  } else if ((toolName === 'Edit' || toolName === 'Write') && input.file_path) {
    filePaths.push(input.file_path);
  }

  return filePaths;
}

/**
 * Filter paths to only TypeScript files
 */
export function filterTypeScriptFiles(paths: string[]): string[] {
  return paths.filter(
    (path) => path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.mts') || path.endsWith('.cts'),
  );
}

/**
 * Identify test files to skip typechecking (but still allow linting)
 */
export function isTestFile(filePath: string): boolean {
  // Match common test naming conventions and folders
  if (/(\.test\.|\.spec\.)\w+$/.test(filePath)) return true; // *.test.ts(x), *.spec.ts(x), *.test.mts/cts
  if (/(^|\/)__tests__(\/|$)/.test(filePath)) return true; // __tests__/ paths
  return false;
}

/**
 * Load edit validation configuration
 */
export function loadEditValidationConfig(cwd: string): EditValidationConfig {
  const defaultConfig: EditValidationConfig = {
    enabled: false,
    description: 'Runs TypeScript and Biome checks on edited files',
    typecheck: {
      enabled: true,
      command: 'bunx tsc --noEmit',
    },
    lint: {
      enabled: true,
      command: 'bunx biome check',
    },
  };

  const configPath = join(cwd, '.claude', 'track.config.json');

  if (!existsSync(configPath)) {
    return defaultConfig;
  }

  try {
    const configContent = readFileSync(configPath, 'utf-8');
    const fullConfig = JSON.parse(configContent);
    if (fullConfig.hooks?.edit_validation) {
      return { ...defaultConfig, ...fullConfig.hooks.edit_validation };
    }
  } catch (error) {
    logger.error('Failed to read config', { error });
  }

  return defaultConfig;
}

/**
 * Run TypeScript validation on a file
 */
export function runTypeScriptCheck(
  filePath: string,
  config: EditValidationConfig,
  cwd: string,
  exec: typeof execSync = execSync,
  log: ReturnType<typeof createLogger> = logger,
): string[] {
  const errors: string[] = [];

  if (!config.typecheck?.enabled) {
    return errors;
  }

  // Skip typechecking for test files to avoid noisy failures
  if (isTestFile(filePath)) {
    log.debug('Skipping TypeScript check for test file', { filePath });
    return errors;
  }

  try {
    const command = `${config.typecheck.command} "${filePath}"`;
    log.debug('Running TypeScript check', { command });

    exec(command, {
      encoding: 'utf-8',
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const execError = error as { stderr?: string; stdout?: string; code?: string };
    // Re-throw timeout errors
    if (execError.code === 'ETIMEDOUT') {
      throw error;
    }
    if (execError.stderr || execError.stdout) {
      const output = execError.stderr || execError.stdout || '';
      // Parse TypeScript errors (format: file(line,col): error TSxxxx: message)
      const lines = output.split('\n').filter((line: string) => line.includes('error TS'));
      for (const line of lines) {
        const match = line.match(/\((\d+),\d+\): error TS\d+: (.+)/);
        if (match) {
          errors.push(`Line ${match[1]}: ${match[2]}`);
        }
      }
    }
  }

  return errors;
}

/**
 * Run Biome validation on a file
 */
export function runBiomeCheck(
  filePath: string,
  config: EditValidationConfig,
  cwd: string,
  exec: typeof execSync = execSync,
  log: ReturnType<typeof createLogger> = logger,
): string[] {
  const errors: string[] = [];

  if (!config.lint?.enabled) {
    return errors;
  }

  try {
    const command = `${config.lint.command} "${filePath}" --reporter=compact`;
    log.debug('Running Biome check', { command });

    exec(command, {
      encoding: 'utf-8',
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const execError = error as { stdout?: string; code?: string };
    // Re-throw timeout errors
    if (execError.code === 'ETIMEDOUT') {
      throw error;
    }
    if (execError.stdout) {
      // Parse Biome compact output (format: file:line:col lint/rule message)
      const lines = execError.stdout.split('\n').filter((line: string) => line.includes(filePath));
      for (const line of lines) {
        const match = line.match(/:(\d+):\d+ \S+ (.+)/);
        if (match) {
          errors.push(`Line ${match[1]}: ${match[2]}`);
        }
      }
    }
  }

  return errors;
}

/**
 * Validate multiple TypeScript files
 */
export function validateFiles(filePaths: string[], config: EditValidationConfig, cwd: string): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const filePath of filePaths) {
    const fileName = basename(filePath);
    const errors: string[] = [];

    // Run TypeScript check
    errors.push(...runTypeScriptCheck(filePath, config, cwd));

    // Run Biome check
    errors.push(...runBiomeCheck(filePath, config, cwd));

    if (errors.length > 0) {
      results.push({ fileName, errors });
    }
  }

  return results;
}

/**
 * Format validation results into a readable message
 */
export function formatValidationResults(results: ValidationResult[]): string {
  if (results.length === 0) {
    return '';
  }

  const lines: string[] = [];

  for (const result of results) {
    lines.push(`Issues in ${result.fileName}:`);
    lines.push(...result.errors.map((e) => `  - ${e}`));
    lines.push(''); // Add blank line between files
  }

  return lines.join('\n');
}

export interface EditValidationDependencies {
  execSync?: typeof execSync;
  existsSync?: typeof existsSync;
  readFileSync?: typeof readFileSync;
  logger?: ReturnType<typeof createLogger>;
  isHookEnabled?: typeof isHookEnabled;
  loadEditValidationConfig?: typeof loadEditValidationConfig;
}

/**
 * Main edit validation hook function
 */
export async function editValidationHook(input: HookInput, deps: EditValidationDependencies = {}): Promise<HookOutput> {
  const exec = deps.execSync || execSync;
  const log = deps.logger || logger;
  const checkEnabled = deps.isHookEnabled || isHookEnabled;
  const loadConfig = deps.loadEditValidationConfig || loadEditValidationConfig;

  try {
    // Check if hook is enabled
    if (!checkEnabled('edit_validation')) {
      return { continue: true };
    }

    log.debug('Hook triggered', {
      tool_name: input.tool_name,
      has_tool_response: !!input.tool_response,
      has_tool_input: !!input.tool_input,
      tool_input_keys: input.tool_input ? Object.keys(input.tool_input) : [],
    });

    // Only run on successful tool executions
    // Check if we have a tool_response - its presence indicates success
    // Write tool returns: { filePath, success }
    // Edit tool returns: { filePath, oldString, newString, ... }
    if (!input.tool_response) {
      log.debug('Skipping validation - no tool response');
      return { continue: true };
    }

    // For Write tool specifically, check the success field
    if (input.tool_name === 'Write') {
      const writeResponse = input.tool_response as { success?: boolean };
      if (writeResponse.success === false) {
        log.debug('Skipping validation - Write tool failed');
        return { continue: true };
      }
    }

    // Extract file paths
    const filePaths = extractFilePaths(input.tool_name || '', input.tool_input || {});
    log.debug('Extracted file paths', { filePaths });

    // Filter to TypeScript files
    const tsFiles = filterTypeScriptFiles(filePaths);
    log.debug('TypeScript files to validate', { tsFiles });

    if (tsFiles.length === 0) {
      log.debug('No TypeScript files to validate');
      return { continue: true };
    }

    // Load configuration
    const config = loadConfig(input.cwd || process.cwd());

    // Validate files using configured commands
    const results: ValidationResult[] = [];
    const cwd = input.cwd || process.cwd();

    for (const filePath of tsFiles) {
      const fileName = basename(filePath);
      const errors: string[] = [];

      // Check if file exists (for new files)
      const fs = deps.existsSync || existsSync;
      if (!fs(filePath)) {
        // File doesn't exist yet (new file), skip validation
        continue;
      }

      // Run TypeScript check using configured command
      try {
        const tsErrors = runTypeScriptCheck(filePath, config, cwd, exec, log);
        errors.push(...tsErrors);
      } catch (error) {
        const err = error as { code?: string };
        if (err.code === 'ETIMEDOUT') {
          return {
            decision: 'block',
            reason: '⏱️ Validation timeout - TypeScript check took too long',
          };
        }
        // Re-throw other unexpected errors
        if (err.code !== 'ENOENT') {
          throw error;
        }
      }

      // Run Biome check using configured command
      try {
        const biomeErrors = runBiomeCheck(filePath, config, cwd, exec, log);
        errors.push(...biomeErrors);
      } catch (error) {
        const err = error as { code?: string };
        if (err.code === 'ETIMEDOUT') {
          return {
            decision: 'block',
            reason: '⏱️ Validation timeout - Biome check took too long',
          };
        }
        // Re-throw other unexpected errors
        if (err.code !== 'ENOENT') {
          throw error;
        }
      }

      if (errors.length > 0) {
        results.push({ fileName, errors });
      }
    }

    // Format and return results
    if (results.length > 0) {
      const message = formatValidationResults(results);

      log.info('Validation issues found', {
        file_count: tsFiles.length,
        error_count: results.reduce((sum, r) => sum + r.errors.length, 0),
      });

      return {
        decision: 'block',
        reason: `⚠️ TypeScript/Biome validation failed:\n\n${message}`,
      };
    }

    log.debug('No validation issues found');
    return { continue: true };
  } catch (error) {
    log.exception('Fatal error in edit_validation hook', error as Error);
    // Don't block on error
    return { continue: true };
  }
}
