# Fix Hardcoded Paths for Cross-Platform Installation

**Purpose:** Remove hardcoded Unix-specific paths and make the cc-track installation work across different operating systems and installation locations.

**Status:** planning
**Started:** 2025-09-14 22:06
**Task ID:** 047

## Requirements
- [x] Copy slash command files from `.claude/commands/` to `src/commands/`
- [x] Update `add-to-backlog.md` to use `cc-track backlog add`
- [x] Update `complete-task.md` to use `cc-track complete-task`
- [x] Update `prepare-completion.md` to use `cc-track prepare-completion`
- [x] Update `templates/settings.json` to use `cc-track` instead of hardcoded path
- [x] Delete `templates/settings_with_stop.json`
- [x] Remove init command entirely (out of scope - will be rebuilt later)
- [x] Review and fix OS-specific commands (replace `which` with portable alternatives)
- [x] Ensure cross-platform compatibility for shell operations

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

## Recent Progress

### Completed All Requirements
1. **Created portable slash commands** - Copied to `src/commands/slash-commands/` with `cc-track` commands
2. **Updated templates** - Modified `templates/settings.json` to use `cc-track`
3. **Removed unnecessary template** - Deleted `templates/settings_with_stop.json`
4. **Removed init command entirely** - Per user guidance, init will be rebuilt later
5. **Fixed OS-specific commands**:
   - Made `which` cross-platform in `claude-sdk.ts` (uses `where` on Windows)
   - Replaced shell piping in `git-session.ts` with git's built-in `--grep`
   - Fixed `/tmp` hardcoding in `stop-review.ts` using `os.tmpdir()`
   - Added package manager detection for npm/yarn/pnpm/bun commands

### Comprehensive Cross-Platform Review
Conducted thorough search for all potential issues:
- ✅ All shell command executions reviewed
- ✅ File path separators use `path.join()`
- ✅ No Unix-specific file permissions
- ✅ Environment variables handled properly
- ✅ Package manager commands are detected dynamically
- ✅ All paths use proper Node.js path methods

### Validation
- TypeScript compilation: ✓
- Biome linting: ✓
- All tests pass: ✓ (270 tests)
- Build successful: ✓

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