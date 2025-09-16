import { Command } from 'commander';
import type { CommandDeps, CommandResult, PartialCommandDeps } from './context';
import { applyCommandResult, handleCommandException, resolveCommandDeps } from './context';

export interface BacklogOptions {
  list?: boolean;
  file?: string;
}

export type BacklogDeps = Pick<CommandDeps, 'console' | 'process' | 'fs' | 'path' | 'time' | 'logger'>;

export interface BacklogResultData {
  backlogPath: string;
  addedItems?: string[];
  content?: string;
}

function ensureMessagesArray(message: string | string[]): string[] {
  return Array.isArray(message) ? message : [message];
}

export function runBacklog(
  items: string[],
  options: BacklogOptions,
  deps: BacklogDeps,
): CommandResult<BacklogResultData> {
  const logger = deps.logger('backlog-command');

  try {
    const projectRoot = deps.process.cwd();
    const backlogPath = options.file || deps.path.join(projectRoot, '.claude', 'backlog.md');

    if (options.list) {
      if (!deps.fs.existsSync(backlogPath)) {
        return {
          success: true,
          messages: ensureMessagesArray('No backlog file found. Create one with: cc-track backlog "your first item"'),
          data: { backlogPath, addedItems: [] },
        };
      }

      const content = deps.fs.readFileSync(backlogPath, 'utf-8');
      return {
        success: true,
        messages: ensureMessagesArray(content),
        data: { backlogPath, content },
      };
    }

    if (!items || items.length === 0) {
      return {
        success: false,
        error: 'No items provided. Usage: cc-track backlog "item 1" "item 2"',
        exitCode: 1,
        data: { backlogPath },
      };
    }

    if (!deps.fs.existsSync(backlogPath)) {
      const template = `# Backlog\n\n**Purpose:** Capture ideas, improvements, and future work items without disrupting current tasks.\n\n**Instructions:**\n- Items are added with timestamps for tracking\n- Review periodically to convert to tasks\n- Group by category when list grows large\n\n---\n\n## Items\n\n`;
      deps.fs.writeFileSync(backlogPath, template);
      logger.info('Created backlog file', { path: backlogPath });
    }

    const timestamp = deps.time.todayISO();
    const formattedItems = items.map((item) => `- [${timestamp}] ${item}`);

    deps.fs.appendFileSync(backlogPath, `${formattedItems.join('\n')}\n`);

    logger.info('Added items to backlog', { count: items.length });

    const outputMessages = [`✅ Added ${items.length} item(s) to backlog`, ...items.map((item) => `  - ${item}`)];

    return {
      success: true,
      messages: outputMessages,
      data: {
        backlogPath,
        addedItems: formattedItems,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to update backlog', { error: message });
    return {
      success: false,
      error: `Failed to update backlog: ${message}`,
      exitCode: 1,
    };
  }
}

export function createBacklogCommand(overrides?: PartialCommandDeps): Command {
  return new Command('backlog')
    .description('Add items to the project backlog')
    .argument('[items...]', 'items to add to backlog')
    .option('-l, --list', 'list current backlog items')
    .option('-f, --file <path>', 'backlog file path (default: .claude/backlog.md)')
    .action(async (items: string[], options: BacklogOptions) => {
      const deps = resolveCommandDeps(overrides);
      try {
        const result = runBacklog(items ?? [], options, deps);
        applyCommandResult(result, deps);
      } catch (error) {
        handleCommandException(error, deps);
      }
    });
}

export const backlogCommand = createBacklogCommand();
