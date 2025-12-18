// ABOUTME: PreToolUse hook for Windows that normalizes file paths to backslash format
// ABOUTME: Works around Claude Code bug #7918 where Edit fails with forward slashes
// ABOUTME: Only active when explicitly enabled in track.config.json

import { existsSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { join } from 'node:path/posix';
import { createLogger } from '../skills/cc-track-tools/lib/logger';

const logger = createLogger('windows-path-normalization');

interface HookInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
    [key: string]: unknown;
  };
}

interface HookResult {
  decision: 'block' | 'approve' | 'modify';
  reason?: string;
  modified_tool_input?: {
    file_path?: string;
    [key: string]: unknown;
  };
}

// File tools that use file_path parameter
const FILE_TOOLS = ['Edit', 'Write', 'Read', 'MultiEdit'];

// Load config to check if hook is enabled
function isHookEnabled(): boolean {
  try {
    // Look for track.config.json in current directory or parents
    let searchPath = process.cwd();

    while (true) {
      const configPath = join(searchPath, '.cc-track', 'track.config.json');
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        return config?.hooks?.windows_path_normalization?.enabled === true;
      }

      const parentPath = dirname(searchPath);
      if (parentPath === searchPath) break;
      searchPath = parentPath;
    }

    return false;
  } catch {
    return false;
  }
}

// Main hook function
export async function windowsPathNormalizationHook(
  input: HookInput,
  deps: {
    isEnabled?: () => boolean;
    platform?: string;
  } = {},
): Promise<HookResult> {
  const isEnabled = deps.isEnabled || isHookEnabled;
  const platform = deps.platform || process.platform;

  // Only run on Windows
  if (platform !== 'win32') {
    return { decision: 'approve' };
  }

  // Only run if explicitly enabled
  if (!isEnabled()) {
    return { decision: 'approve' };
  }

  // Handle file tools - normalize paths to backslashes on Windows
  // This works around Claude Code bug #7918 where Edit fails with forward slashes
  if (FILE_TOOLS.includes(input.tool_name)) {
    const filePath = input.tool_input.file_path;
    if (filePath && typeof filePath === 'string' && filePath.includes('/')) {
      const normalizedPath = filePath.replace(/\//g, '\\');
      logger.info('Normalizing file path to Windows format', {
        original: filePath,
        normalized: normalizedPath,
        tool: input.tool_name,
      });
      return {
        decision: 'modify',
        reason: `Normalized path separators to Windows format (workaround for Claude Code #7918)`,
        modified_tool_input: {
          ...input.tool_input,
          file_path: normalizedPath,
        },
      };
    }
  }

  // No changes needed
  return { decision: 'approve' };
}

// CLI entry point for Claude Code hook system
async function main() {
  try {
    const input = await new Promise<string>((resolve) => {
      let data = '';
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });
      process.stdin.on('end', () => {
        resolve(data);
      });
    });

    const hookInput: HookInput = JSON.parse(input);
    const result = await windowsPathNormalizationHook(hookInput);

    if (result.decision === 'block') {
      // Output in Claude Code's expected format for blocking
      console.log(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: result.reason,
          },
        }),
      );
      process.exit(2); // Exit code 2 = block
    } else if (result.decision === 'modify') {
      // Output in Claude Code's expected format for modifying tool input
      console.log(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
            updatedInput: result.modified_tool_input,
          },
        }),
      );
      process.exit(0);
    } else {
      // Approve - just exit cleanly
      process.exit(0);
    }
  } catch (error) {
    logger.error('Hook error', { error });
    // On error, don't block - let the command through
    process.exit(0);
  }
}

// CLI entrypoint - only run when executed directly, not when imported
if (import.meta.main) {
  main();
}
