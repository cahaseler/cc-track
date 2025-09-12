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

export class ClaudeSDK {
  /**
   * Execute a simple text prompt and return the response
   * This is the primary method for replacing CLI calls
   */
  static async prompt(
    text: string,
    model: 'haiku' | 'sonnet' | 'opus' = 'haiku',
    options?: {
      maxTurns?: number;
      allowedTools?: string[];
      disallowedTools?: string[];
    },
  ): Promise<ClaudeResponse> {
    try {
      const modelMap = {
        haiku: 'claude-3-5-haiku-20241022',
        sonnet: 'claude-3-5-sonnet-20241022',
        opus: 'claude-3-opus-20240229',
      };

      const response = query({
        prompt: text,
        options: {
          model: modelMap[model],
          maxTurns: options?.maxTurns ?? 1,
          allowedTools: options?.allowedTools,
          disallowedTools: options?.disallowedTools ?? ['*'], // Default to no tools for simple prompts
        },
      });

      let responseText = '';
      let success = false;
      let usage: ClaudeResponse['usage'];
      let error: string | undefined;

      for await (const message of response) {
        if (message.type === 'assistant') {
          // Extract text from assistant message
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
            // If we hit max turns but got a response, that's still success for simple prompts
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

      return {
        text: responseText.trim(),
        success,
        error,
        usage,
      };
    } catch (err) {
      return {
        text: '',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Generate a conventional commit message
   * Replaces GitHelpers.generateCommitMessage()
   */
  static async generateCommitMessage(changes: string): Promise<string> {
    const prompt = `Generate a conventional commit message for these changes:
${changes}

Requirements:
- Use conventional commit format (feat:, fix:, docs:, chore:, etc.)
- Be concise but descriptive
- Focus on the "what" and "why", not the "how"
- Respond with JUST the commit message, no explanation`;

    const response = await this.prompt(prompt, 'haiku');

    if (!response.success) {
      throw new Error(`Failed to generate commit message: ${response.error}`);
    }

    return response.text;
  }

  /**
   * Generate a branch name from task description
   * Replaces GitHelpers.generateBranchName()
   */
  static async generateBranchName(taskTitle: string, taskId: string): Promise<string> {
    const prompt = `Generate a git branch name for this task:
Title: ${taskTitle}
Task ID: ${taskId}

Requirements:
- Use format: type/description-taskid (e.g., feature/add-auth-001)
- Keep it short (max 50 chars total)
- Use lowercase and hyphens only
- Types: feature, bug, chore, docs
- Respond with JUST the branch name`;

    const response = await this.prompt(prompt, 'haiku');

    if (!response.success) {
      throw new Error(`Failed to generate branch name: ${response.error}`);
    }

    return response.text;
  }

  /**
   * Review code changes for issues
   * Replaces stop-review hook's Claude call
   */
  static async reviewCode(diff: string, requirements: string): Promise<{ hasIssues: boolean; review: string }> {
    const prompt = `Review these code changes against the requirements:

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

    const response = await this.prompt(prompt, 'sonnet');

    if (!response.success) {
      throw new Error(`Failed to review code: ${response.error}`);
    }

    try {
      const result = JSON.parse(response.text);
      return {
        hasIssues: result.hasIssues || false,
        review: result.review || '',
      };
    } catch {
      // Fallback if JSON parsing fails
      return {
        hasIssues: false,
        review: response.text,
      };
    }
  }

  /**
   * Extract error patterns from transcript
   * Replaces pre-compact hook's Claude call
   */
  static async extractErrorPatterns(transcript: string): Promise<string> {
    const prompt = `Extract error patterns and their solutions from this transcript:
${transcript}

Focus on:
- Actual errors encountered and how they were fixed
- Patterns to avoid in the future
- Successful recovery strategies

Format as markdown with clear headers. Be concise.`;

    const response = await this.prompt(prompt, 'haiku');

    if (!response.success) {
      // Don't fail the hook if extraction fails
      return '<!-- Error pattern extraction failed -->';
    }

    return response.text;
  }

  /**
   * Create a validation agent with restricted permissions
   * Example of advanced SDK usage for future features
   */
  static async createValidationAgent(
    codebasePath: string,
    validationRules: string,
  ): Promise<AsyncGenerator<SDKMessage, void>> {
    const prompt = `You are a code validation agent. Your task is to review the codebase and identify issues.

Codebase path: ${codebasePath}
Validation rules:
${validationRules}

You can read files but cannot modify them. Provide a detailed analysis.`;

    return query({
      prompt,
      options: {
        model: 'claude-3-5-sonnet-20241022',
        maxTurns: 10, // Allow multiple turns for thorough analysis
        // Restrict to read-only operations
        allowedTools: ['Read', 'Grep', 'Glob', 'TodoWrite'],
        // Could also use canUseTool for fine-grained control
      },
    });
  }
}
