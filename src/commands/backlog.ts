import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../lib/logger';

const logger = createLogger('backlog-command');

/**
 * Add items to the backlog
 */
export const backlogCommand = new Command('backlog')
  .description('Add items to the project backlog')
  .argument('[items...]', 'items to add to backlog')
  .option('-l, --list', 'list current backlog items')
  .option('-f, --file <path>', 'backlog file path (default: .claude/backlog.md)')
  .action(async (items: string[], options) => {
    try {
      const projectRoot = process.cwd();
      const backlogPath = options.file || join(projectRoot, '.claude/backlog.md');
      
      // List mode
      if (options.list) {
        if (!existsSync(backlogPath)) {
          console.log('No backlog file found. Create one with: cc-track backlog "your first item"');
          return;
        }
        
        const content = readFileSync(backlogPath, 'utf-8');
        console.log(content);
        return;
      }
      
      // Check if items provided
      if (!items || items.length === 0) {
        console.error('No items provided. Usage: cc-track backlog "item 1" "item 2"');
        process.exit(1);
      }
      
      // Ensure backlog file exists
      if (!existsSync(backlogPath)) {
        const template = `# Backlog

**Purpose:** Capture ideas, improvements, and future work items without disrupting current tasks.

**Instructions:**
- Items are added with timestamps for tracking
- Review periodically to convert to tasks
- Group by category when list grows large

---

## Items

`;
        writeFileSync(backlogPath, template);
        logger.info('Created backlog file', { path: backlogPath });
      }
      
      // Format items with timestamp
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const formattedItems = items.map(item => `- [${timestamp}] ${item}`).join('\n');
      
      // Append to backlog
      appendFileSync(backlogPath, formattedItems + '\n');
      
      logger.info('Added items to backlog', { count: items.length });
      console.log(`✅ Added ${items.length} item(s) to backlog`);
      
      // Show the items that were added
      items.forEach(item => {
        console.log(`  - ${item}`);
      });
      
    } catch (error) {
      logger.error('Failed to update backlog', { error });
      console.error('❌ Failed to update backlog:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });