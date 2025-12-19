#!/usr/bin/env bun
/**
 * UserMessage Hook - Detects autoflow activation/deactivation
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface HookInput {
  user_message?: string;
  cwd?: string;
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

async function main() {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const input: HookInput = JSON.parse(Buffer.concat(chunks).toString());
  const message = (input.user_message || '').toLowerCase().trim();
  const cwd = input.cwd || process.cwd();

  // Detect activation
  if (message.includes('autoflow')) {
    writeState(cwd, {
      active: true,
      sessionId: input.session_id || 'unknown',
      activatedAt: new Date().toISOString(),
      stopCount: 0,
    });

    console.log(JSON.stringify({
      continue: true,
      systemMessage: '🤖 Autoflow mode activated. Working autonomously until complete.',
    }));
    process.exit(0);
  }

  // Detect deactivation
  if (message.includes('stop autoflow') || message.includes('exit autoflow')) {
    const state = readState(cwd);
    if (state) {
      writeState(cwd, { ...state, active: false });
    }

    console.log(JSON.stringify({
      continue: true,
      systemMessage: '🛑 Autoflow mode deactivated.',
    }));
    process.exit(0);
  }

  // Normal flow
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

main();
