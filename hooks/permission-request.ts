#!/usr/bin/env bun
/**
 * PermissionRequest Hook - Denies permissions in autoflow mode with helpful message
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface HookInput {
  cwd?: string;
  tool_name?: string;
  tool_input?: unknown;
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
  continue?: boolean;
  hookSpecificOutput?: {
    hookEventName: string;
    decision: {
      behavior: 'deny' | 'allow';
      message: string;
    };
  };
}

export interface PermissionRequestDeps {
  readState: () => AutoflowState | null;
}

function getStateFile(cwd: string): string {
  return join(cwd, '.cc-track', '.autoflow-state.json');
}

function createDefaultDeps(cwd: string): PermissionRequestDeps {
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
  };
}

export async function permissionRequestHook(input: HookInput, deps?: PermissionRequestDeps): Promise<HookOutput> {
  const cwd = input.cwd || process.cwd();
  const { readState } = deps || createDefaultDeps(cwd);
  const state = readState();

  // If autoflow not active, allow normal permission flow
  if (!state || !state.active) {
    return { continue: true };
  }

  // Autoflow is active - deny permission with helpful message
  return {
    hookSpecificOutput: {
      hookEventName: 'PermissionRequest',
      decision: {
        behavior: 'deny',
        message: `🤖 Autoflow Mode: Permission denied - user is not currently available.

Find a safe alternative approach to accomplish this goal without requiring this permission.

If there is NO safe alternative: clearly state the problem, explain why you need user input or escalated permissions, and STOP working. Do not proceed with dangerous workarounds or bypass the plan.`,
      },
    },
  };
}

async function main() {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const input: HookInput = JSON.parse(Buffer.concat(chunks).toString());
  const result = await permissionRequestHook(input);

  console.log(JSON.stringify(result));
  process.exit(0);
}

if (import.meta.main) {
  main();
}
