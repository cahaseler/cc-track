import { Command } from 'commander';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const setupCommandsCommand = new Command('setup-commands')
  .description('Copy cc-track slash commands to your project')
  .action(() => {
    // Get the directory where this compiled binary is located
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // For compiled binary, commands are in the cc-track package root
    // When installed via npm, they'll be in node_modules/cc-track/.claude/commands
    // For local testing, they're in the project root
    let sourceCommandsDir: string;

    // Check if we're in a compiled binary (dist/) or npm package
    if (__dirname.includes('/dist')) {
      // Local development: go up from dist/ to project root
      const projectRoot = join(__dirname, '..');
      sourceCommandsDir = join(projectRoot, '.claude', 'commands');
    } else if (__dirname.includes('node_modules/cc-track')) {
      // npm installation: commands are in the package
      const packageRoot = __dirname.split('node_modules/cc-track')[0] + 'node_modules/cc-track';
      sourceCommandsDir = join(packageRoot, '.claude', 'commands');
    } else {
      // Fallback: assume commands are relative to binary
      sourceCommandsDir = join(__dirname, '.claude', 'commands');
    }

    // Target directory is .claude/commands in current working directory
    const targetDir = join(process.cwd(), '.claude', 'commands');

    // Create .claude/commands directory if it doesn't exist
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    if (!existsSync(sourceCommandsDir)) {
      console.error('❌ Commands directory not found in package. This is unexpected.');
      console.error(`   Looking for: ${sourceCommandsDir}`);
      process.exit(1);
    }

    // Get all .md files from source commands directory
    const commandFiles = readdirSync(sourceCommandsDir).filter(file => file.endsWith('.md'));

    let copiedCount = 0;

    for (const commandFile of commandFiles) {
      // Skip setup-cc-track.md as it's created by init command
      if (commandFile === 'setup-cc-track.md') {
        continue;
      }

      const sourcePath = join(sourceCommandsDir, commandFile);
      const targetPath = join(targetDir, commandFile);

      if (existsSync(targetPath)) {
        // If command exists, create a backup
        const backupPath = `${targetPath}.backup-${Date.now()}`;
        copyFileSync(targetPath, backupPath);
        console.log(`📦 Backed up existing ${commandFile} to backup file`);
      }

      copyFileSync(sourcePath, targetPath);
      copiedCount++;
      console.log(`✅ Copied ${commandFile}`);
    }

    console.log(`\n📊 Commands setup complete: ${copiedCount} commands installed`);
    console.log('🎯 Slash commands are ready to use in Claude Code!');

    // List the available commands
    console.log('\nAvailable commands:');
    for (const commandFile of commandFiles) {
      if (commandFile === 'setup-cc-track.md') continue;
      const commandName = commandFile.replace('.md', '');
      console.log(`  /${commandName}`);
    }
  });