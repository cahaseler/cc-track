import type { execSync } from 'node:child_process';
import type { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import type { isWipCommit } from '../lib/git-helpers';
import type { createLogger } from '../lib/logger';
import type { CommandDeps, CommandResult, PartialCommandDeps } from './context';
import { applyCommandResult, handleCommandException, resolveCommandDeps } from './context';

export interface GitSessionDeps {
  execSync: typeof execSync;
  existsSync: typeof existsSync;
  readFileSync: typeof readFileSync;
  cwd: () => string;
  logger: ReturnType<typeof createLogger>;
  isWipCommit: typeof isWipCommit;
}

interface SquashData {
  baseCommit: string;
  wipMessages: string[];
}

interface PreparePushData {
  lintRan: boolean;
  testsRan: boolean;
}

function mapGitSessionDeps(deps: CommandDeps): GitSessionDeps {
  return {
    execSync: deps.childProcess.execSync,
    existsSync: deps.fs.existsSync,
    readFileSync: deps.fs.readFileSync,
    cwd: () => deps.process.cwd(),
    logger: deps.logger('git-session-command'),
    isWipCommit: deps.git.isWipCommit,
  };
}

function getLastUserCommit(deps: GitSessionDeps): string {
  try {
    const commits = deps
      .execSync('git log --oneline -20', { encoding: 'utf-8' })
      .split('\n')
      .filter((line) => line.trim());

    for (const commit of commits) {
      if (!deps.isWipCommit(commit)) {
        return commit.split(' ')[0];
      }
    }
    return 'HEAD';
  } catch {
    return 'HEAD';
  }
}

function getWipCommits(deps: GitSessionDeps): string[] {
  try {
    const commits = deps
      .execSync('git log --oneline', { encoding: 'utf-8' })
      .split('\n')
      .filter((line) => deps.isWipCommit(line))
      .map((line) => line.split(' ')[0]);

    return commits;
  } catch {
    return [];
  }
}

function detectPackageManager(deps: GitSessionDeps, projectRoot: string): string {
  if (deps.existsSync(join(projectRoot, 'bun.lockb'))) {
    return 'bun run';
  }
  if (deps.existsSync(join(projectRoot, 'yarn.lock'))) {
    return 'yarn run';
  }
  if (deps.existsSync(join(projectRoot, 'pnpm-lock.yaml'))) {
    return 'pnpm run';
  }
  return 'npm run';
}

export function showRevert(deps: GitSessionDeps): CommandResult<{ lastCommit: string }> {
  const lastUserCommit = getLastUserCommit(deps);
  return {
    success: true,
    messages: [
      `To revert to last user commit (${lastUserCommit}), run:`,
      `  git reset --hard ${lastUserCommit}`,
      '\n⚠️  This will discard all uncommitted changes!',
      'Review changes first with: git diff HEAD',
    ],
    data: { lastCommit: lastUserCommit },
  };
}

export function showWip(deps: GitSessionDeps): CommandResult<{ commits: string[]; details: string[] }> {
  const commits = getWipCommits(deps);
  if (commits.length === 0) {
    return {
      success: true,
      messages: ['No WIP commits found'],
      data: { commits: [], details: [] },
    };
  }

  const details: string[] = [];
  for (const hash of commits) {
    try {
      const output = deps.execSync(`git log --oneline -1 ${hash}`, { encoding: 'utf-8' }).trim();
      details.push(output);
    } catch {
      details.push(`Unable to display commit ${hash}`);
    }
  }

  return {
    success: true,
    messages: [`Found ${commits.length} WIP commits:`, ...details],
    data: { commits, details },
  };
}

export function diffSession(deps: GitSessionDeps): CommandResult<{ baseCommit: string; diff?: string }> {
  const base = getLastUserCommit(deps);
  try {
    const diff = deps.execSync(`git diff ${base}..HEAD`, { encoding: 'utf-8' }).trim();
    return {
      success: true,
      messages: [`Changes since ${base}:`, diff || 'No changes found'],
      data: { baseCommit: base, diff },
    };
  } catch {
    return {
      success: true,
      messages: [`Changes since ${base}:`, 'No changes found'],
      data: { baseCommit: base },
    };
  }
}

function extractWipMessages(output: string, deps: GitSessionDeps): string[] {
  return output
    .split('\n')
    .filter((line) => deps.isWipCommit(line))
    .map((line) => line.replace(/^[a-f0-9]+ (\[wip\] |wip: )/i, '- '));
}

export function squashSession(message: string | undefined, deps: GitSessionDeps): CommandResult<SquashData> {
  const projectRoot = deps.cwd();
  const baseCommit = getLastUserCommit(deps);

  const wipLogOutput = deps.execSync(`git log --oneline ${baseCommit}..HEAD`, { encoding: 'utf-8' });
  const wipMessages = extractWipMessages(wipLogOutput, deps);

  const messages: string[] = [`\nSquashing WIP commits since ${baseCommit}\n`];
  if (wipMessages.length > 0) {
    messages.push('Work included:');
    messages.push(...wipMessages);
  }

  if (!message) {
    return {
      success: false,
      error: 'Commit message required',
      exitCode: 1,
      messages,
      data: { baseCommit, wipMessages },
    };
  }

  try {
    deps.execSync(`git reset --soft ${baseCommit}`, { cwd: projectRoot, encoding: 'utf-8' });
    deps.execSync(`git commit -m "${message}"`, { cwd: projectRoot, encoding: 'utf-8' });
    messages.push(`\n✅ Squashed with message: ${message}`);
    return {
      success: true,
      messages,
      data: { baseCommit, wipMessages },
    };
  } catch (error) {
    deps.logger.error('Squash failed', {
      error: error instanceof Error ? error.message : String(error),
      baseCommit,
      message,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Squash failed',
      exitCode: 1,
      messages,
      data: { baseCommit, wipMessages },
    };
  }
}

export function preparePush(message: string | undefined, deps: GitSessionDeps): CommandResult<PreparePushData> {
  const projectRoot = deps.cwd();
  const messages: string[] = ['Preparing for push...'];
  const warnings: string[] = [];

  if (!message) {
    return {
      success: false,
      error: 'Commit message required for prepare-push',
      exitCode: 1,
    };
  }

  const squashResult = squashSession(message, deps);
  if (!squashResult.success) {
    return {
      success: false,
      error: squashResult.error,
      exitCode: squashResult.exitCode,
      messages: squashResult.messages,
      warnings: squashResult.warnings,
      details: squashResult.details,
    };
  }
  messages.push(...(squashResult.messages ?? []));

  let lintRan = false;
  let testsRan = false;

  const packageJsonPath = join(projectRoot, 'package.json');
  if (deps.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(deps.readFileSync(packageJsonPath, 'utf-8')) as {
        scripts?: Record<string, string>;
      };
      const runCommand = detectPackageManager(deps, projectRoot);

      if (packageJson.scripts?.lint) {
        messages.push('\n2. Running lint...');
        lintRan = true;
        try {
          const output = deps.execSync(`${runCommand} lint`, { cwd: projectRoot, encoding: 'utf-8' }).trim();
          if (output) {
            messages.push(output);
          }
        } catch (error) {
          warnings.push('⚠️ Lint failed - fix before pushing');
          deps.logger.warn('Lint command failed during prepare-push', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (packageJson.scripts?.test) {
        messages.push('\n3. Running tests...');
        testsRan = true;
        try {
          const output = deps.execSync(`${runCommand} test`, { cwd: projectRoot, encoding: 'utf-8' }).trim();
          if (output) {
            messages.push(output);
          }
        } catch (error) {
          warnings.push('⚠️ Tests failed - fix before pushing');
          deps.logger.warn('Test command failed during prepare-push', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      warnings.push('⚠️ Failed to read package.json scripts');
      deps.logger.warn('Unable to parse package.json during prepare-push', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  messages.push('\n✅ Ready to push! Use: git push origin <branch>');

  return {
    success: true,
    messages,
    warnings,
    data: { lintRan, testsRan },
  };
}

export function createGitSessionCommand(overrides?: PartialCommandDeps): Command {
  const command = new Command('git-session').description('Git session management utilities');

  command
    .command('show-revert')
    .description('Display command to revert to last non-WIP commit')
    .action(async () => {
      const deps = resolveCommandDeps(overrides);
      try {
        const result = showRevert(mapGitSessionDeps(deps));
        applyCommandResult(result, deps);
      } catch (error) {
        handleCommandException(error, deps);
      }
    });

  command
    .command('squash')
    .description('Squash all WIP commits into one')
    .argument('<message>', 'commit message for squashed commit')
    .action(async (message: string) => {
      const deps = resolveCommandDeps(overrides);
      try {
        const result = squashSession(message, mapGitSessionDeps(deps));
        applyCommandResult(result, deps);
      } catch (error) {
        handleCommandException(error, deps);
      }
    });

  command
    .command('show-wip')
    .description('Show all WIP commits')
    .action(async () => {
      const deps = resolveCommandDeps(overrides);
      try {
        const result = showWip(mapGitSessionDeps(deps));
        applyCommandResult(result, deps);
      } catch (error) {
        handleCommandException(error, deps);
      }
    });

  command
    .command('diff')
    .description('Show all changes since last user commit')
    .action(async () => {
      const deps = resolveCommandDeps(overrides);
      try {
        const result = diffSession(mapGitSessionDeps(deps));
        applyCommandResult(result, deps);
      } catch (error) {
        handleCommandException(error, deps);
      }
    });

  command
    .command('prepare-push')
    .description('Squash WIPs and run quality checks')
    .argument('<message>', 'commit message for squashed commit')
    .action(async (message: string) => {
      const deps = resolveCommandDeps(overrides);
      try {
        const result = preparePush(message, mapGitSessionDeps(deps));
        applyCommandResult(result, deps);
      } catch (error) {
        handleCommandException(error, deps);
      }
    });

  return command;
}

export const gitSessionCommand = createGitSessionCommand();
