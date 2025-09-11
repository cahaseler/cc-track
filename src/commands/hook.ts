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
  .option(
    '-t, --type <type>',
    'hook type to execute (capture-plan, edit-validation, pre-compact, post-compact, stop-review)',
    { required: true },
  )
  .option('--debug', 'enable debug logging')
  .action(async (options) => {
    try {
      // Read input from stdin
      const input = await readStdinJson();

      // Enable debug logging if requested
      if (options.debug) {
        process.env.LOG_LEVEL = 'debug';
      }

      logger.debug('Processing hook event', {
        event: input.hook_event_name,
        cwd: input.cwd,
        source: input.source,
      });

      // Find handler for this hook type
      const handler = options.type ? hookHandlers[options.type] : null;

      if (!handler) {
        logger.error('Unknown hook type', { type: options.type });
        const output: HookOutput = {
          continue: false,
          error: `Unknown hook type: ${options.type}`,
        };
        console.log(JSON.stringify(output));
        process.exit(1);
      }

      // Execute hook handler
      const output = await handler(input);

      // Write output to stdout
      console.log(JSON.stringify(output));

      // Exit with appropriate code
      if (output.continue === false || output.decision === 'block') {
        process.exit(2); // Block the action
      }

      process.exit(0); // Success
    } catch (error) {
      logger.error('Hook execution failed', { error });

      // Return error output
      const errorOutput: HookOutput = {
        continue: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };

      console.log(JSON.stringify(errorOutput));
      process.exit(1); // Error
    }
  });
