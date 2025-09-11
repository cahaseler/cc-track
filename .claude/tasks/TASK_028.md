# Remove Legacy .claude Scripts After CLI Migration

**Purpose:** Clean up legacy .claude scripts and hooks that have been fully migrated to the new CLI structure under src/, removing 14 obsolete files while preserving all functionality.

**Status:** completed
**Started:** 2025-09-11 19:12
**Task ID:** 028

## Requirements
- [ ] Delete 5 legacy hook files from `.claude/hooks/`
  - [ ] Remove `capture_plan.ts` (migrated to `src/hooks/capture-plan.ts`)
  - [ ] Remove `pre_compact.ts` (migrated to `src/hooks/pre-compact.ts`)
  - [ ] Remove `post_compact.ts` (migrated to `src/hooks/post-compact.ts`)
  - [ ] Remove `stop_review.ts` (migrated to `src/hooks/stop-review.ts`)
  - [ ] Remove `edit_validation.ts` (migrated to `src/hooks/edit-validation.ts`)
- [ ] Delete 4 legacy script files from `.claude/scripts/`
  - [ ] Remove `init-templates.ts` (migrated to `cc-track init`)
  - [ ] Remove `git-session.ts` (migrated to `cc-track git-session`)
  - [ ] Remove `add-to-backlog.ts` (migrated to `cc-track backlog`)
  - [ ] Remove `complete-task.ts` (migrated to `cc-track complete-task`)
- [ ] Delete 4 legacy library files from `.claude/lib/`
  - [ ] Remove `logger.ts` (migrated to `src/lib/logger.ts`)
  - [ ] Remove `config.ts` (migrated to `src/lib/config.ts`)
  - [ ] Remove `git-helpers.ts` (migrated to `src/lib/git-helpers.ts`)
  - [ ] Remove `github-helpers.ts` (migrated to `src/lib/github-helpers.ts`)
- [ ] Delete legacy shell script
  - [ ] Remove `.claude/statusline.sh` (migrated to `cc-track statusline`)
- [ ] Update knip.json to remove reference to `.claude/scripts/*.ts`
- [ ] Update code_index.md to remove references to old script locations
- [ ] Preserve all command files (`.claude/commands/*.md`)
- [ ] Preserve all context files and configuration files
- [ ] Preserve essential directories (`plans/`, `tasks/`, `utils/`)

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

## Next Steps
1. Verify current CLI functionality is working properly
2. Delete legacy hook files from `.claude/hooks/`
3. Delete legacy script files from `.claude/scripts/`
4. Delete legacy library files from `.claude/lib/`
5. Delete legacy shell script
6. Update knip.json configuration
7. Update code_index.md documentation
8. Test that all functionality still works after cleanup

<!-- branch: feature/remove-legacy-claude-scripts-028 -->