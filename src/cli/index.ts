#!/usr/bin/env bun
import { Command } from 'commander';
import { backlogCommand } from '../commands/backlog';
import { completeTaskCommand } from '../commands/complete-task';
import { gitSessionCommand } from '../commands/git-session';
// Import commands
import { hookCommand } from '../commands/hook';
import { initCommand } from '../commands/init';
import { createPrepareCompletionCommand } from '../commands/prepare-completion';
import { statuslineCommand } from '../commands/statusline';

// Version is hardcoded for compiled binary
const VERSION = '1.0.0';

// Create main program
const program = new Command();

program
  .name('cc-track')
  .description('Task Review And Context Keeper - Keep your vibe coding on track 🚅')
  .version(VERSION, '-v, --version', 'output the current version')
  .helpOption('-h, --help', 'display help for command');

// Add commands
program.addCommand(hookCommand);
program.addCommand(initCommand);
program.addCommand(backlogCommand);
program.addCommand(completeTaskCommand);
program.addCommand(gitSessionCommand);
program.addCommand(createPrepareCompletionCommand());
program.addCommand(statuslineCommand);

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
