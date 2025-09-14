import { Command } from 'commander';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const setupTemplatesCommand = new Command('setup-templates')
  .description('Copy cc-track templates to your project')
  .action(() => {
    // Get the directory where this compiled binary is located
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // For compiled binary, templates are in the cc-track package root
    // When installed via npm, they'll be in node_modules/cc-track/templates
    // For local testing, they're in the project root
    let templatesDir: string;

    // Check if we're in a compiled binary (dist/) or npm package
    if (__dirname.includes('/dist')) {
      // Local development: go up from dist/ to project root
      const projectRoot = join(__dirname, '..');
      templatesDir = join(projectRoot, 'templates');
    } else if (__dirname.includes('node_modules/cc-track')) {
      // npm installation: templates are in the package
      const packageRoot = __dirname.split('node_modules/cc-track')[0] + 'node_modules/cc-track';
      templatesDir = join(packageRoot, 'templates');
    } else {
      // Fallback: assume templates are relative to binary
      templatesDir = join(__dirname, 'templates');
    }

    // Target directory is .claude in current working directory
    const targetDir = join(process.cwd(), '.claude');

    // Create .claude directory if it doesn't exist
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // List of templates to copy
    const templates = [
      'active_task.md',
      'product_context.md',
      'system_patterns.md',
      'decision_log.md',
      'progress_log.md',
      'code_index.md',
      'no_active_task.md',
      'learned_mistakes.md',
      'user_context.md',
      'settings.json'
    ];

    let copiedCount = 0;
    let skippedCount = 0;

    for (const template of templates) {
      const sourcePath = join(templatesDir, template);
      const targetPath = join(targetDir, template);

      if (!existsSync(sourcePath)) {
        console.log(`⚠️  Template ${template} not found in package. Skipping.`);
        continue;
      }

      if (existsSync(targetPath)) {
        // If file exists, create a backup
        const backupPath = `${targetPath}.backup-${Date.now()}`;
        copyFileSync(targetPath, backupPath);
        console.log(`📦 Backed up existing ${template} to ${backupPath}`);
      }

      copyFileSync(sourcePath, targetPath);
      copiedCount++;
      console.log(`✅ Copied ${template}`);
    }

    // Special handling for CLAUDE.md - need to merge if it exists
    const claudeMdSource = join(templatesDir, 'CLAUDE.md');
    const claudeMdTarget = join(targetDir, '..', 'CLAUDE.md');

    if (existsSync(claudeMdSource)) {
      if (existsSync(claudeMdTarget)) {
        // Create backup
        const backupPath = `${claudeMdTarget}.backup-${Date.now()}`;
        copyFileSync(claudeMdTarget, backupPath);
        console.log(`📦 Backed up existing CLAUDE.md to ${backupPath}`);

        // Read existing content
        const existingContent = readFileSync(claudeMdTarget, 'utf-8');
        const templateContent = readFileSync(claudeMdSource, 'utf-8');

        // If the existing file doesn't have cc-track imports, add them
        if (!existingContent.includes('## Active Task')) {
          console.log('📝 Updating CLAUDE.md with cc-track imports...');

          // Merge by adding cc-track sections if not present
          let mergedContent = existingContent + '\n\n# cc-track Context Management\n\n' + templateContent;
          writeFileSync(claudeMdTarget, mergedContent);
          console.log('✅ Updated CLAUDE.md');
        } else {
          console.log('ℹ️  CLAUDE.md already has cc-track sections');
          skippedCount++;
        }
      } else {
        copyFileSync(claudeMdSource, claudeMdTarget);
        console.log('✅ Created CLAUDE.md');
        copiedCount++;
      }
    }

    console.log(`\n📊 Setup complete: ${copiedCount} files copied, ${skippedCount} skipped`);
    console.log('📝 Templates are ready for Claude to configure!');
  });