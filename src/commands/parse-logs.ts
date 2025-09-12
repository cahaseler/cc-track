import { existsSync, writeFileSync } from 'node:fs';
import { Command } from 'commander';
import { ClaudeLogParser, type ParseOptions } from '../lib/log-parser';
import { createLogger } from '../lib/logger';

const logger = createLogger('parse-logs');

/**
 * Parse a date string to Date object
 */
function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return date;
}

/**
 * Create the parse-logs command
 */
export const parseLogsCommand = new Command('parse-logs')
  .description('Parse and filter Claude Code JSONL logs')
  .requiredOption('-f, --file <path>', 'Path to JSONL log file')
  .option('--from <date>', 'Start date for filtering (ISO format or parseable date)')
  .option('--to <date>', 'End date for filtering (ISO format or parseable date)')
  .option('-r, --role <role>', 'Filter by role (user, assistant, system, all)', 'all')
  .option('-l, --limit <number>', 'Maximum number of entries to return', parseInt)
  .option('--format <format>', 'Output format (json or plaintext)', 'plaintext')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('--include-tools', 'Include tool calls and results in output', true)
  .option('--no-include-tools', 'Exclude tool calls and results from output')
  .option('--raw', 'Output raw entries without simplification')
  .action(async (options) => {
    try {
      // Validate file exists
      if (!existsSync(options.file)) {
        console.error(`Error: File not found: ${options.file}`);
        process.exit(1);
      }

      // Validate role
      const validRoles = ['user', 'assistant', 'system', 'all'];
      if (!validRoles.includes(options.role)) {
        console.error(`Error: Invalid role. Must be one of: ${validRoles.join(', ')}`);
        process.exit(1);
      }

      // Validate format
      const validFormats = ['json', 'plaintext'];
      if (!validFormats.includes(options.format)) {
        console.error(`Error: Invalid format. Must be one of: ${validFormats.join(', ')}`);
        process.exit(1);
      }

      // Parse dates if provided
      let timeRange: ParseOptions['timeRange'];
      if (options.from || options.to) {
        timeRange = {};
        if (options.from) {
          timeRange.start = parseDate(options.from);
          if (!timeRange.start) {
            console.error(`Error: Invalid from date: ${options.from}`);
            process.exit(1);
          }
        }
        if (options.to) {
          timeRange.end = parseDate(options.to);
          if (!timeRange.end) {
            console.error(`Error: Invalid to date: ${options.to}`);
            process.exit(1);
          }
        }
      }

      // Build parse options
      const parseOptions: ParseOptions = {
        timeRange,
        role: options.role as 'user' | 'assistant' | 'system' | 'all',
        limit: options.limit,
        format: options.format as 'json' | 'plaintext',
        includeTools: options.includeTools,
        simplifyResults: !options.raw,
      };

      logger.info('Parsing log file', {
        file: options.file,
        options: parseOptions,
      });

      // Parse the log
      const parser = new ClaudeLogParser(options.file);
      const result = await parser.parse(parseOptions);

      // Output results
      const output = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

      if (options.output) {
        writeFileSync(options.output, output);
        console.log(`Output written to: ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${errorMessage}`);
      logger.error('Failed to parse logs', { error: errorMessage });
      process.exit(1);
    }
  });
