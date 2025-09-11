import { Command } from 'commander';
import { createLogger } from '../lib/logger';
import type { HookInput, HookOutput } from '../types';

// Import all hooks
import { editValidationHook } from '../hooks/edit-validation';
import { preCompactHook } from '../hooks/pre-compact';
import { postCompactHook } from '../hooks/post-compact';
import { capturePlanHook } from '../hooks/capture-plan';
import { stopReviewHook } from '../hooks/stop-review';

const logger = createLogger('hook-dispatcher');

/**
 * Map of hook event names to their handler functions
 */
const hookHandlers: Record<string, (input: HookInput) => Promise<HookOutput>> = {
  'PostToolUse': editValidationHook,
  'PreCompact': preCompactHook,
  'SessionStart': postCompactHook,
  'ExitPlanMode': capturePlanHook,
  'Stop': stopReviewHook,
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
  .option('-t, --type <type>', 'hook event type (overrides stdin hook_event_name)')
  .option('--debug', 'enable debug logging')
  .action(async (options) => {
    try {
      // Read input from stdin
      const input = await readStdinJson();
      
      // Override hook type if specified
      if (options.type) {
        input.hook_event_name = options.type;
      }
      
      // Enable debug logging if requested
      if (options.debug) {
        process.env.LOG_LEVEL = 'debug';
      }
      
      logger.debug('Processing hook event', { 
        event: input.hook_event_name,
        cwd: input.cwd,
        source: input.source,
      });
      
      // Find handler for this hook event
      const handler = hookHandlers[input.hook_event_name];
      
      if (!handler) {
        logger.debug('No handler registered for event', { event: input.hook_event_name });
        // Return success for unhandled events (don't block)
        const output: HookOutput = { continue: true };
        console.log(JSON.stringify(output));
        process.exit(0);
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