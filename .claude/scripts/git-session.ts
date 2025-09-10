#!/usr/bin/env bun

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const command = process.argv[2];
const projectRoot = process.cwd();

function getLastUserCommit(): string {
  try {
    // Find the last commit that's NOT a [wip] commit
    const commits = execSync('git log --oneline -20', { encoding: 'utf-8' })
      .split('\n')
      .filter(line => line.trim());
    
    for (const commit of commits) {
      if (!commit.includes('[wip]')) {
        return commit.split(' ')[0];
      }
    }
    return 'HEAD';
  } catch {
    return 'HEAD';
  }
}

function getWipCommits(): string[] {
  try {
    const commits = execSync('git log --oneline', { encoding: 'utf-8' })
      .split('\n')
      .filter(line => line.includes('[wip]'))
      .map(line => line.split(' ')[0]);
    
    return commits;
  } catch {
    return [];
  }
}

function getCurrentTaskId(): string {
  const claudeMdPath = join(projectRoot, 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) return 'UNKNOWN';
  
  const content = readFileSync(claudeMdPath, 'utf-8');
  const match = content.match(/TASK_(\d+)/);
  return match ? `TASK_${match[1]}` : 'UNKNOWN';
}

switch (command) {
  case 'show-revert-command':
    // Show the command to revert but don't execute
    const lastUserCommit = getLastUserCommit();
    console.log(`To revert to last user commit (${lastUserCommit}), run:`);
    console.log(`  git reset --hard ${lastUserCommit}`);
    console.log('\n⚠️  This will discard all uncommitted changes!');
    console.log('Review changes first with: git diff HEAD');
    break;
    
  case 'squash-session':
    // Squash all WIP commits since last user commit
    const baseCommit = getLastUserCommit();
    const taskId = getCurrentTaskId();
    
    // Get a list of what was done from the WIP commits
    const wipMessages = execSync(`git log --oneline ${baseCommit}..HEAD`, { encoding: 'utf-8' })
      .split('\n')
      .filter(line => line.includes('[wip]'))
      .map(line => line.replace(/^[a-f0-9]+ \[wip\] /, '- '))
      .join('\n');
    
    console.log(`\nSquashing WIP commits since ${baseCommit}\n`);
    if (wipMessages) {
      console.log('Work included:');
      console.log(wipMessages);
    }
    
    // Check if a message was provided as argument
    const providedMessage = process.argv[3];
    
    if (!providedMessage) {
      // Fail immediately - this tool is for non-interactive use
      console.error('❌ ERROR: Commit message required');
      console.error(`\nUsage: bun run scripts/git-session.ts squash-session "<commit message>"`);
      console.error(`Example: bun run scripts/git-session.ts squash-session "${taskId}: Implement feature X"`);
      if (wipMessages) {
        console.error('\nWork to be squashed:');
        console.error(wipMessages);
      }
      process.exit(1);
    }
    
    // Squash with provided message
    try {
      execSync(`git reset --soft ${baseCommit}`);
      execSync(`git commit -m "${providedMessage}"`);
      console.log(`\n✅ Squashed with message: ${providedMessage}`);
    } catch (e) {
      console.error('❌ Squash failed:', e);
      process.exit(1);
    }
    break;
    
  case 'show-wip':
    // Show all WIP commits
    const wipCommits = getWipCommits();
    if (wipCommits.length === 0) {
      console.log('No WIP commits found');
    } else {
      console.log(`Found ${wipCommits.length} WIP commits:`);
      execSync('git log --oneline | grep "\\[wip\\]"', { stdio: 'inherit' });
    }
    break;
    
  case 'diff-session':
    // Show all changes since last user commit
    const base = getLastUserCommit();
    console.log(`Changes since ${base}:`);
    try {
      execSync(`git diff ${base}..HEAD`, { stdio: 'inherit' });
    } catch {
      console.log('No changes found');
    }
    break;
    
  case 'prepare-push':
    // Prepare for pushing: squash WIPs and run checks
    console.log('Preparing for push...');
    
    // Get commit message from argument if provided
    const commitMsg = process.argv[3];
    
    // 1. Squash WIP commits
    console.log('\n1. Squashing WIP commits...');
    if (!commitMsg) {
      console.error('❌ ERROR: Commit message required for prepare-push');
      console.error('\nUsage: bun run scripts/git-session.ts prepare-push "<commit message>"');
      console.error('Example: bun run scripts/git-session.ts prepare-push "TASK_XXX: Implement feature Y"');
      process.exit(1);
    }
    
    execSync(`bun run ${__filename} squash-session "${commitMsg}"`, { stdio: 'inherit' });
    
    // 2. Run lint if available
    if (existsSync(join(projectRoot, 'package.json'))) {
      const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
      if (pkg.scripts?.lint) {
        console.log('\n2. Running lint...');
        try {
          execSync('npm run lint', { stdio: 'inherit' });
        } catch {
          console.error('⚠️ Lint failed - fix before pushing');
        }
      }
      
      // 3. Run tests if available
      if (pkg.scripts?.test) {
        console.log('\n3. Running tests...');
        try {
          execSync('npm test', { stdio: 'inherit' });
        } catch {
          console.error('⚠️ Tests failed - fix before pushing');
        }
      }
    }
    
    console.log('\n✅ Ready to push! Use: git push origin <branch>');
    break;
    
  default:
    console.log(`
Git Session Management Utilities

Usage: bun run scripts/git-session.ts <command>

Commands:
  show-revert-command - Display command to revert to last non-WIP commit
  squash-session      - Squash all WIP commits into one
  show-wip            - Show all WIP commits
  diff-session        - Show all changes since last user commit  
  prepare-push        - Squash WIPs and run quality checks

Examples:
  # See how to undo AI work from current session
  bun run scripts/git-session.ts show-revert-command
  
  # Prepare clean commits for sharing
  bun run scripts/git-session.ts prepare-push
`);
}