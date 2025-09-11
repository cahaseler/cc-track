# Command Functionality Differences: .claude → src/ CLI

This lists only behavioral differences between the original .claude scripts and the refactored src/commands.

## init (init-templates.ts → init.ts)
- Settings location: original used `templates/settings.json` with updates to `CLAUDE.md`; refactor writes `.claude/claude_code_settings.json` (merges hooks/statusline) and supports `--with-stop` to choose an alternate template.
- CLAUDE.md handling: original prepended template section to an existing `CLAUDE.md` (and backed it up as `CLAUDE.md.backup`); refactor copies `templates/CLAUDE.md` if absent, or overwrites only with `--force` (no smart prepend).
- Directories: original ensured `.claude/{hooks,plans,utils}`; refactor creates `.claude/{commands,hooks,lib,scripts,plans,tasks,logs}`.
- Command templates: refactor copies Markdown command help into `.claude/commands/` (not present in the original initializer).

## complete-task (scripts/complete-task.ts → commands/complete-task.ts)
- Output format: original returns a rich JSON `CompletionResult`; refactor prints human‑readable progress and exits with codes.
- Status updates: refactor adds a `**Completed:** <date time>` field if missing; original updated status and “Current Focus”, but didn’t add an explicit Completed field.
- Back-matter updates: original also updated `.claude/no_active_task.md` (completed tasks section); refactor does not.
- Validation steps: original optionally ran TypeScript, Biome, and Knip (reading commands from config); refactor does not perform these checks.
- GitHub PR workflow: original, when enabled, pushed the current branch for PR creation; refactor omits GitHub/PR steps.
- Squash algorithm: original squashed only when all commits since the last non‑WIP were `[wip]` and no uncommitted changes; refactor always resets to the last non‑WIP hash and commits (no mixed‑history/uncommitted‑changes safeguards).
- Branch handling: original could push for PR or merge based on config; refactor only attempts a local merge if on the task branch (no PR path).

## backlog (scripts/add-to-backlog.ts → commands/backlog.ts)
- File creation: original required an existing `.claude/backlog.md` and failed otherwise; refactor creates the file with a prefilled template when missing. [This is an improvement, keep it! - Craig]
- Multi‑item and listing: refactor accepts multiple items and supports `--list`; original accepted only a single item and had no list mode. [This is an improvement, keep it! - Craig]
- Empty input behavior: original printed guidance and exited 0 when no item provided; refactor treats it as an error and exits 1.

## git-session utilities (scripts/git-session.ts)
- The original provided extra utilities (show‑revert, squash‑session with provided message, show‑wip, diff‑session, prepare‑push). The refactor does not expose equivalents; only a simplified WIP squash is embedded in `complete-task`.
