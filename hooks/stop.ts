#!/usr/bin/env bun
/**
 * Stop Hook - Evaluates if Claude should continue in autoflow mode
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface HookInput {
  cwd?: string;
  transcript_path?: string;
  session_id?: string;
  [key: string]: unknown;
}

interface AutoflowState {
  active: boolean;
  sessionId: string;
  activatedAt: string;
  stopCount: number;
  lastStop?: string;
}

interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: Array<{ type: string; text?: string }>;
  [key: string]: unknown;
}

function getStateFile(cwd: string): string {
  return join(cwd, '.cc-track', '.autoflow-state.json');
}

function readState(cwd: string): AutoflowState | null {
  const file = getStateFile(cwd);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

function writeState(cwd: string, state: AutoflowState): void {
  const file = getStateFile(cwd);
  writeFileSync(file, JSON.stringify(state, null, 2));
}

function readTranscript(path: string): TranscriptMessage[] {
  try {
    const lines = readFileSync(path, 'utf-8').trim().split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function getLastMessages(transcript: TranscriptMessage[], count = 5): string {
  const recent = transcript.slice(-count);
  return recent
    .map((msg) => {
      const text = msg.content.find((c) => c.type === 'text')?.text || '';
      return `${msg.role}: ${text.slice(0, 500)}`;
    })
    .join('\n\n');
}

async function evaluateWithClaude(lastMessages: string): Promise<{ shouldContinue: boolean; reason: string }> {
  try {
    // Dynamically import Claude SDK
    const { default: ClaudeSDK } = await import('../skills/cc-track-tools/lib/claude-sdk.ts');

    const prompt = `You are evaluating whether an AI assistant is genuinely done with work or just asking if it should continue.

Here are the last few messages from the conversation:

${lastMessages}

Based on these messages, answer:
1. Is the assistant genuinely finished with all work? OR
2. Is the assistant asking for confirmation to continue (e.g., "should I continue?", "ready to proceed?", etc.)?

Respond with EXACTLY one of:
- DONE: [brief reason why work is complete]
- CONTINUE: [brief reason why assistant is asking to continue]

Your response:`;

    const response = await ClaudeSDK.prompt(prompt, 'haiku', {
      maxTurns: 1,
      timeoutMs: 10000, // 10 second timeout
      disallowedTools: ['*'], // No tools needed for this evaluation
    });

    if (!response.success || !response.text) {
      return { shouldContinue: false, reason: 'Failed to evaluate - allowing stop' };
    }

    const text = response.text.trim().toUpperCase();
    if (text.startsWith('CONTINUE')) {
      return { shouldContinue: true, reason: response.text };
    }

    return { shouldContinue: false, reason: response.text };
  } catch (error) {
    // If evaluation fails, allow stop to be safe
    return { shouldContinue: false, reason: `Evaluation error: ${error}` };
  }
}

async function main() {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const input: HookInput = JSON.parse(Buffer.concat(chunks).toString());
  const cwd = input.cwd || process.cwd();
  const state = readState(cwd);

  // If autoflow not active, allow normal stop
  if (!state || !state.active) {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Autoflow is active - evaluate if we should continue
  const now = new Date().toISOString();
  const timeSinceLastStop = state.lastStop
    ? (new Date(now).getTime() - new Date(state.lastStop).getTime()) / 1000
    : 999;

  // Loop detection: >2 stops in 30 seconds
  const newStopCount = timeSinceLastStop < 30 ? state.stopCount + 1 : 1;

  if (newStopCount > 2) {
    // Deactivate autoflow due to loop detection
    writeState(cwd, { ...state, active: false });

    console.error('⚠️  Autoflow loop detected - stopping autonomous mode\n\nClaude has stopped more than 2 times in 30 seconds, which suggests it may be stuck.\nAutoflow mode has been deactivated. Please review the situation.');
    process.exit(2); // Block stop and show message
  }

  // Update stop tracking
  writeState(cwd, {
    ...state,
    stopCount: newStopCount,
    lastStop: now,
  });

  // Read transcript and evaluate
  if (!input.transcript_path) {
    // No transcript available - allow stop
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const transcript = readTranscript(input.transcript_path);
  const lastMessages = getLastMessages(transcript, 5);

  // Use Claude SDK to evaluate
  const evaluation = await evaluateWithClaude(lastMessages);

  if (evaluation.shouldContinue) {
    // Block stop and tell Claude to continue
    console.error(`🤖 Autoflow Mode: Continue working\n\n${evaluation.reason}\n\nPlease continue working according to the plan. Check tasks.md for remaining work.`);
    process.exit(2); // Block stop
  }

  // Allow stop - work appears complete
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

main();
