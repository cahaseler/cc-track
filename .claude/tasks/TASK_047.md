# Fix Hardcoded Paths for Cross-Platform Installation

**Purpose:** Remove hardcoded Unix-specific paths and make the cc-track installation work across different operating systems and installation locations.

**Status:** planning
**Started:** 2025-09-14 22:06
**Task ID:** 047

## Requirements
- [ ] Copy slash command files from `.claude/commands/` to `src/commands/`
- [ ] Update `init-track.md` to use `cc-track init` instead of hardcoded path
- [ ] Update `add-to-backlog.md` to use `cc-track backlog add`
- [ ] Update `complete-task.md` to use `cc-track complete-task`
- [ ] Update `prepare-completion.md` to use `cc-track prepare-completion`
- [ ] Update `templates/settings.json` to use `cc-track` instead of hardcoded path
- [ ] Delete `templates/settings_with_stop.json`
- [ ] Remove references to `settings_with_stop.json` in `src/commands/init.ts`
- [ ] Remove `--with-stop` option from init command
- [ ] Update init command to copy slash commands from `src/commands/` instead of `.claude/commands/`
- [ ] Review and fix OS-specific commands (replace `which` with portable alternatives)
- [ ] Ensure cross-platform compatibility for shell operations

## Success Criteria
- All hardcoded paths are replaced with portable command references
- Installation works on Windows, macOS, and Linux
- Slash commands use the globally installed `cc-track` command
- No references to removed `settings_with_stop.json` template
- Init command copies files from the correct source location

## Technical Approach
1. Copy and update slash command markdown files to use portable command syntax
2. Update template settings to reference the global command
3. Clean up deprecated template and options
4. Modify init command to use new file locations and remove deprecated features
5. Replace Unix-specific shell commands with cross-platform alternatives

## Current Focus
Start by copying the slash command files from `.claude/commands/` to `src/commands/` and updating their content to use portable command references.

## Open Questions & Blockers
- Need to verify which OS-specific commands are currently being used beyond the hardcoded paths
- May need to test cross-platform shell command alternatives

## Next Steps
1. Copy `.claude/commands/*.md` files to `src/commands/`
2. Update the copied files to replace hardcoded paths with `cc-track` commands
3. Update `templates/settings.json`
4. Remove `templates/settings_with_stop.json`
5. Update `src/commands/init.ts`

<!-- github_issue: 35 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/35 -->
<!-- issue_branch: 35-fix-hardcoded-paths-for-cross-platform-installation -->