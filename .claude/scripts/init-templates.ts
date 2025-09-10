#!/usr/bin/env bun

import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const TEMPLATES_DIR = join(__dirname, '..', 'templates');
const PROJECT_ROOT = process.cwd();
const CLAUDE_DIR = join(PROJECT_ROOT, '.claude');

// Template files to copy
const TEMPLATE_FILES = [
  'active_task.md',
  'no_active_task.md',
  'product_context.md',
  'system_patterns.md',
  'decision_log.md',
  'progress_log.md',
  'code_index.md',
  'learned_mistakes.md',
  'user_context.md',
  'CLAUDE.md',
  'settings.json',
  'statusline.sh'
];

function ensureDirectoryExists(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function copyTemplate(templateName: string, targetPath?: string) {
  const sourcePath = join(TEMPLATES_DIR, templateName);
  const destPath = targetPath || join(CLAUDE_DIR, templateName);
  
  if (!existsSync(sourcePath)) {
    console.error(`Template not found: ${sourcePath}`);
    return false;
  }

  // Don't overwrite existing files unless they're empty
  if (existsSync(destPath)) {
    const content = readFileSync(destPath, 'utf-8');
    if (content.trim().length > 0) {
      console.log(`Skipping ${templateName} - file already exists with content`);
      return false;
    }
  }

  copyFileSync(sourcePath, destPath);
  console.log(`✓ Created ${destPath.replace(PROJECT_ROOT, '.')}`);
  
  // Make statusline.sh executable
  if (templateName === 'statusline.sh') {
    const fs = require('fs');
    fs.chmodSync(destPath, '755');
  }
  
  return true;
}

function updateClaudeMd() {
  const claudeMdPath = join(PROJECT_ROOT, 'CLAUDE.md');
  const templatePath = join(TEMPLATES_DIR, 'CLAUDE.md');
  
  if (existsSync(claudeMdPath)) {
    // Check if it already has cc-pars imports
    const content = readFileSync(claudeMdPath, 'utf-8');
    if (content.includes('@.claude/product_context.md')) {
      console.log('CLAUDE.md already has cc-pars imports');
      return;
    }
    
    // Backup existing CLAUDE.md
    const backupPath = join(PROJECT_ROOT, 'CLAUDE.md.backup');
    copyFileSync(claudeMdPath, backupPath);
    console.log(`✓ Backed up existing CLAUDE.md to CLAUDE.md.backup`);
    
    // Prepend cc-pars imports to existing content
    const templateContent = readFileSync(templatePath, 'utf-8');
    const ccParsSection = templateContent.split('---')[0] + '---\n\n';
    const updatedContent = ccParsSection + content;
    
    writeFileSync(claudeMdPath, updatedContent);
    console.log('✓ Updated CLAUDE.md with cc-pars imports');
  } else {
    // Create new CLAUDE.md from template
    copyTemplate('CLAUDE.md', claudeMdPath);
  }
}

function createNoActiveTask() {
  // Always start with no_active_task.md as the default
  const noTaskPath = join(CLAUDE_DIR, 'no_active_task.md');
  if (!existsSync(noTaskPath)) {
    copyTemplate('no_active_task.md', noTaskPath);
  }
}

function main() {
  console.log('Initializing cc-pars context management system...\n');
  
  // Ensure .claude directory exists
  ensureDirectoryExists(CLAUDE_DIR);
  ensureDirectoryExists(join(CLAUDE_DIR, 'hooks'));
  ensureDirectoryExists(join(CLAUDE_DIR, 'plans'));
  ensureDirectoryExists(join(CLAUDE_DIR, 'utils'));
  
  // Copy template files
  console.log('Creating context files:');
  for (const file of TEMPLATE_FILES) {
    if (file === 'CLAUDE.md') {
      continue; // Handle separately
    }
    if (file === 'active_task.md') {
      continue; // Don't create active_task by default
    }
    copyTemplate(file);
  }
  
  // Create no_active_task.md (not active_task.md)
  createNoActiveTask();
  
  // Handle CLAUDE.md specially
  updateClaudeMd();
  
  console.log('\n✅ cc-pars initialization complete!');
  console.log('\nNext steps:');
  console.log('1. Review and populate .claude/product_context.md');
  console.log('2. Document patterns in .claude/system_patterns.md');
  console.log('3. Review journal entries to populate .claude/user_context.md');
  console.log('   - Use: mcp__private-journal__search_journal with "user preferences working style"');
  console.log('4. The system will automatically track tasks and decisions');
  console.log('5. Use Shift+Tab twice to enter planning mode for complex tasks');
}

// Run the script
main();