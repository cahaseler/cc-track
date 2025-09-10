#!/usr/bin/env bun

import { appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Get the backlog file path
const backlogFile = join(process.cwd(), '.claude', 'backlog.md');

// Get all arguments passed to the script
const args = process.argv.slice(2);
const item = args.join(' ').trim();

// Check if an item was provided
if (!item) {
  console.log('❌ No item provided. Please specify what to add to the backlog.');
  console.log('');
  console.log("Please tell me what you'd like to add to the backlog, then I'll add it and return to the current task.");
  process.exit(0);
}

// Add the item with current date
const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
const backlogEntry = `- [${date}] ${item}\n`;

try {
  // Ensure the file exists
  if (!existsSync(backlogFile)) {
    console.error('❌ Backlog file not found at', backlogFile);
    process.exit(1);
  }

  // Append to the backlog
  appendFileSync(backlogFile, backlogEntry);

  // Confirm addition
  console.log(`✅ Added to backlog: ${item}`);
  process.exit(0);
} catch (error) {
  console.error('❌ Failed to add to backlog:', error);
  process.exit(1);
}
