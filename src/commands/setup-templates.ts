import { Command } from 'commander';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { embeddedTemplates } from '../lib/embedded-resources';

export const setupTemplatesCommand = new Command('setup-templates')
  .description('Copy cc-track templates to your project')
  .action(() => {
    // Target directory is .claude in current working directory
    const targetDir = join(process.cwd(), '.claude');

    // Create .claude directory if it doesn't exist
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    let copiedCount = 0;
    let skippedCount = 0;

    // Write each embedded template to the target directory
    for (const [filename, content] of Object.entries(embeddedTemplates)) {
      // Skip CLAUDE.md as it needs special handling
      if (filename === 'CLAUDE.md') continue;

      const targetPath = join(targetDir, filename);

      if (existsSync(targetPath)) {
        // If file exists, create a backup
        const backupPath = `${targetPath}.backup-${Date.now()}`;
        copyFileSync(targetPath, backupPath);
        console.log(`📦 Backed up existing ${filename}`);
      }

      writeFileSync(targetPath, content);
      copiedCount++;
      console.log(`✅ Created ${filename}`);
    }

    // Special handling for CLAUDE.md - need to merge if it exists
    const claudeMdTarget = join(process.cwd(), 'CLAUDE.md');
    const claudeMdContent = embeddedTemplates['CLAUDE.md'];

    if (claudeMdContent) {
      if (existsSync(claudeMdTarget)) {
        // Create backup
        const backupPath = `${claudeMdTarget}.backup-${Date.now()}`;
        copyFileSync(claudeMdTarget, backupPath);
        console.log(`📦 Backed up existing CLAUDE.md`);

        // Read existing content
        const existingContent = readFileSync(claudeMdTarget, 'utf-8');

        // If the existing file doesn't have cc-track imports, add them
        if (!existingContent.includes('## Active Task')) {
          console.log('📝 Updating CLAUDE.md with cc-track imports...');

          // Merge by adding cc-track sections if not present
          const mergedContent = existingContent + '\n\n# cc-track Context Management\n\n' + claudeMdContent;
          writeFileSync(claudeMdTarget, mergedContent);
          console.log('✅ Updated CLAUDE.md');
        } else {
          console.log('ℹ️  CLAUDE.md already has cc-track sections');
          skippedCount++;
        }
      } else {
        writeFileSync(claudeMdTarget, claudeMdContent);
        console.log('✅ Created CLAUDE.md');
        copiedCount++;
      }
    }

    console.log(`\n📊 Setup complete: ${copiedCount} files created, ${skippedCount} skipped`);
    console.log('📝 Templates are ready for Claude to configure!');
  });