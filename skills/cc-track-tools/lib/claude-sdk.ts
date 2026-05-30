/**
 * Claude Code SDK wrapper for cc-track
 * Provides a clean interface for interacting with Claude using the TypeScript SDK
 * Uses Pro subscription authentication (no API key required)
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { Query, SDKAssistantMessage, SDKResultMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import { createLogger } from './logger';

export interface ClaudeResponse {
  text: string;
  success: boolean;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
  };
}

/**
 * Helper function to convert a string prompt into an AsyncIterable<SDKUserMessage>
 * Required when using canUseTool callback with the Claude Code SDK
 *
 * Note: session_id is set to 'temp-session' as these are single-use query sessions,
 * not persistent conversations. parent_tool_use_id is null as these are initial messages.
 */
export async function* createMessageStream(text: string): AsyncIterable<SDKUserMessage> {
  yield {
    type: 'user',
    session_id: 'temp-session',
    parent_tool_use_id: null,
    message: {
      role: 'user',
      content: [{ type: 'text', text }],
    },
  } as SDKUserMessage;
}

// Find the Claude Code executable cross-platform
export function findClaudeCodeExecutable(): string | undefined {
  // Prefer system-installed claude (often a compiled binary and faster)
  try {
    // Use 'command -v' which is POSIX standard, or 'where' on Windows
    const isWindows = process.platform === 'win32';
    const findCommand = isWindows ? 'where claude' : 'command -v claude';
    const claudePath = execSync(findCommand, { encoding: 'utf8' }).trim();

    if (claudePath) {
      // On Windows, 'where' might return multiple lines
      const paths = claudePath
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean);

      // On Unix, try to resolve symlinks for the first path
      if (!isWindows) {
        const firstPath = paths[0];
        try {
          const realPath = execSync(`readlink -f "${firstPath}"`, { encoding: 'utf8' }).trim();
          return realPath || firstPath;
        } catch {
          return firstPath;
        }
      }

      // On Windows, try each path until we find one that works
      // Skip fnm multishell paths - they exist on disk but are stale shims that fail to spawn
      // when the terminal session that created them is no longer active
      for (const path of paths) {
        // Skip fnm multishell paths - they're session-specific shims that become stale
        if (path.includes('fnm_multishells')) {
          continue;
        }
        if (existsSync(path)) {
          return path;
        }
      }
      // All non-fnm paths failed - fall through to other methods
    }
  } catch {
    // Command failed, claude is not in PATH
  }

  // Fallback to local project install
  try {
    const localCli = `${process.cwd()}/node_modules/@anthropic-ai/claude-agent-sdk/cli.js`;
    if (existsSync(localCli)) return localCli;
  } catch {}

  // If none found, return undefined and let SDK auto-detect
  return undefined;
}

async function prompt(
  text: string,
  model: 'haiku' | 'sonnet' | 'opus' = 'haiku',
  options?: {
    maxTurns?: number;
    allowedTools?: string[];
    disallowedTools?: string[];
    timeoutMs?: number;
    cwd?: string;
  },
): Promise<ClaudeResponse> {
  const logger = createLogger('claude-sdk');
  try {
    // Use generic model names - the API will use the latest versions
    const modelMap = {
      haiku: 'haiku',
      sonnet: 'sonnet',
      opus: 'opus',
    } as const;

    // Find Claude Code executable
    const pathToClaudeCodeExecutable = findClaudeCodeExecutable();

    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    logger.debug('ClaudeSDK.prompt start', {
      model: modelMap[model],
      timeout_ms: options?.timeoutMs,
      pathToClaudeCodeExecutable,
    });
    // Note: we rely on stream.return() and a bounded timeout; avoid AbortController to keep types simple
    const stream = query({
      prompt: text,
      options: {
        model: modelMap[model],
        maxTurns: options?.maxTurns ?? 1,
        allowedTools: options?.allowedTools,
        disallowedTools: options?.disallowedTools ?? ['*'],
        pathToClaudeCodeExecutable,
        systemPrompt: { type: 'preset', preset: 'claude_code' },
        // Use provided cwd or default to temp directory to avoid triggering project hooks
        cwd: options?.cwd || tmpdir(),
        stderr: (data: string) => {
          try {
            const s = typeof data === 'string' ? data : String(data);
            logger.debug('Claude Code stderr', { data: s.substring(0, 500) });
          } catch {
            // ignore
          }
        },
      },
    });

    let responseText = '';
    let success = false;
    let usage: ClaudeResponse['usage'];
    let error: string | undefined;
    let timedOut = false;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    if (options?.timeoutMs && options.timeoutMs > 0) {
      timeout = setTimeout(() => {
        timedOut = true;
        try {
          // Politely signal completion to underlying process
          // Type assertion is safe here as Query extends AsyncGenerator<SDKMessage, void>
          void (stream as Query).return(undefined);
        } catch {
          // ignore
        }
        // We already requested stream termination; child will exit shortly.
      }, options.timeoutMs);
    }

    try {
      for await (const message of stream) {
        if (message.type === 'assistant') {
          const assistantMsg = message as SDKAssistantMessage;
          const content = assistantMsg.message.content[0];
          if (content && 'text' in content) {
            responseText = content.text;
          }
        }

        if (message.type === 'result') {
          const resultMsg = message as SDKResultMessage;
          if (resultMsg.subtype === 'success') {
            success = true;
            usage = {
              inputTokens: resultMsg.usage.input_tokens || 0,
              outputTokens: resultMsg.usage.output_tokens || 0,
              costUSD: resultMsg.total_cost_usd,
            };
          } else if (resultMsg.subtype === 'error_max_turns' && responseText) {
            success = true;
            usage = {
              inputTokens: resultMsg.usage.input_tokens || 0,
              outputTokens: resultMsg.usage.output_tokens || 0,
              costUSD: resultMsg.total_cost_usd,
            };
          } else {
            error = `Claude returned error: ${resultMsg.subtype}`;
          }
        }
      }
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    if (!success && timedOut) {
      logger.error('ClaudeSDK.prompt timeout', { timeout_ms: options?.timeoutMs });
      return {
        text: responseText.trim(),
        success: false,
        error: `timeout after ${options?.timeoutMs}ms`,
        usage,
      };
    }

    logger.debug('ClaudeSDK.prompt done', { success, usage });
    return { text: responseText.trim(), success, error, usage };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const logger = createLogger('claude-sdk');
    logger.error('ClaudeSDK.prompt error', { error: msg });
    return {
      text: '',
      success: false,
      error: msg,
    };
  }
}

async function generateCommitMessage(changes: string): Promise<string> {
  const p = `Generate a conventional commit message for these changes:
${changes}

Requirements:
- Use conventional commit format (feat:, fix:, docs:, chore:, etc.)
- Be concise but descriptive
- Focus on the "what" and "why", not the "how"
- Respond with JUST the commit message, no explanation`;

  const response = await prompt(p, 'haiku', { timeoutMs: 10000 });
  if (!response.success) throw new Error(`Failed to generate commit message: ${response.error}`);
  return response.text;
}

async function generateBranchName(taskTitle: string, taskId: string): Promise<string> {
  const p = `Generate a git branch name for this task:
Title: ${taskTitle}
Task ID: ${taskId}

Requirements:
- Use format: type/description-taskid (e.g., feature/add-auth-001)
- Keep it short (max 50 chars total)
- Use lowercase and hyphens only
- Types: feature, bug, chore, docs
- Respond with JUST the branch name`;

  const response = await prompt(p, 'haiku', { timeoutMs: 10000 });
  if (!response.success) throw new Error(`Failed to generate branch name: ${response.error}`);
  return response.text;
}

export const ClaudeSDK = {
  prompt,
  generateCommitMessage,
  generateBranchName,
};
