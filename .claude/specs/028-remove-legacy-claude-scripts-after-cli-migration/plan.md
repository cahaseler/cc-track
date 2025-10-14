# Remove Legacy .claude Scripts After CLI Migration

**Purpose:** Clean up legacy .claude scripts and hooks that have been fully migrated to the new CLI structure under src/, removing 14 obsolete files while preserving all functionality.

**Status:** completed
**Started:** 2025-09-11 19:12
**Task ID:** 028

## Requirements
- [x] Delete 5 legacy hook files from `.claude/hooks/`
  - [x] Remove `capture_plan.ts` (migrated to `src/hooks/capture-plan.ts`)
  - [x] Remove `pre_compact.ts` (migrated to `src/hooks/pre-compact.ts`)
  - [x] Remove `post_compact.ts` (migrated to `src/hooks/post-compact.ts`)
  - [x] Remove `stop_review.ts` (migrated to `src/hooks/stop-review.ts`)
  - [x] Remove `edit_validation.ts` (migrated to `src/hooks/edit-validation.ts`)
- [x] Delete 4 legacy script files from `.claude/scripts/`
  - [x] Remove `init-templates.ts` (migrated to `cc-track init`)
  - [x] Remove `git-session.ts` (migrated to `cc-track git-session`)
  - [x] Remove `add-to-backlog.ts` (migrated to `cc-track backlog`)
  - [x] Remove `complete-task.ts` (migrated to `cc-track complete-task`)
- [x] Delete 4 legacy library files from `.claude/lib/`
  - [x] Remove `logger.ts` (migrated to `src/lib/logger.ts`)
  - [x] Remove `config.ts` (migrated to `src/lib/config.ts`)
  - [x] Remove `git-helpers.ts` (migrated to `src/lib/git-helpers.ts`)
  - [x] Remove `github-helpers.ts` (migrated to `src/lib/github-helpers.ts`)
- [x] Delete legacy shell script
  - [x] Remove `.claude/statusline.sh` (migrated to `cc-track statusline`)
- [x] Update knip.json to remove reference to `.claude/scripts/*.ts`
- [x] Update code_index.md to remove references to old script locations
- [x] Preserve all command files (`.claude/commands/*.md`)
- [x] Preserve all context files and configuration files
- [x] Preserve essential directories (`plans/`, `tasks/`, `utils/`)

## Success Criteria
- All 14 legacy files are removed from the filesystem
- knip.json no longer references deleted script files
- code_index.md reflects the new structure
- All CLI functionality continues to work unchanged
- No references to deleted files remain in active configuration
- Essential .claude files and directories are preserved

## Technical Approach
Systematic deletion of migrated files organized by category (hooks, scripts, libraries, shell scripts), followed by configuration updates. All functionality has been verified to exist in the new CLI structure under src/.

## Current Focus

Task completed on 2025-09-11

## Open Questions & Blockers
- Need to verify no hidden references to legacy files exist in configuration
- Should double-check that all CLI migration is complete before deletion

## Completion Summary

Successfully removed all 14 legacy files that were fully migrated to the new CLI structure:

**What was delivered:**
- Deleted 5 hook TypeScript files from `.claude/hooks/` (all functionality now in `src/hooks/`)
- Deleted 4 script TypeScript files from `.claude/scripts/` (all functionality now in `src/commands/`)
- Deleted 4 library TypeScript files from `.claude/lib/` (all functionality now in `src/lib/`)
- Deleted 1 shell script `.claude/statusline.sh` (replaced by TypeScript in `src/commands/statusline.ts`)
- Updated `knip.json` to point to `src/` instead of `.claude/`
- Updated `.claude/code_index.md` to reflect the new structure

**Key implementation details:**
- All hooks now handled by unified `cc-track hook` command dispatcher
- All utilities available as subcommands of the main `cc-track` CLI
- Templates and current settings.json already pointed to the new CLI (no updates needed)
- Auto-branching feature made this cleanup risk-free with isolated changes

**Testing results:**
- Verified all directories are empty after cleanup
- Confirmed CLI functionality continues to work (`cc-track --help` shows all commands)
- TypeScript compilation successful (0 errors)
- Biome linting clean (0 issues)
- Knip check completed successfully

The legacy files remain available in git history if ever needed for reference.

<!-- branch: feature/remove-legacy-claude-scripts-028 -->