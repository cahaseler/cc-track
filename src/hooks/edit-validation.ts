import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { HookInput, HookOutput } from '../types';
import { isHookEnabled } from '../lib/config';
import { createLogger } from '../lib/logger';

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
export function extractFilePaths(toolName: string, toolInput: any): string[] {
  const filePaths: string[] = [];

  if (toolName === 'MultiEdit' && toolInput.file_path) {
    filePaths.push(toolInput.file_path as string);
  } else if ((toolName === 'Edit' || toolName === 'Write') && toolInput.file_path) {
    filePaths.push(toolInput.file_path as string);
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
export function runTypeScriptCheck(filePath: string, config: EditValidationConfig, cwd: string): string[] {
  const errors: string[] = [];
  
  if (!config.typecheck?.enabled) {
    return errors;
  }

  try {
    const command = `${config.typecheck.command} "${filePath}"`;
    logger.debug('Running TypeScript check', { command });

    execSync(command, {
      encoding: 'utf-8',
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const execError = error as { stderr?: string; stdout?: string };
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
export function runBiomeCheck(filePath: string, config: EditValidationConfig, cwd: string): string[] {
  const errors: string[] = [];
  
  if (!config.lint?.enabled) {
    return errors;
  }

  try {
    const command = `${config.lint.command} "${filePath}" --reporter=compact`;
    logger.debug('Running Biome check', { command });

    execSync(command, {
      encoding: 'utf-8',
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const execError = error as { stdout?: string };
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
}

/**
 * Main edit validation hook function
 */
export async function editValidationHook(
  input: HookInput, 
  deps: EditValidationDependencies = {}
): Promise<HookOutput> {
  const exec = deps.execSync || execSync;
  const log = deps.logger || logger;
  
  try {
    // Check if hook is enabled
    if (!isHookEnabled('edit_validation')) {
      return { continue: true };
    }

    log.debug('Hook triggered', {
      tool_name: input.tool_name,
      has_tool_response: !!input.tool_response,
    });

    // Only run on successful tool executions
    if (!input.tool_response?.success) {
      return { continue: true };
    }

    // Extract file paths
    const filePaths = extractFilePaths(input.tool_name || '', input.tool_input || {});
    
    // Filter to TypeScript files
    const tsFiles = filterTypeScriptFiles(filePaths);

    if (tsFiles.length === 0) {
      log.debug('No TypeScript files to validate');
      return { continue: true };
    }

    // Load configuration
    const config = loadEditValidationConfig(input.cwd || process.cwd());

    // Validate files - need to update this to use injected exec
    const results: ValidationResult[] = [];
    
    for (const filePath of tsFiles) {
      const fileName = basename(filePath);
      const errors: string[] = [];
      const cwd = input.cwd || process.cwd();

      // Run TypeScript check
      if (config.typecheck?.enabled) {
        try {
          exec(`npx tsc --noEmit ${filePath}`, {
            encoding: 'utf-8',
            cwd,
            stdio: ['ignore', 'pipe', 'pipe'],
          });
        } catch (error: any) {
          if (error.code === 'ETIMEDOUT') {
            return {
              decision: 'block',
              systemMessage: '⏱️ Validation timeout - TypeScript check took too long',
            };
          }
          if (error.code === 'ENOENT') {
            // File doesn't exist yet (new file), skip validation
            continue;
          }
          if (error.message) {
            errors.push(...error.message.split('\n').filter((line: string) => line.includes('error TS')));
          }
        }
      }

      // Run Biome check
      if (config.lint?.enabled) {
        try {
          exec(`npx biome check --reporter=compact ${filePath}`, {
            encoding: 'utf-8',
            cwd,
            stdio: ['ignore', 'pipe', 'pipe'],
          });
        } catch (error: any) {
          if (error.message) {
            errors.push(...error.message.split('\n').filter((line: string) => line.includes('lint/')));
          }
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
        systemMessage: `⚠️ TypeScript/Biome validation failed:\n\n${message}`,
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