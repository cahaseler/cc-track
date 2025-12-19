#!/usr/bin/env bun
/**
 * UserMessage Hook - Per-message autoflow activation
 *
 * Autoflow is NOT a persistent mode - it must be opted into with each user message.
 * This prevents runaway sessions and gives the user natural control.
 *
 * Activation: Include "autoflow" in message (not negated)
 * Deactivation: Any message without "autoflow" (or with negation)
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface HookInput {
  prompt?: string;
  cwd?: string;
  session_id?: string;
  hook_event_name?: string;
  transcript_path?: string;
  permission_mode?: string;
  [key: string]: unknown;
}

export interface AutoflowState {
  active: boolean;
  sessionId: string;
  activatedAt: string;
  continueCount: number;
  windowStart?: string;
}

export interface HookOutput {
  continue: boolean;
  hookSpecificOutput?: {
    hookEventName: string;
    additionalContext?: string;
  };
}

export interface UserMessageDeps {
  readState: () => AutoflowState | null;
  writeState: (state: AutoflowState) => void;
}

// Patterns that should NOT trigger activation (negations)
const NEGATION_PATTERNS = [
  /\bdon'?t\s+(?:use\s+)?autoflow\b/i,
  /\bno\s+autoflow\b/i,
  /\bnot\s+autoflow\b/i,
  /\bwithout\s+autoflow\b/i,
];

// Pattern for activation (word boundary to avoid matching "autoflowing" etc.)
const ACTIVATION_PATTERN = /\bautoflow\b/i;

function getStateFile(cwd: string): string {
  return join(cwd, '.cc-track', '.autoflow-state.json');
}

function createDefaultDeps(cwd: string): UserMessageDeps {
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
  };
}

export function shouldActivate(message: string): boolean {
  // First check if any negation pattern matches
  if (NEGATION_PATTERNS.some((pattern) => pattern.test(message))) {
    return false;
  }
  // Then check if activation pattern matches
  return ACTIVATION_PATTERN.test(message);
}

export async function userMessageHook(input: HookInput, deps?: UserMessageDeps): Promise<HookOutput> {
  const message = input.prompt || '';
  const cwd = input.cwd || process.cwd();
  const { readState, writeState } = deps || createDefaultDeps(cwd);

  const currentState = readState();
  const wasActive = currentState?.active ?? false;

  // Per-message opt-in: activate only if "autoflow" is in THIS message
  if (shouldActivate(message)) {
    writeState({
      active: true,
      sessionId: input.session_id || 'unknown',
      activatedAt: new Date().toISOString(),
      continueCount: 0,
    });

    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: `🤖 Autoflow mode active for this task.

Work autonomously until complete according to the plan. If a permission is denied, find a safe workaround that still accomplishes the goal.

IMPORTANT: This does NOT mean take shortcuts, bypass the plan, or do dangerous workarounds. If you genuinely need user input or permissions escalation to continue properly, clearly state the problem and stop working - do not proceed with an unsafe alternative.`,
      },
    };
  }

  // No "autoflow" in message - deactivate if it was active
  if (wasActive && currentState) {
    writeState({
      ...currentState,
      active: false,
    });
    // No message needed - silent deactivation on new user message
  }

  // Normal flow
  return { continue: true };
}

async function main() {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const input: HookInput = JSON.parse(Buffer.concat(chunks).toString());
  const result = await userMessageHook(input);

  console.log(JSON.stringify(result));
  process.exit(0);
}

if (import.meta.main) {
  main();
}
