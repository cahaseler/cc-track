/**
 * Claude Code SDK wrapper for cc-track
 * Provides a clean interface for interacting with Claude using the TypeScript SDK
 * Uses Pro subscription authentication (no API key required)
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createLogger } from './logger';
// Defer importing '@anthropic-ai/claude-code' until needed to avoid any
// bundling-time side effects in compiled binaries.
type SDKMessage = any;

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

// Find the Claude Code executable using 'which' command
function findClaudeCodeExecutable(): string | undefined {
  // Prefer system-installed claude (often a compiled binary and faster)
  try {
    // First try to find the 'claude' command in PATH
    const claudePath = execSync('which claude', { encoding: 'utf8' }).trim();
    if (claudePath) {
      // The claude command itself is typically a symlink or wrapper
      // The SDK might need the actual cli.js file, so let's resolve it
      try {
        const realPath = execSync(`readlink -f "${claudePath}"`, { encoding: 'utf8' }).trim();
        return realPath || claudePath;
      } catch {
        return claudePath;
      }
    }
  } catch {
    // which command failed, claude is not in PATH
  }

  // Fallback to local project install
  try {
    const localCli = `${process.cwd()}/node_modules/@anthropic-ai/claude-code/cli.js`;
    if (existsSync(localCli)) return localCli;
  } catch {}

  // If none found, return undefined and let SDK auto-detect
  return undefined;
}

async function prompt(
  text: string,
  model: 'haiku' | 'sonnet' | 'opus' = 'haiku',
  options?: { maxTurns?: number; allowedTools?: string[]; disallowedTools?: string[]; timeoutMs?: number },
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

    const { query } = await import('@anthropic-ai/claude-code');
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
        // Critical: run in a temp directory to avoid triggering project hooks
        cwd: tmpdir(),
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
          void (stream as AsyncGenerator<SDKMessage, void>).return(undefined as any);
        } catch {
          // ignore
        }
        // We already requested stream termination; child will exit shortly.
      }, options.timeoutMs);
    }

    try {
      for await (const message of stream) {
        if (message.type === 'assistant') {
          const content = message.message.content[0];
          if (content && 'text' in content) {
            responseText = content.text;
          }
        }

        if (message.type === 'result') {
          if (message.subtype === 'success') {
            success = true;
            usage = {
              inputTokens: message.usage.input_tokens || 0,
              outputTokens: message.usage.output_tokens || 0,
              costUSD: message.total_cost_usd,
            };
          } else if (message.subtype === 'error_max_turns' && responseText) {
            success = true;
            usage = {
              inputTokens: message.usage.input_tokens || 0,
              outputTokens: message.usage.output_tokens || 0,
              costUSD: message.total_cost_usd,
            };
          } else {
            error = `Claude returned error: ${message.subtype}`;
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

  const timeoutMs = Number(process.env.CC_TRACK_SDK_TIMEOUT_MS || '5000');
  const response = await prompt(p, 'haiku', { timeoutMs });
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

  const timeoutMs = Number(process.env.CC_TRACK_SDK_TIMEOUT_MS || '5000');
  const response = await prompt(p, 'haiku', { timeoutMs });
  if (!response.success) throw new Error(`Failed to generate branch name: ${response.error}`);
  return response.text;
}

async function reviewCode(diff: string, requirements: string): Promise<{ hasIssues: boolean; review: string }> {
  const p = `Review these code changes against the requirements:

REQUIREMENTS:
${requirements}

CHANGES:
${diff}

Analyze if the changes properly fulfill the requirements. 
Respond in JSON format:
{
  "hasIssues": boolean,
  "review": "Brief explanation of any issues or confirmation that requirements are met"
}`;

  const response = await prompt(p, 'sonnet', { timeoutMs: 60000 });
  if (!response.success) throw new Error(`Failed to review code: ${response.error}`);

  try {
    const result = JSON.parse(response.text);
    return { hasIssues: result.hasIssues || false, review: result.review || '' };
  } catch {
    return { hasIssues: false, review: response.text };
  }
}

async function extractErrorPatterns(transcript: string): Promise<string> {
  const p = `Extract error patterns and their solutions from this transcript:
${transcript}

Focus on:
- Actual errors encountered and how they were fixed
- Patterns to avoid in the future
- Successful recovery strategies

Format as markdown with clear headers. Be concise.`;

  const response = await prompt(p, 'haiku', { timeoutMs: 20000 });
  if (!response.success) return '<!-- Error pattern extraction failed -->';
  return response.text;
}

async function createValidationAgent(
  codebasePath: string,
  validationRules: string,
): Promise<AsyncGenerator<SDKMessage, void>> {
  const p = `You are a code validation agent. Your task is to review the codebase and identify issues.

Codebase path: ${codebasePath}
Validation rules:
${validationRules}

You can read files but cannot modify them. Provide a detailed analysis.`;

  // Find Claude Code executable
  const pathToClaudeCodeExecutable = findClaudeCodeExecutable();
  const { query } = await import('@anthropic-ai/claude-code');
  const logger = createLogger('claude-sdk');
  logger.debug('ClaudeSDK.createValidationAgent start', { pathToClaudeCodeExecutable });
  return query({
    prompt: p,
    options: {
      model: 'sonnet', // Use generic model name for latest version
      maxTurns: 10,
      allowedTools: ['Read', 'Grep', 'Glob', 'TodoWrite'],
      pathToClaudeCodeExecutable,
      // Allow the agent to read the repository while preventing hook recursion
      cwd: tmpdir(),
      additionalDirectories: [codebasePath],
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
}

export const ClaudeSDK = {
  prompt,
  generateCommitMessage,
  generateBranchName,
  reviewCode,
  extractErrorPatterns,
  createValidationAgent,
};
