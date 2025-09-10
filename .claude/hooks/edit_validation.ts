#!/usr/bin/env bun
// PostToolUse hook for validating TypeScript and running linters

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { isHookEnabled } from '../lib/config';
import { createLogger } from '../lib/logger';

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    file_path?: string;
    edits?: Array<{ file_path?: string }>;
    [key: string]: unknown;
  };
  tool_response?: {
    success?: boolean;
    [key: string]: unknown;
  };
}

interface HookOutput {
  continue: boolean;
  hookSpecificOutput?: {
    hookEventName: string;
    additionalContext?: string;
  };
}

interface EditValidationConfig {
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

async function main() {
  const logger = createLogger('edit_validation');

  try {
    // Check if hook is enabled
    if (!isHookEnabled('edit_validation')) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // Read input from stdin
    const input = await Bun.stdin.text();
    const data: HookInput = JSON.parse(input);

    logger.debug('Hook triggered', {
      tool_name: data.tool_name,
      has_tool_response: !!data.tool_response,
    });

    // Only run on successful tool executions
    if (!data.tool_response?.success) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // Extract file paths based on tool type
    const filePaths: string[] = [];
    
    if (data.tool_name === 'MultiEdit' && data.tool_input.file_path) {
      filePaths.push(data.tool_input.file_path as string);
    } else if ((data.tool_name === 'Edit' || data.tool_name === 'Write') && data.tool_input.file_path) {
      filePaths.push(data.tool_input.file_path as string);
    }

    // Filter to only TypeScript files
    const tsFiles = filePaths.filter(path => 
      path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.mts') || path.endsWith('.cts')
    );

    if (tsFiles.length === 0) {
      logger.debug('No TypeScript files to validate');
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // Get configuration
    const fs = require('node:fs');
    const path = require('node:path');
    const configPath = path.join(data.cwd, '.claude', 'track.config.json');
    
    let config: EditValidationConfig = {
      enabled: false,
      description: 'Runs TypeScript and Biome checks on edited files',
      typecheck: {
        enabled: true,
        command: 'bunx tsc --noEmit'
      },
      lint: {
        enabled: true,
        command: 'bunx biome check'
      }
    };

    if (existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const fullConfig = JSON.parse(configContent);
        if (fullConfig.hooks?.edit_validation) {
          config = { ...config, ...fullConfig.hooks.edit_validation };
        }
      } catch (error) {
        logger.error('Failed to read config', { error });
      }
    }

    const errors: string[] = [];

    // Process each file
    for (const filePath of tsFiles) {
      const fileName = path.basename(filePath);
      const fileErrors: string[] = [];

      // Run TypeScript check if enabled
      if (config.typecheck?.enabled) {
        try {
          const command = `${config.typecheck.command} "${filePath}"`;
          logger.debug('Running TypeScript check', { command });
          
          execSync(command, {
            encoding: 'utf-8',
            cwd: data.cwd,
            stdio: ['ignore', 'pipe', 'pipe'],
          });
        } catch (error: any) {
          if (error.stderr || error.stdout) {
            const output = error.stderr || error.stdout;
            // Parse TypeScript errors (format: file(line,col): error TSxxxx: message)
            const lines = output.split('\n').filter((line: string) => line.includes('error TS'));
            for (const line of lines) {
              const match = line.match(/\((\d+),\d+\): error TS\d+: (.+)/);
              if (match) {
                fileErrors.push(`Line ${match[1]}: ${match[2]}`);
              }
            }
          }
        }
      }

      // Run Biome check if enabled  
      if (config.lint?.enabled) {
        try {
          const command = `${config.lint.command} "${filePath}" --reporter=compact`;
          logger.debug('Running Biome check', { command });
          
          execSync(command, {
            encoding: 'utf-8',
            cwd: data.cwd,
            stdio: ['ignore', 'pipe', 'pipe'],
          });
        } catch (error: any) {
          if (error.stdout) {
            // Parse Biome compact output (format: file:line:col lint/rule message)
            const lines = error.stdout.split('\n').filter((line: string) => line.includes(filePath));
            for (const line of lines) {
              const match = line.match(/:(\d+):\d+ \S+ (.+)/);
              if (match) {
                fileErrors.push(`Line ${match[1]}: ${match[2]}`);
              }
            }
          }
        }
      }

      // Add file errors to main errors array
      if (fileErrors.length > 0) {
        errors.push(`Issues in ${fileName}:`);
        errors.push(...fileErrors.map(e => `  - ${e}`));
        errors.push(''); // Add blank line between files
      }
    }

    // Return results
    if (errors.length > 0) {
      const output: HookOutput = {
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `\n⚠️ Validation issues found:\n\n${errors.join('\n')}`
        }
      };
      
      logger.info('Validation issues found', { 
        file_count: tsFiles.length,
        error_count: errors.length 
      });
      
      console.log(JSON.stringify(output));
    } else {
      logger.debug('No validation issues found');
      console.log(JSON.stringify({ continue: true }));
    }

    process.exit(0);
  } catch (error) {
    logger.exception('Fatal error in edit_validation hook', error as Error);
    // Don't block on error
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }
}

main();