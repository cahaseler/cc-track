# Command Functionality Differences: .claude → src/ CLI

This lists only behavioral differences between the original .claude scripts and the refactored src/commands.

## init (init-templates.ts → init.ts)
- Settings location: original used `templates/settings.json` with updates to `CLAUDE.md`; refactor writes `.claude/claude_code_settings.json` (merges hooks/statusline) and supports `--with-stop` to choose an alternate template.
- CLAUDE.md handling: original prepended template section to an existing `CLAUDE.md` (and backed it up as `CLAUDE.md.backup`); refactor copies `templates/CLAUDE.md` if absent, or overwrites only with `--force` (no smart prepend).
- Directories: original ensured `.claude/{hooks,plans,utils}`; refactor creates `.claude/{commands,hooks,lib,scripts,plans,tasks,logs}`.
- Command templates: refactor copies Markdown command help into `.claude/commands/` (not present in the original initializer).

## complete-task (scripts/complete-task.ts → commands/complete-task.ts)
- Output format: returns a rich JSON `CompletionResult` (parity with original).
- Status updates: adds a `**Completed:** <date time>` field (approved improvement).
- Back-matter updates: updates `.claude/no_active_task.md` “Completed Tasks” section (parity).
- Validation steps: runs TypeScript, Biome, and Knip using commands resolved from `.claude/track.config.json` (parity).
- GitHub PR workflow: supports branch pushing when `features.github_integration.auto_create_prs` is enabled; carries issue number when present (parity).
- Squash algorithm: preserves original safeguards — squashes only when all recent commits are `[wip]` and there are no uncommitted changes; otherwise records notes (parity).
- Branch handling: supports both PR workflow push and local merge path when on the task branch (parity).

## backlog (scripts/add-to-backlog.ts → commands/backlog.ts)
- File creation: original required an existing `.claude/backlog.md` and failed otherwise; refactor creates the file with a prefilled template when missing.
- Multi‑item and listing: refactor accepts multiple items and supports `--list`; original accepted only a single item and had no list mode.
- Empty input behavior: original printed guidance and exited 0 when no item provided; refactor treats it as an error and exits 1.

## hook dispatcher (new: commands/hook.ts)
- Centralization: unified `cc-track hook --type <hook>` dispatches to refactored hook handlers; the original used separate Bun scripts per hook.
- Exit codes: dispatch command exits with code 2 when a hook returns `decision: 'block'`; original scripts generally exited 0 after printing JSON.
- Debugging: supports `--debug` to raise log level consistently.

## git-session utilities (scripts/git-session.ts)
- The original provided extra utilities (show‑revert, squash‑session with provided message, show‑wip, diff‑session, prepare‑push). The refactor does not expose equivalents; only a simplified WIP squash is embedded in `complete-task`.
