import { describe, expect, mock, test } from 'bun:test';
import type { createLogger } from '../lib/logger';
import {
  createGitSessionCommand,
  diffSession,
  type GitSessionDeps,
  gitSessionCommand,
  preparePush,
  showRevert,
  showWip,
  squashSession,
} from './git-session';

interface ExecCall {
  command: string;
  options?: Record<string, unknown>;
}

interface MockGitSessionDeps extends GitSessionDeps {
  execCalls: ExecCall[];
}

function createMockDeps(overrides: Partial<GitSessionDeps> = {}): MockGitSessionDeps {
  const execCalls: ExecCall[] = [];
  const exec = mock((command: string, options?: Record<string, unknown>) => {
    execCalls.push({ command, options });
    if (command === 'git log --oneline -20') {
      return 'abc123 Initial commit\ndef456 WIP: work in progress';
    }
    if (command.startsWith('git log --oneline abc123..HEAD')) {
      return 'def456 WIP: work in progress';
    }
    if (command === 'git log --oneline') {
      return 'def456 WIP: work in progress';
    }
    if (command.startsWith('git log --oneline -1 def456')) {
      return 'def456 WIP: work in progress';
    }
    if (command.startsWith('git diff')) {
      return 'diff output';
    }
    if (command.startsWith('git reset')) {
      return '';
    }
    if (command.startsWith('git commit')) {
      return '';
    }
    if (command.includes('lint')) {
      return 'lint ok';
    }
    if (command.includes('test')) {
      return 'tests ok';
    }
    return '';
  });

  const logger: ReturnType<typeof createLogger> =
    overrides.logger ??
    ({
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      exception: () => {},
    } as ReturnType<typeof createLogger>);

  const deps: GitSessionDeps = {
    execSync: overrides.execSync ?? exec,
    existsSync: overrides.existsSync ?? mock(() => false),
    readFileSync: overrides.readFileSync ?? mock(() => ''),
    cwd: overrides.cwd ?? (() => '/project'),
    logger,
    isWipCommit: overrides.isWipCommit ?? ((line: string) => /wip/i.test(line)),
  };

  return Object.assign(deps, { execCalls }) as MockGitSessionDeps;
}

describe('git-session command metadata', () => {
  test('createGitSessionCommand builds expected structure', () => {
    const command = createGitSessionCommand();
    expect(command.name()).toBe('git-session');
    const subcommands = command.commands.map((cmd) => cmd.name());
    expect(subcommands).toEqual(['show-revert', 'squash', 'show-wip', 'diff', 'prepare-push']);
  });

  test('exported gitSessionCommand is configured', () => {
    expect(gitSessionCommand.name()).toBe('git-session');
  });
});

describe('git-session helpers', () => {
  test('showRevert returns instructions', () => {
    const deps = createMockDeps();
    const result = showRevert(deps);
    expect(result.success).toBeTrue();
    expect(result.messages?.some((msg) => msg.includes('git reset --hard'))).toBeTrue();
    expect(result.data?.lastCommit).toBeDefined();
  });

  test('showWip reports when no commits', () => {
    const deps = createMockDeps({
      execSync: mock(() => 'abc123 Initial commit'),
    });
    const result = showWip(deps);
    expect(result.success).toBeTrue();
    expect(result.messages).toEqual(['No WIP commits found']);
    expect(result.data?.commits).toEqual([]);
  });

  test('showWip lists WIP commits with details', () => {
    const deps = createMockDeps();
    const result = showWip(deps);
    expect(result.success).toBeTrue();
    expect(result.messages?.some((msg) => msg.includes('Found 1 WIP commits'))).toBeTrue();
    expect(deps.execCalls.some((call) => call.command === 'git log --oneline')).toBeTrue();
  });

  test('diffSession returns diff output', () => {
    const deps = createMockDeps();
    const result = diffSession(deps);
    expect(result.success).toBeTrue();
    expect(result.messages?.some((msg) => msg.includes('diff output'))).toBeTrue();
  });

  test('squashSession fails without message', () => {
    const deps = createMockDeps();
    const result = squashSession(undefined, deps);
    expect(result.success).toBeFalse();
    expect(result.exitCode).toBe(1);
  });

  test('squashSession resets and commits with message', () => {
    const deps = createMockDeps();
    const result = squashSession('feat: done', deps);
    expect(result.success).toBeTrue();
    expect(deps.execCalls.some((call) => call.command.startsWith('git reset --soft'))).toBeTrue();
    expect(deps.execCalls.some((call) => call.command.startsWith('git commit -m'))).toBeTrue();
  });

  test('preparePush runs lint and tests when available', () => {
    const deps = createMockDeps({
      existsSync: mock((path: string) => path.endsWith('package.json') || path.endsWith('bun.lockb')),
      readFileSync: mock(() => JSON.stringify({ scripts: { lint: 'lint', test: 'test' } })),
    });

    const result = preparePush('feat: done', deps);
    expect(result.success).toBeTrue();
    expect(result.data?.lintRan).toBeTrue();
    expect(result.data?.testsRan).toBeTrue();
    expect(deps.execCalls.some((call) => call.command.includes('bun run lint'))).toBeTrue();
    expect(deps.execCalls.some((call) => call.command.includes('bun run test'))).toBeTrue();
  });

  test('preparePush surfaces failures from lint command', () => {
    const execCalls: ExecCall[] = [];
    const exec = mock((command: string, options?: Record<string, unknown>) => {
      execCalls.push({ command, options });
      if (command === 'git log --oneline -20') {
        return 'abc123 Initial commit\ndef456 WIP: work in progress';
      }
      if (command.startsWith('git log --oneline abc123..HEAD')) {
        return 'def456 WIP: work in progress';
      }
      if (command.startsWith('git reset') || command.startsWith('git commit')) {
        return '';
      }
      if (command.includes('lint')) {
        throw new Error('lint failure');
      }
      if (command.includes('test')) {
        return 'tests ok';
      }
      return '';
    });

    const deps = createMockDeps({
      execSync: exec,
      existsSync: mock((path: string) => path.endsWith('package.json')),
      readFileSync: mock(() => JSON.stringify({ scripts: { lint: 'lint', test: 'test' } })),
    });

    const result = preparePush('feat: done', deps);
    expect(result.success).toBeTrue();
    expect(result.warnings?.some((warning) => warning.includes('Lint failed'))).toBeTrue();
    expect(result.data?.lintRan).toBeTrue();
  });
});
