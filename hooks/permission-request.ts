#!/usr/bin/env bun
/**
 * PermissionRequest Hook - Denies permissions in autoflow mode with helpful message
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface HookInput {
  cwd?: string;
  tool_name?: string;
  tool_input?: unknown;
  [key: string]: unknown;
}

interface AutoflowState {
  active: boolean;
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

async function main() {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const input: HookInput = JSON.parse(Buffer.concat(chunks).toString());
  const cwd = input.cwd || process.cwd();
  const state = readState(cwd);

  // If autoflow not active, allow normal permission flow
  if (!state || !state.active) {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Autoflow is active - deny permission with helpful message
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PermissionRequest',
      decision: {
        behavior: 'deny',
        message: `🤖 Autoflow Mode: User is not currently available.\n\nPlease find a safe alternative approach to accomplish this goal without requiring this permission.\n\nIf there is no safe alternative, the work will pause here until the user returns.`,
      },
    },
  }));

  process.exit(0);
}

main();
