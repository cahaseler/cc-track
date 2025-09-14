import { Command } from 'commander';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { embeddedCommands } from '../lib/embedded-resources';

export const setupCommandsCommand = new Command('setup-commands')
  .description('Copy cc-track slash commands to your project')
  .action(() => {
    // Target directory is .claude/commands in current working directory
    const targetDir = join(process.cwd(), '.claude', 'commands');

    // Create .claude/commands directory if it doesn't exist
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    let copiedCount = 0;

    // Write each embedded command to the target directory
    for (const [filename, content] of Object.entries(embeddedCommands)) {
      // Skip setup-cc-track.md as it's created by init command
      if (filename === 'setup-cc-track.md') {
        continue;
      }

      const targetPath = join(targetDir, filename);

      if (existsSync(targetPath)) {
        // If command exists, create a backup
        const backupPath = `${targetPath}.backup-${Date.now()}`;
        copyFileSync(targetPath, backupPath);
        console.log(`📦 Backed up existing ${filename}`);
      }

      writeFileSync(targetPath, content);
      copiedCount++;
      console.log(`✅ Created ${filename}`);
    }

    console.log(`\n📊 Commands setup complete: ${copiedCount} commands installed`);
    console.log('🎯 Slash commands are ready to use in Claude Code!');

    // List the available commands
    console.log('\nAvailable commands:');
    for (const filename of Object.keys(embeddedCommands)) {
      if (filename === 'setup-cc-track.md') continue;
      const commandName = filename.replace('.md', '');
      console.log(`  /${commandName}`);
    }
  });