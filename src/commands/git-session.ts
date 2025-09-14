import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { isWipCommit } from '../lib/git-helpers';
import { createLogger } from '../lib/logger';

const logger = createLogger('git-session-command');

/**
 * Get the last commit that's NOT a WIP commit
 */
function getLastUserCommit(): string {
  try {
    const commits = execSync('git log --oneline -20', { encoding: 'utf-8' })
      .split('\n')
      .filter((line) => line.trim());

    for (const commit of commits) {
      if (!isWipCommit(commit)) {
        return commit.split(' ')[0];
      }
    }
    return 'HEAD';
  } catch {
    return 'HEAD';
  }
}

/**
 * Get list of WIP commit hashes
 */
function getWipCommits(): string[] {
  try {
    const commits = execSync('git log --oneline', { encoding: 'utf-8' })
      .split('\n')
      .filter((line) => isWipCommit(line))
      .map((line) => line.split(' ')[0]);

    return commits;
  } catch {
    return [];
  }
}

/**
 * Get current task ID from CLAUDE.md
 */
function getCurrentTaskId(): string {
  const projectRoot = process.cwd();
  const claudeMdPath = join(projectRoot, 'CLAUDE.md');

  if (!existsSync(claudeMdPath)) return 'UNKNOWN';

  const content = readFileSync(claudeMdPath, 'utf-8');
  const match = content.match(/TASK_(\d+)/);
  return match ? `TASK_${match[1]}` : 'UNKNOWN';
}

/**
 * Show revert command - display how to revert to last non-WIP commit
 */
function showRevertCommand() {
  const lastUserCommit = getLastUserCommit();
  console.log(`To revert to last user commit (${lastUserCommit}), run:`);
  console.log(`  git reset --hard ${lastUserCommit}`);
  console.log('\n⚠️  This will discard all uncommitted changes!');
  console.log('Review changes first with: git diff HEAD');
}

/**
 * Squash all WIP commits since last user commit
 */
function squashSession(message?: string) {
  const projectRoot = process.cwd();
  const baseCommit = getLastUserCommit();
  const taskId = getCurrentTaskId();

  // Get a list of what was done from the WIP commits
  const wipMessages = execSync(`git log --oneline ${baseCommit}..HEAD`, { encoding: 'utf-8' })
    .split('\n')
    .filter((line) => isWipCommit(line))
    .map((line) => line.replace(/^[a-f0-9]+ (\[wip\] |wip: )/, '- '))
    .join('\n');

  console.log(`\nSquashing WIP commits since ${baseCommit}\n`);
  if (wipMessages) {
    console.log('Work included:');
    console.log(wipMessages);
  }

  if (!message) {
    // Show what would be squashed and exit
    console.error('❌ ERROR: Commit message required');
    console.error(`\nUsage: cc-track git-session squash "<commit message>"`);
    console.error(`Example: cc-track git-session squash "${taskId}: Implement feature X"`);
    if (wipMessages) {
      console.error('\nWork to be squashed:');
      console.error(wipMessages);
    }
    process.exit(1);
  }

  // Squash with provided message
  try {
    execSync(`git reset --soft ${baseCommit}`, { cwd: projectRoot });
    execSync(`git commit -m "${message}"`, { cwd: projectRoot });
    console.log(`\n✅ Squashed with message: ${message}`);
  } catch (error) {
    const err = error as Error;
    console.error('❌ Squash failed:', err.message);
    logger.error('Squash failed', { error: err.message, baseCommit, message });
    process.exit(1);
  }
}

/**
 * Show all WIP commits
 */
function showWip() {
  const wipCommits = getWipCommits();
  if (wipCommits.length === 0) {
    console.log('No WIP commits found');
  } else {
    console.log(`Found ${wipCommits.length} WIP commits:`);
    try {
      // Display each WIP commit using its hash for consistency
      for (const hash of wipCommits) {
        execSync(`git log --oneline -1 ${hash}`, { stdio: 'inherit' });
      }
    } catch {
      console.log('Error displaying WIP commits');
    }
  }
}

/**
 * Show all changes since last user commit
 */
function diffSession() {
  const base = getLastUserCommit();
  console.log(`Changes since ${base}:`);
  try {
    execSync(`git diff ${base}..HEAD`, { stdio: 'inherit' });
  } catch {
    console.log('No changes found');
  }
}

/**
 * Detect the package manager being used in the project
 */
function detectPackageManager(projectRoot: string): string {
  if (existsSync(join(projectRoot, 'bun.lockb'))) {
    return 'bun run';
  }
  if (existsSync(join(projectRoot, 'yarn.lock'))) {
    return 'yarn run';
  }
  if (existsSync(join(projectRoot, 'pnpm-lock.yaml'))) {
    return 'pnpm run';
  }
  return 'npm run';
}

/**
 * Prepare for pushing: squash WIPs and run checks
 */
function preparePush(message?: string) {
  const projectRoot = process.cwd();

  if (!message) {
    console.error('❌ ERROR: Commit message required for prepare-push');
    console.error('\nUsage: cc-track git-session prepare-push "<commit message>"');
    console.error('Example: cc-track git-session prepare-push "TASK_XXX: Implement feature Y"');
    process.exit(1);
  }

  console.log('Preparing for push...');

  // 1. Squash WIP commits
  console.log('\n1. Squashing WIP commits...');
  squashSession(message);

  // 2. Run lint if available
  if (existsSync(join(projectRoot, 'package.json'))) {
    const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
    const runCommand = detectPackageManager(projectRoot);

    if (pkg.scripts?.lint) {
      console.log('\n2. Running lint...');
      try {
        execSync(`${runCommand} lint`, { stdio: 'inherit', cwd: projectRoot });
      } catch {
        console.error('⚠️ Lint failed - fix before pushing');
      }
    }

    // 3. Run tests if available
    if (pkg.scripts?.test) {
      console.log('\n3. Running tests...');
      try {
        execSync(`${runCommand} test`, { stdio: 'inherit', cwd: projectRoot });
      } catch {
        console.error('⚠️ Tests failed - fix before pushing');
      }
    }
  }

  console.log('\n✅ Ready to push! Use: git push origin <branch>');
}

// Create the main git-session command
export const gitSessionCommand = new Command('git-session')
  .description('Git session management utilities')
  .addCommand(
    new Command('show-revert').description('Display command to revert to last non-WIP commit').action(() => {
      logger.info('Showing revert command');
      showRevertCommand();
    }),
  )
  .addCommand(
    new Command('squash')
      .description('Squash all WIP commits into one')
      .argument('<message>', 'commit message for squashed commit')
      .action((message: string) => {
        logger.info('Squashing session', { message });
        squashSession(message);
      }),
  )
  .addCommand(
    new Command('show-wip').description('Show all WIP commits').action(() => {
      logger.info('Showing WIP commits');
      showWip();
    }),
  )
  .addCommand(
    new Command('diff').description('Show all changes since last user commit').action(() => {
      logger.info('Showing session diff');
      diffSession();
    }),
  )
  .addCommand(
    new Command('prepare-push')
      .description('Squash WIPs and run quality checks')
      .argument('<message>', 'commit message for squashed commit')
      .action((message: string) => {
        logger.info('Preparing for push', { message });
        preparePush(message);
      }),
  );
