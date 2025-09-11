import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { createLogger } from '../lib/logger';

const logger = createLogger('init-command');

/**
 * Ensure directory exists, create if needed
 */
function ensureDirectoryExists(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    logger.debug(`Created directory: ${dir}`);
  }
}

/**
 * Copy template file with safety checks
 */
function copyTemplate(sourcePath: string, destPath: string, force = false): boolean {
  if (!existsSync(sourcePath)) {
    console.error(`Template not found: ${sourcePath}`);
    return false;
  }

  // Don't overwrite existing files unless forced or they're empty
  if (existsSync(destPath)) {
    const content = readFileSync(destPath, 'utf-8');
    if (content.trim().length > 0 && !force) {
      console.log(`Skipping ${destPath.split('/').pop()} - file already exists with content`);
      return false;
    }
  }

  copyFileSync(sourcePath, destPath);
  console.log(`✓ Created ${destPath.split('/').pop()}`);
  return true;
}

/**
 * Update CLAUDE.md with smart merging
 */
function updateClaudeMd(projectRoot: string, templatesDir: string, force = false, noBackup = false) {
  const claudeMdPath = join(projectRoot, 'CLAUDE.md');
  const templatePath = join(templatesDir, 'CLAUDE.md');

  if (existsSync(claudeMdPath)) {
    // Check if it already has cc-track imports
    const content = readFileSync(claudeMdPath, 'utf-8');
    if (content.includes('@.claude/product_context.md')) {
      console.log('CLAUDE.md already has cc-track imports');
      return;
    }

    if (force) {
      // Force overwrite mode
      if (!noBackup) {
        const backupPath = join(projectRoot, 'CLAUDE.md.backup');
        copyFileSync(claudeMdPath, backupPath);
        console.log(`✓ Backed up existing CLAUDE.md to CLAUDE.md.backup`);
      }
      copyFileSync(templatePath, claudeMdPath);
      console.log('✓ Overwrote CLAUDE.md with cc-track template');
    } else {
      // Smart merge mode (default)
      if (!noBackup) {
        const backupPath = join(projectRoot, 'CLAUDE.md.backup');
        copyFileSync(claudeMdPath, backupPath);
        console.log(`✓ Backed up existing CLAUDE.md to CLAUDE.md.backup`);
      }

      // Prepend cc-track imports to existing content
      const templateContent = readFileSync(templatePath, 'utf-8');
      const ccTrackSection = `${templateContent.split('---')[0]}---\n\n`;
      const updatedContent = ccTrackSection + content;

      writeFileSync(claudeMdPath, updatedContent);
      console.log('✓ Updated CLAUDE.md with cc-track imports');
    }
  } else {
    // Create new CLAUDE.md from template
    copyFileSync(templatePath, claudeMdPath);
    console.log('✓ Created CLAUDE.md from template');
  }
}

/**
 * Create no_active_task.md as default state
 */
function createNoActiveTask(claudeDir: string, templatesDir: string) {
  const noTaskPath = join(claudeDir, 'no_active_task.md');
  const templatePath = join(templatesDir, 'no_active_task.md');

  if (!existsSync(noTaskPath)) {
    copyFileSync(templatePath, noTaskPath);
    console.log('✓ Created no_active_task.md');
  }
}

/**
 * Create settings.json with proper template selection
 */
function createSettings(claudeDir: string, templatesDir: string, withStop: boolean) {
  const settingsPath = join(claudeDir, 'claude_code_settings.json');

  // Choose template based on --with-stop flag
  const templateFile = withStop ? 'settings_with_stop.json' : 'settings.json';
  const templatePath = join(templatesDir, templateFile);

  if (existsSync(settingsPath)) {
    console.log('Settings file already exists, merging configurations...');

    // Read existing settings
    const existingSettings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    const templateSettings = JSON.parse(readFileSync(templatePath, 'utf-8'));

    // Merge settings (template takes precedence for hooks/statusline)
    const mergedSettings = {
      ...existingSettings,
      hooks: templateSettings.hooks,
      statusline: templateSettings.statusline,
    };

    writeFileSync(settingsPath, JSON.stringify(mergedSettings, null, 2));
    console.log('✓ Updated claude_code_settings.json with cc-track hooks');
  } else {
    copyFileSync(templatePath, settingsPath);
    console.log(`✓ Created claude_code_settings.json ${withStop ? 'with stop hook enabled' : ''}`);
  }
}

/**
 * Initialize cc-track in a project
 */
async function initAction(options: { force?: boolean; noBackup?: boolean; withStop?: boolean }) {
  try {
    const projectRoot = process.cwd();
    logger.info('Initializing cc-track', { projectRoot });

    console.log('Initializing cc-track context management system...\n');

    // Get cc-track installation path (templates are in project root)
    const ccTrackRoot = join(import.meta.dir, '../..');
    const templatesDir = join(ccTrackRoot, 'templates');

    // Verify templates directory exists
    if (!existsSync(templatesDir)) {
      console.error(`Templates directory not found: ${templatesDir}`);
      process.exit(1);
    }

    // Create .claude directory structure (original structure + additions)
    const claudeDir = join(projectRoot, '.claude');
    const directories = [
      '.claude',
      '.claude/hooks',
      '.claude/plans',
      '.claude/utils',
      '.claude/commands',
      '.claude/lib',
      '.claude/scripts',
      '.claude/tasks',
      '.claude/logs',
    ];

    for (const dir of directories) {
      ensureDirectoryExists(join(projectRoot, dir));
    }

    // Template files to copy (excluding special cases)
    const templateFiles = [
      { src: 'product_context.md', dest: '.claude/product_context.md' },
      { src: 'system_patterns.md', dest: '.claude/system_patterns.md' },
      { src: 'decision_log.md', dest: '.claude/decision_log.md' },
      { src: 'progress_log.md', dest: '.claude/progress_log.md' },
      { src: 'code_index.md', dest: '.claude/code_index.md' },
      { src: 'learned_mistakes.md', dest: '.claude/learned_mistakes.md' },
      { src: 'user_context.md', dest: '.claude/user_context.md' },
      { src: 'statusline.sh', dest: '.claude/statusline.sh' },
      { src: 'track.config.json', dest: '.claude/track.config.json' },
    ];

    // Copy template files
    console.log('Creating context files:');
    for (const file of templateFiles) {
      const sourcePath = join(templatesDir, file.src);
      const destPath = join(projectRoot, file.dest);
      copyTemplate(sourcePath, destPath, options.force);
    }

    // Create no_active_task.md as default state
    createNoActiveTask(claudeDir, templatesDir);

    // Handle CLAUDE.md with smart merging
    updateClaudeMd(projectRoot, templatesDir, options.force, options.noBackup);

    // Create settings file with proper template
    createSettings(claudeDir, templatesDir, !!options.withStop);

    // Copy command templates (new feature in refactor - improvement)
    const commandsDir = join(projectRoot, '.claude/commands');
    const templateCommandsDir = join(ccTrackRoot, '.claude/commands');

    if (existsSync(templateCommandsDir)) {
      console.log('\nCopying command templates:');
      const commandFiles = [
        'init-track.md',
        'complete-task.md',
        'add-to-backlog.md',
        'config-track.md',
        'view-logs.md',
      ];

      for (const cmdFile of commandFiles) {
        const srcPath = join(templateCommandsDir, cmdFile);
        const destPath = join(commandsDir, cmdFile);
        if (existsSync(srcPath)) {
          copyTemplate(srcPath, destPath, options.force);
        }
      }
    }

    console.log('\n✅ cc-track initialization complete!');
    console.log('\nNext steps:');
    console.log('1. Review and populate .claude/product_context.md');
    console.log('2. Document patterns in .claude/system_patterns.md');
    console.log('3. Review journal entries to populate .claude/user_context.md');
    console.log('   - Use: mcp__private-journal__search_journal with "user preferences working style"');
    console.log('4. The system will automatically track tasks and decisions');
    console.log('5. Use Shift+Tab twice to enter planning mode for complex tasks');
  } catch (error) {
    const err = error as Error;
    logger.error('Initialization failed', { error: err.message });
    console.error(`❌ Initialization failed: ${err.message}`);
    process.exit(1);
  }
}

export const initCommand = new Command('init')
  .description('Initialize cc-track in the current project')
  .option('-f, --force', 'overwrite existing files')
  .option('--no-backup', 'skip backing up existing files')
  .option('--with-stop', 'enable stop review hook')
  .action(initAction);
