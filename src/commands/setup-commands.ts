import { Command } from 'commander';
import { embeddedCommands } from '../lib/embedded-resources';
import type { CommandDeps, CommandResult, PartialCommandDeps } from './context';
import { applyCommandResult, handleCommandException, resolveCommandDeps } from './context';

export type SetupCommandsDeps = Pick<CommandDeps, 'console' | 'process' | 'fs' | 'path' | 'logger' | 'time'>;

export interface SetupCommandsResultData {
  targetDir: string;
  installed: string[];
  backedUp: string[];
}

export function runSetupCommands(deps: SetupCommandsDeps): CommandResult<SetupCommandsResultData> {
  const logger = deps.logger('setup-commands');

  try {
    const projectRoot = deps.process.cwd();
    const targetDir = deps.path.join(projectRoot, '.claude', 'commands');
    const installed: string[] = [];
    const backedUp: string[] = [];
    const messages: string[] = [];

    if (!deps.fs.existsSync(targetDir)) {
      deps.fs.mkdirSync(targetDir, { recursive: true });
      logger.info('Created commands directory', { targetDir });
      messages.push('✅ Created .claude/commands directory');
    }

    const timestamp = deps.time.now().getTime();

    for (const [filename, content] of Object.entries(embeddedCommands)) {
      if (filename === 'setup-cc-track.md') {
        continue;
      }

      const targetPath = deps.path.join(targetDir, filename);

      if (deps.fs.existsSync(targetPath)) {
        const backupPath = `${targetPath}.backup-${timestamp}`;
        deps.fs.copyFileSync(targetPath, backupPath);
        backedUp.push(backupPath);
        messages.push(`📦 Backed up existing ${filename}`);
      }

      deps.fs.writeFileSync(targetPath, content);
      installed.push(filename);
      messages.push(`✅ Created ${filename}`);
    }

    messages.push('');
    messages.push(`📊 Commands setup complete: ${installed.length} commands installed`);
    messages.push('🎯 Slash commands are ready to use in Claude Code!');

    if (Object.keys(embeddedCommands).length > 0) {
      messages.push('');
      messages.push('Available commands:');
      for (const filename of Object.keys(embeddedCommands)) {
        if (filename === 'setup-cc-track.md') continue;
        messages.push(`  /${filename.replace('.md', '')}`);
      }
    }

    return {
      success: true,
      messages,
      data: {
        targetDir,
        installed,
        backedUp,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to set up commands', { error: message });
    return {
      success: false,
      error: `Failed to set up commands: ${message}`,
      exitCode: 1,
    };
  }
}

export function createSetupCommandsCommand(overrides?: PartialCommandDeps): Command {
  return new Command('setup-commands').description('Copy cc-track slash commands to your project').action(async () => {
    const deps = resolveCommandDeps(overrides);
    try {
      const result = runSetupCommands(deps);
      applyCommandResult(result, deps);
    } catch (error) {
      handleCommandException(error, deps);
    }
  });
}

export const setupCommandsCommand = createSetupCommandsCommand();
