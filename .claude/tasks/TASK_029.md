# Consolidate Duplicate Helper Functions Across Codebase

**Purpose:** Eliminate duplicate helper functions across the codebase by creating centralized modules for CLAUDE.md operations, git utilities, and config access patterns to reduce ~150 lines of duplicate code and prevent future implementation drift.

**Status:** planning
**Started:** 2025-09-12 20:27
**Task ID:** 029

## Requirements
- [ ] Create src/lib/claude-md.ts module with CLAUDE.md operations
  - [ ] `getActiveTaskFile(projectRoot): string | null` - Returns task filename
  - [ ] `getActiveTaskId(projectRoot): string | null` - Returns TASK_XXX id
  - [ ] `getActiveTaskContent(projectRoot): string | null` - Returns full task content
  - [ ] `setActiveTask(projectRoot, taskId): void` - Updates CLAUDE.md to point to task
  - [ ] `clearActiveTask(projectRoot): void` - Sets to no_active_task.md
- [ ] Update all consumers: statusline, stop-review, post-compact, capture-plan, complete-task
- [ ] Consolidate git helpers in existing git-helpers.ts
  - [ ] Remove duplicate `hasUncommittedChanges` from stop-review.ts
  - [ ] Remove duplicate `getCurrentBranch` from statusline.ts
  - [ ] Replace inline default branch detection in complete-task.ts with `getDefaultBranch`
  - [ ] Move `isWipCommit` to git-helpers.ts and export it
- [ ] Fix config access in complete-task.ts
  - [ ] Replace direct JSON.parse calls with config library functions
  - [ ] Use `getConfig()` for general config access
  - [ ] Use `isGitHubIntegrationEnabled()` for GitHub checks
- [ ] Extract validation utilities to src/lib/validation.ts (optional)
  - [ ] Move TypeScript/Biome/Knip runners from edit-validation
  - [ ] Reuse in complete-task for project-wide checks
- [ ] Update all imports in consumer files
- [ ] Run tests after each module change to verify no behavior changes

## Success Criteria
- All duplicate functions removed from individual files
- Centralized modules created and properly exported
- All consumer files updated to use centralized functions
- No behavior changes in existing functionality
- Test suites pass after all changes
- Git diff shows only import changes in consumer files (no logic changes)

## Technical Approach
1. **Git helpers first** (simplest, most duplicated) - consolidate into existing git-helpers.ts
2. **CLAUDE.md operations** (most complex, highest impact) - new claude-md.ts module
3. **Config access** (straightforward replacement) - use existing config functions
4. **Validation utilities** (optional, can be deferred) - new validation.ts module

## Current Focus
Start with consolidating git helper functions as they are the simplest and most duplicated across the codebase.

## Open Questions & Blockers
- Need to verify all current consumers of duplicate functions to ensure complete migration
- Should validate that centralized implementations match behavior of all duplicates
- Optional validation utilities extraction may not be worth the effort given different use cases

## Next Steps
1. Audit codebase for all duplicate git helper function usage
2. Consolidate git helpers into git-helpers.ts
3. Update imports in all consumer files
4. Test git helper consolidation
5. Move to CLAUDE.md operations consolidation

<!-- branch: feature/consolidate-helper-functions-029 -->