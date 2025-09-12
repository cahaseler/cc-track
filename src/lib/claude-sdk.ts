/**
 * Claude Code SDK wrapper for cc-track
 * Provides a clean interface for interacting with Claude using the TypeScript SDK
 * Uses Pro subscription authentication (no API key required)
 */

import { query, type SDKMessage } from '@anthropic-ai/claude-code';

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

async function prompt(
  text: string,
  model: 'haiku' | 'sonnet' | 'opus' = 'haiku',
  options?: { maxTurns?: number; allowedTools?: string[]; disallowedTools?: string[] },
): Promise<ClaudeResponse> {
  try {
    const modelMap = {
      haiku: 'claude-3-5-haiku-20241022',
      sonnet: 'claude-3-5-sonnet-20241022',
      opus: 'claude-3-opus-20240229',
    } as const;

    const response = query({
      prompt: text,
      options: {
        model: modelMap[model],
        maxTurns: options?.maxTurns ?? 1,
        allowedTools: options?.allowedTools,
        disallowedTools: options?.disallowedTools ?? ['*'],
      },
    });

    let responseText = '';
    let success = false;
    let usage: ClaudeResponse['usage'];
    let error: string | undefined;

    for await (const message of response) {
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

    return { text: responseText.trim(), success, error, usage };
  } catch (err) {
    return {
      text: '',
      success: false,
      error: err instanceof Error ? err.message : String(err),
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

  const response = await prompt(p, 'haiku');
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

  const response = await prompt(p, 'haiku');
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

  const response = await prompt(p, 'sonnet');
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

  const response = await prompt(p, 'haiku');
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

  return query({
    prompt: p,
    options: {
      model: 'claude-3-5-sonnet-20241022',
      maxTurns: 10,
      allowedTools: ['Read', 'Grep', 'Glob', 'TodoWrite'],
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
