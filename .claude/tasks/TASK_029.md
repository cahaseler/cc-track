# Consolidate Duplicate Helper Functions Across Codebase

**Purpose:** Eliminate duplicate helper functions across the codebase by creating centralized modules for CLAUDE.md operations, git utilities, and config access patterns to reduce ~150 lines of duplicate code and prevent future implementation drift.

**Status:** in_progress
**Started:** 2025-09-12 20:27
**Task ID:** 029

## Requirements
- [x] Create src/lib/claude-md.ts module with CLAUDE.md operations
  - [x] `getActiveTaskFile(projectRoot): string | null` - Returns task filename
  - [x] `getActiveTaskId(projectRoot): string | null` - Returns TASK_XXX id
  - [x] `getActiveTaskContent(projectRoot): string | null` - Returns full task content
  - [x] `setActiveTask(projectRoot, taskId): void` - Updates CLAUDE.md to point to task
  - [x] `clearActiveTask(projectRoot): void` - Sets to no_active_task.md
  - [x] `getActiveTaskDisplay(projectRoot): string` - Returns formatted task display
- [x] Update all consumers: statusline, stop-review, post-compact, capture-plan, complete-task
- [x] Consolidate git helpers in existing git-helpers.ts
  - [x] Remove duplicate `hasUncommittedChanges` from stop-review.ts
  - [x] Remove duplicate `getCurrentBranch` from statusline.ts
  - [x] Replace inline default branch detection in complete-task.ts with `getDefaultBranch`
  - [x] Move `isWipCommit` to git-helpers.ts and export it
- [x] Fix config access in complete-task.ts
  - [x] Replace direct JSON.parse calls with config library functions
  - [x] Use `getConfig()` for general config access
  - [x] Use `isGitHubIntegrationEnabled()` for GitHub checks
- [ ] Extract validation utilities to src/lib/validation.ts (optional)
  - [ ] Move TypeScript/Biome/Knip runners from edit-validation
  - [ ] Reuse in complete-task for project-wide checks
- [x] Update all imports in consumer files
- [ ] Fix remaining test failures from refactoring

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

## Recent Progress
Successfully completed the major consolidation work:
- Created `src/lib/claude-md.ts` with all CLAUDE.md operations centralized
- Added `isWipCommit` function to git-helpers.ts and updated all consumers  
- Updated complete-task.ts to use config library instead of direct JSON parsing
- Removed ~150 lines of duplicate code across git-session.ts, stop-review.ts, complete-task.ts, statusline.ts
- Updated all import statements to use centralized functions

## Current Focus
Fix remaining test failures caused by the refactoring, particularly:
- statusline.test.ts mock dependency issues with getCurrentBranch
- stop-review.test.ts import errors for hasUncommittedChanges

## Open Questions & Blockers
- Test mocks need updating to work with centralized function signatures
- statusline getCurrentBranch dependency injection needs to match new pattern
- stop-review test trying to import hasUncommittedChanges from wrong module

## Next Steps
1. Fix statusline.test.ts mock dependency issues
2. Fix stop-review.test.ts import errors  
3. Verify all tests pass after fixes
4. Consider optional validation utilities extraction (deferred)

<!-- branch: feature/consolidate-helper-functions-029 -->