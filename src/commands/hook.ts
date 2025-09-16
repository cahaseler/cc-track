import { Command } from 'commander';
import { capturePlanHook } from '../hooks/capture-plan';
// Import all hooks
import { editValidationHook } from '../hooks/edit-validation';
import { preCompactHook } from '../hooks/pre-compact';
import { preToolValidationHook } from '../hooks/pre-tool-validation';
import { stopReviewHook } from '../hooks/stop-review';
import { createLogger } from '../lib/logger';
import type { HookInput, HookOutput } from '../types';
import type { CommandDeps, CommandResult, PartialCommandDeps } from './context';
import { applyCommandResult, CommandError, handleCommandException, resolveCommandDeps } from './context';

const logger = createLogger('hook-dispatcher');

/**
 * Determine which hook to run based on the input data
 */
export function determineHookType(input: HookInput): string | null {
  const { hook_event_name, tool_name } = input;

  // Map event types to hook handlers
  switch (hook_event_name) {
    case 'PreToolUse':
      // Check if this is an Edit/Write/MultiEdit event for pre-tool validation
      if (tool_name === 'Edit' || tool_name === 'Write' || tool_name === 'MultiEdit') {
        return 'pre-tool-validation';
      }
      return null;

    case 'PostToolUse':
      // Check if this is an Edit/Write/MultiEdit event for edit-validation
      if (tool_name === 'Edit' || tool_name === 'Write' || tool_name === 'MultiEdit') {
        return 'edit-validation';
      }
      // Heuristic: capture-plan on explicit ExitPlanMode or when a plan payload is present
      if (
        tool_name === 'ExitPlanMode' ||
        (typeof tool_name === 'string' && /ExitPlan/i.test(tool_name)) ||
        (input.tool_response !== undefined &&
          input.tool_response !== null &&
          typeof input.tool_response === 'object' &&
          'plan' in (input.tool_response as Record<string, unknown>)) ||
        (input.tool_input !== undefined &&
          input.tool_input !== null &&
          typeof input.tool_input === 'object' &&
          'plan' in (input.tool_input as Record<string, unknown>))
      ) {
        return 'capture-plan';
      }
      return null;

    case 'PreCompact':
      return 'pre-compact';

    case 'Stop':
      return 'stop-review';

    default:
      return null;
  }
}

/**
 * Map of hook types to their handler functions
 */
const hookHandlers: Record<string, (input: HookInput) => Promise<HookOutput>> = {
  'capture-plan': capturePlanHook,
  'edit-validation': editValidationHook,
  'pre-compact': preCompactHook,
  'stop-review': stopReviewHook,
  'pre-tool-validation': preToolValidationHook,
};

/**
 * Read JSON input from stdin
 */
async function readStdinJson(stdin: NodeJS.ReadableStream): Promise<HookInput> {
  const chunks: Buffer[] = [];

  for await (const chunk of stdin) {
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    } else {
      chunks.push(Buffer.from(chunk));
    }
  }

  const input = Buffer.concat(chunks).toString('utf-8');

  try {
    return JSON.parse(input) as HookInput;
  } catch (error) {
    logger.error('Failed to parse JSON input', { error, input });
    throw new CommandError('Invalid JSON input', { exitCode: 1, details: input });
  }
}

/**
 * Hook command logic
 */
export async function runHookCommand(
  deps: CommandDeps,
  stdin: NodeJS.ReadableStream = process.stdin,
  stdout: NodeJS.WritableStream = process.stdout,
  handlers: typeof hookHandlers = hookHandlers,
): Promise<CommandResult<{ hookType?: string; output: HookOutput | { continue: true } }>> {
  const messages: string[] = [];
  try {
    const input = await readStdinJson(stdin);

    deps.logger('hook-dispatcher').debug('Received hook input', {
      hook_event_name: input.hook_event_name,
      tool_name: input.tool_name,
      source: input.source,
    });

    const hookType = determineHookType(input);

    if (!hookType) {
      messages.push(JSON.stringify({ continue: true }));
      stdout.write(`${messages[0]}\n`);
      return {
        success: true,
        messages,
        data: { output: { continue: true } },
        exitCode: 0,
      };
    }

    const handler = handlers[hookType];
    if (!handler) {
      throw new CommandError(`Unknown hook type: ${hookType}`, { exitCode: 1 });
    }

    deps.logger('hook-dispatcher').debug(`Executing ${hookType} hook`);
    const result = await handler(input);
    const payload = JSON.stringify(result);
    stdout.write(`${payload}\n`);

    return {
      success: true,
      messages: [payload],
      data: { hookType, output: result },
      exitCode: 0,
    };
  } catch (error) {
    const err = error instanceof CommandError ? error : new CommandError('Hook execution failed', { cause: error });
    const payload = JSON.stringify({
      error: err.message,
    });
    stdout.write(`${payload}\n`);
    return {
      success: false,
      error: err.message,
      exitCode: err.exitCode,
      details: err.details,
      data: { output: { continue: true } },
    };
  }
}

export function createHookCommand(overrides?: PartialCommandDeps): Command {
  return new Command('hook').description('Handle Claude Code hook events (reads JSON from stdin)').action(async () => {
    const deps = resolveCommandDeps(overrides);
    try {
      const result = await runHookCommand(deps);
      applyCommandResult(result, deps);
    } catch (error) {
      handleCommandException(error, deps);
    }
  });
}

export const hookCommand = createHookCommand();
