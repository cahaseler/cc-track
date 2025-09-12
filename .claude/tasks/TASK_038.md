# Remove Unused Standalone Function Exports

**Purpose:** Clean up unused standalone function exports while maintaining class-based approach and keeping only essential standalone functions that are actually in use.

**Status:** planning
**Started:** 2025-09-12 13:50
**Task ID:** 038

## Requirements
- [x] In `src/lib/github-helpers.ts`: Keep only `pushCurrentBranch` function, remove all other standalone exports (lines 342-388)
- [x] In `src/lib/git-helpers.ts`: Keep only `getDefaultBranch`, `isWipCommit`, `getCurrentBranch` functions, remove all other standalone exports
- [x] In `src/lib/claude-md.ts`: Keep only `clearActiveTask`, `getActiveTaskId` functions, remove any other unused standalone exports
- [x] Keep all class definitions and default instances in all files
- [x] Run tests to ensure nothing breaks
- [x] Run Knip to verify unused export warnings are resolved

## Success Criteria
- All unused standalone function exports are removed (~20 exports)
- Only essential standalone functions remain (those actually used in the codebase)
- All tests pass
- Knip shows no more unused export warnings for these functions
- Class-based approach remains as the primary pattern

## Technical Approach
1. Analyze each file to identify which standalone functions are actually used
2. Remove unused standalone function exports while preserving classes
3. Maintain the few standalone functions that are in active use
4. Validate changes with tests and Knip

## Current Focus
Start with `src/lib/github-helpers.ts` - remove unused standalone exports while keeping `pushCurrentBranch`

## Open Questions & Blockers
- Need to verify which functions in `src/lib/claude-md.ts` are actually unused
- Confirm the exact line ranges for removal in each file

## Next Steps
All requirements have been completed successfully.

## Recent Progress

### Completed Implementation (2025-09-12)

Successfully removed ~20 unused standalone function exports to clean up the codebase and clarify the intended usage pattern.

#### Changes Made:

1. **github-helpers.ts**: Removed 12 unused standalone exports, kept only `pushCurrentBranch` (used in complete-task.ts)

2. **git-helpers.ts**: Removed 8 unused standalone exports, kept only:
   - `getDefaultBranch` (used in complete-task.ts)
   - `getCurrentBranch` (used in statusline.ts) 
   - `isWipCommit` (used in complete-task.ts and git-session.ts)

3. **claude-md.ts**: Removed 5 unused standalone exports, kept only:
   - `getActiveTaskId` (used in complete-task.ts)
   - `clearActiveTask` (used in complete-task.ts)

4. **edit-validation.ts**: Removed the unused `validateFiles` function entirely

#### Results:
- ✅ All 260+ tests passing
- ✅ Knip warnings reduced from 25+ to just 2 (remaining are type exports)
- ✅ Class-based pattern with dependency injection is now the clear primary approach
- ✅ Maintained backward compatibility for the few standalone functions still in use

The cleanup makes the codebase more maintainable by removing redundant code that was added for backward compatibility but never actually used. The class-based approach is now clearly the intended pattern for these modules.

<!-- branch: feature/remove-unused-exports-038 -->

<!-- github_issue: 16 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/16 -->