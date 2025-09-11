import { Command } from 'commander';
import { capturePlanHook } from '../hooks/capture-plan';
// Import all hooks
import { editValidationHook } from '../hooks/edit-validation';
import { postCompactHook } from '../hooks/post-compact';
import { preCompactHook } from '../hooks/pre-compact';
import { stopReviewHook } from '../hooks/stop-review';
import { createLogger } from '../lib/logger';
import type { HookInput, HookOutput } from '../types';

const logger = createLogger('hook-dispatcher');

/**
 * Determine which hook to run based on the input data
 */
export function determineHookType(input: HookInput): string | null {
  const { hook_event_name, tool_name } = input;

  // Map event types to hook handlers
  switch (hook_event_name) {
    case 'PostToolUse':
      // Check if this is an ExitPlanMode event for capture-plan
      if (tool_name === 'ExitPlanMode') {
        return 'capture-plan';
      }
      // Check if this is an Edit/Write/MultiEdit event for edit-validation
      if (tool_name === 'Edit' || tool_name === 'Write' || tool_name === 'MultiEdit') {
        return 'edit-validation';
      }
      return null;

    case 'PreCompact':
      return 'pre-compact';

    case 'SessionStart':
      // Check if source is compact for post-compact hook
      if (input.source === 'compact') {
        return 'post-compact';
      }
      return null;

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
  'post-compact': postCompactHook,
  'stop-review': stopReviewHook,
};

/**
 * Read JSON input from stdin
 */
async function readStdinJson(): Promise<HookInput> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const input = Buffer.concat(chunks).toString('utf-8');

  try {
    return JSON.parse(input) as HookInput;
  } catch (error) {
    logger.error('Failed to parse JSON input', { error, input });
    throw new Error('Invalid JSON input');
  }
}

/**
 * Hook command for handling Claude Code hook events
 */
export const hookCommand = new Command('hook')
  .description('Handle Claude Code hook events (reads JSON from stdin)')
  .action(async () => {
    try {
      // Read input from stdin
      const input = await readStdinJson();

      // Log the received input for debugging
      logger.debug('Received hook input', {
        hook_event_name: input.hook_event_name,
        tool_name: input.tool_name,
        source: input.source,
      });

      // Determine hook type from input
      const hookType = determineHookType(input);

      if (!hookType) {
        logger.debug('No handler for this hook event', {
          hook_event_name: input.hook_event_name,
          tool_name: input.tool_name,
        });
        // Return success with no action for unhandled events
        console.log(JSON.stringify({ continue: true }));
        process.exit(0);
      }

      // Get the handler for this hook type
      const handler = hookHandlers[hookType];
      if (!handler) {
        logger.error('Unknown hook type', { hookType });
        console.error(JSON.stringify({ error: `Unknown hook type: ${hookType}` }));
        process.exit(1);
      }

      // Execute the hook
      logger.debug(`Executing ${hookType} hook`);
      const result = await handler(input);

      // Output the result as JSON to stdout
      // For JSON output mode, always use exit code 0
      // The decision field in the JSON controls blocking, not the exit code
      console.log(JSON.stringify(result));
      process.exit(0);
    } catch (error) {
      logger.error('Hook execution failed', { error });
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
      process.exit(1);
    }
  });
