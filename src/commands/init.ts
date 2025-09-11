import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { createLogger } from '../lib/logger';

const logger = createLogger('init-command');

/**
 * Initialize cc-track in a project
 */
export const initCommand = new Command('init')
  .description('Initialize cc-track in the current project')
  .option('-f, --force', 'overwrite existing files')
  .option('--no-backup', 'skip backing up existing files')
  .option('--with-stop', 'enable stop review hook')
  .action(async (options) => {
    try {
      const projectRoot = process.cwd();
      logger.info('Initializing cc-track', { projectRoot });

      // Create .claude directory structure
      const directories = [
        '.claude',
        '.claude/commands',
        '.claude/hooks',
        '.claude/lib',
        '.claude/scripts',
        '.claude/plans',
        '.claude/tasks',
        '.claude/logs',
      ];

      for (const dir of directories) {
        const dirPath = join(projectRoot, dir);
        if (!existsSync(dirPath)) {
          mkdirSync(dirPath, { recursive: true });
          logger.debug(`Created directory: ${dir}`);
        }
      }

      // Get cc-track installation path
      const ccTrackRoot = join(import.meta.dir, '../..');

      // Copy template files
      const templateFiles = [
        { src: 'templates/CLAUDE.md', dest: 'CLAUDE.md' },
        { src: 'templates/product_context.md', dest: '.claude/product_context.md' },
        { src: 'templates/system_patterns.md', dest: '.claude/system_patterns.md' },
        { src: 'templates/decision_log.md', dest: '.claude/decision_log.md' },
        { src: 'templates/code_index.md', dest: '.claude/code_index.md' },
        { src: 'templates/learned_mistakes.md', dest: '.claude/learned_mistakes.md' },
        { src: 'templates/user_context.md', dest: '.claude/user_context.md' },
        { src: 'templates/progress_log.md', dest: '.claude/progress_log.md' },
        { src: 'templates/backlog.md', dest: '.claude/backlog.md' },
        { src: 'templates/no_active_task.md', dest: '.claude/no_active_task.md' },
        { src: 'templates/track.config.json', dest: '.claude/track.config.json' },
        { src: 'templates/statusline.sh', dest: '.claude/scripts/statusline.sh' },
      ];

      for (const { src, dest } of templateFiles) {
        const srcPath = join(ccTrackRoot, src);
        const destPath = join(projectRoot, dest);

        if (existsSync(destPath) && !options.force) {
          logger.info(`Skipping existing file: ${dest}`);
          continue;
        }

        // Backup existing file if requested
        if (existsSync(destPath) && options.backup !== false) {
          const backupPath = `${destPath}.backup.${Date.now()}`;
          copyFileSync(destPath, backupPath);
          logger.info(`Backed up: ${dest} -> ${backupPath}`);
        }

        // Copy template
        copyFileSync(srcPath, destPath);
        logger.info(`Created: ${dest}`);
      }

      // Copy command files
      const commandFiles = [
        'init-track.md',
        'complete-task.md',
        'config-track.md',
        'add-to-backlog.md',
        'view-logs.md',
      ];

      for (const cmdFile of commandFiles) {
        const srcPath = join(ccTrackRoot, 'commands', cmdFile);
        const destPath = join(projectRoot, '.claude/commands', cmdFile);

        if (!existsSync(srcPath)) {
          logger.warn(`Command template not found: ${cmdFile}`);
          continue;
        }

        copyFileSync(srcPath, destPath);
        logger.debug(`Copied command: ${cmdFile}`);
      }

      // Update settings.json
      const settingsPath = join(projectRoot, '.claude/claude_code_settings.json');
      const settingsTemplatePath = options.withStop
        ? join(ccTrackRoot, 'templates/settings_with_stop.json')
        : join(ccTrackRoot, 'templates/settings.json');

      if (existsSync(settingsPath) && !options.force) {
        logger.info('Settings file exists, merging hooks...');

        // Merge existing settings with our hooks
        const existing = JSON.parse(readFileSync(settingsPath, 'utf-8'));
        const template = JSON.parse(readFileSync(settingsTemplatePath, 'utf-8'));

        // Merge hooks
        existing.hooks = {
          ...existing.hooks,
          ...template.hooks,
        };

        // Update statusline if not custom
        if (!existing.statusline || existing.statusline.includes('statusline.sh')) {
          existing.statusline = template.statusline;
        }

        writeFileSync(settingsPath, JSON.stringify(existing, null, 2));
        logger.info('Updated settings.json with cc-track hooks');
      } else {
        // Backup and replace
        if (existsSync(settingsPath) && options.backup !== false) {
          const backupPath = `${settingsPath}.backup.${Date.now()}`;
          copyFileSync(settingsPath, backupPath);
          logger.info(`Backed up settings.json -> ${backupPath}`);
        }

        copyFileSync(settingsTemplatePath, settingsPath);
        logger.info('Created settings.json');
      }

      // Make statusline executable
      const statuslinePath = join(projectRoot, '.claude/scripts/statusline.sh');
      if (existsSync(statuslinePath)) {
        execSync(`chmod +x "${statuslinePath}"`);
        logger.debug('Made statusline.sh executable');
      }

      // Initialize git if not already a repo
      const gitPath = join(projectRoot, '.git');
      if (!existsSync(gitPath)) {
        logger.info('Initializing git repository...');
        execSync('git init', { cwd: projectRoot });
        logger.info('Git repository initialized');
      }

      console.log('\n✅ cc-track initialized successfully!');
      console.log('\n🚅 Next steps:');
      console.log('  1. Review and customize .claude/track.config.json');
      console.log('  2. Update CLAUDE.md with your project context');
      console.log('  3. Restart Claude Code to load the new settings');
      console.log('\nHappy tracking! 🛤️');
    } catch (error) {
      logger.error('Initialization failed', { error });
      console.error('❌ Initialization failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
