#!/usr/bin/env bun
/**
 * Stop Hook - Evaluates if Claude should continue in autoflow mode
 *
 * Uses battle-tested evaluation prompt from double-shot-latte project
 * with 3 continuations per 5-minute window throttling.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../skills/cc-track-tools/lib/logger';

export interface HookInput {
  cwd?: string;
  transcript_path?: string;
  session_id?: string;
  [key: string]: unknown;
}

export interface AutoflowState {
  active: boolean;
  sessionId: string;
  activatedAt: string;
  continueCount: number;
  windowStart?: string;
}

export interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: Array<{ type: string; text?: string }>;
  [key: string]: unknown;
}

export interface StopHookResult {
  action: 'allow' | 'block' | 'throttle';
  message?: string;
  updatedState?: AutoflowState;
}

export interface StopHookDeps {
  readState: () => AutoflowState | null;
  writeState: (state: AutoflowState) => void;
  readTranscript: (path: string) => TranscriptMessage[];
  evaluate: (messages: string) => Promise<{ shouldContinue: boolean; reason: string }>;
  now: () => number;
}

// Throttling constants (from double-shot-latte's tested values)
export const MAX_CONTINUES_PER_WINDOW = 3;
export const WINDOW_DURATION_MS = 5 * 60 * 1000; // 5 minutes

function getStateFile(cwd: string): string {
  return join(cwd, '.cc-track', '.autoflow-state.json');
}

export function getLastMessages(transcript: TranscriptMessage[], count = 10): string {
  const recent = transcript.slice(-count);
  return recent
    .map((msg) => {
      // Claude Code transcript has content wrapped in a 'message' field
      // Format: { type: 'user', message: { role: 'user', content: [...] }, ... }
      // Or simple format: { role: 'user', content: [...] }
      const messageData = (msg as { message?: { role?: string; content?: unknown[] } }).message;
      const content = messageData?.content || msg.content;
      const role = messageData?.role || msg.role;

      // Filter out entries without a valid role (tool results, system messages, etc.)
      if (!role || (role !== 'user' && role !== 'assistant')) {
        return null;
      }

      // Skip messages without array content
      if (!content || !Array.isArray(content)) {
        return null;
      }

      // Extract text content
      const textItem = content.find(
        (c): c is { type: string; text: string } =>
          typeof c === 'object' && c !== null && 'type' in c && (c as { type?: string }).type === 'text',
      );
      const text = textItem?.text || '';

      // Skip messages with no text (tool use only)
      if (!text) {
        return null;
      }

      return `${role}: ${text.slice(0, 1000)}`;
    })
    .filter((msg): msg is string => msg !== null)
    .join('\n\n');
}

/**
 * Battle-tested evaluation prompt from double-shot-latte project.
 * Key insight: absolute rules trump context-based rationalization.
 */
export function buildEvaluationPrompt(recentContext: string): string {
  return `Analyze this conversation and determine: Does the assistant have more autonomous work to do RIGHT NOW?

Conversation:
${recentContext}

CONTINUE (should_continue: true) ONLY IF the assistant explicitly states what it will do next:
- Phrases indicating intent to continue (e.g., 'Next I need to...', 'Now I'll...', 'Moving on to...')
- Incomplete todo list with remaining items marked pending
- Stated follow-up tasks not yet performed

STOP (should_continue: false) in ALL other cases:

1. TASK COMPLETION - The assistant indicates work is finished:
   - Completion statements (done, complete, finished, ready, all set)
   - Summary of accomplished work with no stated next steps
   - Confirming something is working/verified/installed

2. QUESTIONS - The assistant needs user input:
   - Asking for approval, decisions, clarification, or confirmation
   - Offering optional actions (e.g., 'Want me to...?', 'Should I also...?')
   - Note: Mid-task continuation questions (e.g., 'Should I continue?' when work is ongoing) = CONTINUE

3. BLOCKERS - The assistant cannot proceed:
   - Unresolved errors or missing information
   - Uncertainty about requirements

KEY: If the assistant is WAITING for the user (whether after completing work OR asking a question), that means STOP. Waiting ≠ more autonomous work to do.

Default to STOP when uncertain.

Respond with JSON: {"should_continue": boolean, "reasoning": "brief explanation"}`;
}

async function defaultEvaluate(lastMessages: string): Promise<{ shouldContinue: boolean; reason: string }> {
  try {
    // Dynamically import Claude SDK (named export)
    const { ClaudeSDK } = await import('../skills/cc-track-tools/lib/claude-sdk');

    const prompt = buildEvaluationPrompt(lastMessages);

    const response = await ClaudeSDK.prompt(prompt, 'haiku', {
      maxTurns: 1,
      timeoutMs: 15000, // 15 second timeout
      disallowedTools: ['*'], // No tools needed for this evaluation
    });

    if (!response.success || !response.text) {
      return { shouldContinue: false, reason: 'Failed to evaluate - allowing stop (safe default)' };
    }

    // Try to parse JSON response
    try {
      const result = JSON.parse(response.text);
      return {
        shouldContinue: result.should_continue === true,
        reason: result.reasoning || response.text,
      };
    } catch {
      // Fallback: look for boolean indicators in text
      const text = response.text.toLowerCase();
      if (text.includes('"should_continue": true') || text.includes('should_continue: true')) {
        return { shouldContinue: true, reason: response.text };
      }
      return { shouldContinue: false, reason: response.text };
    }
  } catch (error) {
    // If evaluation fails, allow stop (safe default from double-shot-latte)
    return { shouldContinue: false, reason: `Evaluation error: ${error}` };
  }
}

function createDefaultDeps(cwd: string): StopHookDeps {
  const stateFile = getStateFile(cwd);
  return {
    readState: () => {
      if (!existsSync(stateFile)) return null;
      try {
        return JSON.parse(readFileSync(stateFile, 'utf-8'));
      } catch {
        return null;
      }
    },
    writeState: (state: AutoflowState) => {
      writeFileSync(stateFile, JSON.stringify(state, null, 2));
    },
    readTranscript: (path: string) => {
      try {
        const lines = readFileSync(path, 'utf-8').trim().split('\n').filter(Boolean);
        return lines.map((line) => JSON.parse(line));
      } catch {
        return [];
      }
    },
    evaluate: defaultEvaluate,
    now: () => Date.now(),
  };
}

export async function stopHook(input: HookInput, deps?: StopHookDeps): Promise<StopHookResult> {
  const cwd = input.cwd || process.cwd();
  const { readState, writeState, readTranscript, evaluate, now } = deps || createDefaultDeps(cwd);

  const state = readState();

  // If autoflow not active, allow normal stop
  if (!state || !state.active) {
    return { action: 'allow' };
  }

  // Autoflow is active - check throttling (3 per 5-minute window)
  const currentTime = now();
  const windowStart = state.windowStart ? new Date(state.windowStart).getTime() : currentTime;
  const windowElapsed = currentTime - windowStart;

  let continueCount = state.continueCount || 0;

  // Reset window if expired
  if (windowElapsed >= WINDOW_DURATION_MS) {
    continueCount = 0;
  }

  // Check if we've exceeded the limit
  if (continueCount >= MAX_CONTINUES_PER_WINDOW) {
    // Deactivate autoflow due to throttle limit
    const updatedState = { ...state, active: false };
    writeState(updatedState);

    return {
      action: 'throttle',
      message: `⚠️  Autoflow throttle limit reached\n\nClaude has continued ${MAX_CONTINUES_PER_WINDOW} times in the last 5 minutes.\nThis suggests it may be stuck in a loop.\n\nAutoflow mode has been deactivated. Please review the situation.`,
      updatedState,
    };
  }

  // Read transcript and evaluate
  if (!input.transcript_path) {
    // No transcript available - allow stop
    return { action: 'allow' };
  }

  const transcript = readTranscript(input.transcript_path);

  // Use Claude SDK to evaluate
  const log = createLogger('autoflow-stop');

  // Debug: log the structure of transcript messages
  if (transcript.length > 0) {
    const sampleMsg = transcript[transcript.length - 1];
    log.debug('Transcript sample', {
      messageKeys: Object.keys(sampleMsg),
      hasContent: 'content' in sampleMsg,
      contentType: typeof sampleMsg.content,
      isArray: Array.isArray(sampleMsg.content),
      role: sampleMsg.role,
      // If content exists and is array, show first item structure
      firstContentItem: Array.isArray(sampleMsg.content) ? sampleMsg.content[0] : sampleMsg.content,
      // Also log raw JSON of first 500 chars to see actual structure
      rawSample: JSON.stringify(sampleMsg).slice(0, 500),
    });
  }

  const lastMessages = getLastMessages(transcript, 10);
  log.info('Evaluating stop with Claude SDK', { messageCount: lastMessages.split('\n\n').length });
  log.debug('Last messages for evaluation', { lastMessages: lastMessages.slice(0, 1000) });

  let evaluation: { shouldContinue: boolean; reason: string };
  try {
    evaluation = await evaluate(lastMessages);
    log.info('Evaluation result', {
      shouldContinue: evaluation.shouldContinue,
      reason: evaluation.reason,
      action: evaluation.shouldContinue ? 'BLOCK (continue working)' : 'ALLOW (stop)',
    });
  } catch (error) {
    log.error('Evaluation failed', { error: String(error) });
    // Safe default: allow stop on error
    evaluation = { shouldContinue: false, reason: `Evaluation error: ${error}` };
  }

  if (evaluation.shouldContinue) {
    // Update throttle tracking
    const updatedState = {
      ...state,
      continueCount: continueCount + 1,
      windowStart: continueCount === 0 ? new Date(currentTime).toISOString() : state.windowStart,
    };
    writeState(updatedState);

    return {
      action: 'block',
      message: `🤖 Autoflow Mode: Continue working\n\nReasoning: ${evaluation.reason}\n\nPlease continue working according to the plan. Check your todo list or tasks.md for remaining work.`,
      updatedState,
    };
  }

  // Allow stop - work appears complete
  return { action: 'allow' };
}

async function main() {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const input: HookInput = JSON.parse(Buffer.concat(chunks).toString());
  const result = await stopHook(input);

  if (result.action === 'allow') {
    // Allow stop - no decision field needed
    console.log(JSON.stringify({ continue: true }));
  } else {
    // Block stop - use decision: "block" with reason
    console.log(
      JSON.stringify({
        decision: 'block',
        reason: result.message,
      }),
    );
  }
  process.exit(0);
}

if (import.meta.main) {
  main();
}
