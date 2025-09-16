import { Command } from 'commander';
import type { ParseOptions } from '../lib/log-parser';
import type { CommandDeps, CommandResult, PartialCommandDeps } from './context';
import { applyCommandResult, CommandError, handleCommandException, resolveCommandDeps } from './context';

export type ParseLogsDeps = Pick<CommandDeps, 'console' | 'process' | 'fs' | 'logger' | 'logParser'>;

export interface ParseLogsOptions {
  file: string;
  from?: string;
  to?: string;
  role: 'user' | 'assistant' | 'system' | 'all';
  limit?: number;
  format: 'json' | 'plaintext';
  output?: string;
  includeTools: boolean;
  raw: boolean;
}

export interface ParseLogsResultData {
  output?: string;
  entryCount?: number;
  writtenToFile?: boolean;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new CommandError(`Invalid date format: ${value}`, { exitCode: 1 });
  }
  return date;
}

export async function runParseLogs(
  options: ParseLogsOptions,
  deps: ParseLogsDeps,
): Promise<CommandResult<ParseLogsResultData>> {
  const logger = deps.logger('parse-logs');

  try {
    if (!deps.fs.existsSync(options.file)) {
      return {
        success: false,
        error: `File not found: ${options.file}`,
        exitCode: 1,
      };
    }

    const validRoles: Array<ParseLogsOptions['role']> = ['user', 'assistant', 'system', 'all'];
    if (!validRoles.includes(options.role)) {
      return {
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        exitCode: 1,
      };
    }

    const validFormats: Array<ParseLogsOptions['format']> = ['json', 'plaintext'];
    if (!validFormats.includes(options.format)) {
      return {
        success: false,
        error: `Invalid format. Must be one of: ${validFormats.join(', ')}`,
        exitCode: 1,
      };
    }

    const timeRange: ParseOptions['timeRange'] = {};
    const fromDate = parseDate(options.from);
    const toDate = parseDate(options.to);
    if (fromDate) timeRange.start = fromDate;
    if (toDate) timeRange.end = toDate;

    const parseOptions: ParseOptions = {
      timeRange: options.from || options.to ? timeRange : undefined,
      role: options.role,
      limit: options.limit,
      format: options.format,
      includeTools: options.includeTools,
      simplifyResults: !options.raw,
    };

    logger.info('Parsing log file', { file: options.file, parseOptions });

    const parser = deps.logParser.create(options.file);
    const result = await parser.parse(parseOptions);
    const output = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

    if (options.output) {
      deps.fs.writeFileSync(options.output, output);
      return {
        success: true,
        messages: [`Output written to: ${options.output}`],
        data: {
          output,
          writtenToFile: true,
        },
      };
    }

    return {
      success: true,
      messages: [output],
      data: {
        output,
        entryCount: Array.isArray(result) ? result.length : undefined,
        writtenToFile: false,
      },
    };
  } catch (error) {
    if (error instanceof CommandError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to parse logs', { error: message });
    return {
      success: false,
      error: `Failed to parse logs: ${message}`,
      exitCode: 1,
    };
  }
}

export function createParseLogsCommand(overrides?: PartialCommandDeps): Command {
  return new Command('parse-logs')
    .description('Parse and filter Claude Code JSONL logs')
    .requiredOption('-f, --file <path>', 'Path to JSONL log file')
    .option('--from <date>', 'Start date for filtering (ISO format or parseable date)')
    .option('--to <date>', 'End date for filtering (ISO format or parseable date)')
    .option('-r, --role <role>', 'Filter by role (user, assistant, system, all)', 'all')
    .option('-l, --limit <number>', 'Maximum number of entries to return', (value) => parseInt(value, 10))
    .option('--format <format>', 'Output format (json or plaintext)', 'plaintext')
    .option('-o, --output <file>', 'Output file (default: stdout)')
    .option('--include-tools', 'Include tool calls and results in output', true)
    .option('--no-include-tools', 'Exclude tool calls and results from output')
    .option('--raw', 'Output raw entries without simplification')
    .action(async (cmdOptions: ParseLogsOptions) => {
      const deps = resolveCommandDeps(overrides);
      try {
        const result = await runParseLogs(cmdOptions, deps);
        applyCommandResult(result, deps);
      } catch (error) {
        handleCommandException(error, deps);
      }
    });
}

export const parseLogsCommand = createParseLogsCommand();
