import { describe, expect, test } from 'bun:test';
import { gitSessionCommand } from './git-session';

describe('git-session command', () => {
  test('has correct name and description', () => {
    expect(gitSessionCommand.name()).toBe('git-session');
    expect(gitSessionCommand.description()).toBe('Git session management utilities');
  });

  test('has expected subcommands', () => {
    const subcommands = gitSessionCommand.commands.map((cmd) => cmd.name());

    expect(subcommands).toContain('show-revert');
    expect(subcommands).toContain('squash');
    expect(subcommands).toContain('show-wip');
    expect(subcommands).toContain('diff');
    expect(subcommands).toContain('prepare-push');
  });

  test('subcommand descriptions are correct', () => {
    const commands = gitSessionCommand.commands;

    const showRevert = commands.find((cmd) => cmd.name() === 'show-revert');
    const squash = commands.find((cmd) => cmd.name() === 'squash');
    const showWip = commands.find((cmd) => cmd.name() === 'show-wip');
    const diff = commands.find((cmd) => cmd.name() === 'diff');
    const preparePush = commands.find((cmd) => cmd.name() === 'prepare-push');

    expect(showRevert?.description()).toBe('Display command to revert to last non-WIP commit');
    expect(squash?.description()).toBe('Squash all WIP commits into one');
    expect(showWip?.description()).toBe('Show all WIP commits');
    expect(diff?.description()).toBe('Show all changes since last user commit');
    expect(preparePush?.description()).toBe('Squash WIPs and run quality checks');
  });

  test('has correct command structure', () => {
    const commands = gitSessionCommand.commands;

    const squash = commands.find((cmd) => cmd.name() === 'squash');
    const preparePush = commands.find((cmd) => cmd.name() === 'prepare-push');

    // Basic validation that commands exist
    expect(squash).toBeDefined();
    expect(preparePush).toBeDefined();
    expect(commands).toHaveLength(5);
  });
});
