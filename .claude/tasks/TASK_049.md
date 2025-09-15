# Fix Complete-Task Squashing to Handle All Branch Commits

**Purpose:** Replace WIP-only commit squashing logic with branch-based squashing that handles all commit types (feat:, fix:, docs:, etc.) by squashing all commits from merge-base to HEAD on feature branches.

**Status:** completed
**Started:** 2025-09-14 19:48
**Task ID:** 049

## Requirements
- [x] Add `getMergeBase()` method to git helpers in `src/lib/git-helpers.ts`
- [x] Refactor squashing logic in `src/commands/complete-task.ts` (lines 204-251)
- [x] Implement branch detection to identify feature/bug branches vs default branches
- [x] Add logic to find merge-base between current branch and default branch
- [x] Replace WIP-only commit counting with all-commits-since-merge-base counting
- [x] Update squashing command to use `git reset --soft <merge-base>` approach
- [x] Update result messages to reflect branch-based squashing instead of WIP-based
- [x] Test with mixed commit types (wip:, feat:, fix:, docs:)
- [x] Test behavior on feature branches vs main branch
- [x] Test single commit branches

## Success Criteria
- Complete-task command successfully squashes all commits on feature branches regardless of commit message format
- No "manual review needed" errors when mixing WIP and conventional commits
- Proper handling when already on default branch (main/master)
- Single commit per task for cleaner PR history
- All existing functionality preserved

## Technical Approach
Replace the current WIP-detection logic with:
1. Detect current branch and default branch (main/master)
2. Use `git merge-base` to find common ancestor
3. Count all commits since merge-base
4. If multiple commits exist, squash using `git reset --soft` + `git commit`
5. Update messaging to reflect branch-based approach

## Resolution

**Completed:** 2025-09-14 20:15

Successfully implemented branch-based squashing that handles all commit types. The solution:

1. **Added `getMergeBase()` method** to GitHelpers class that uses `git merge-base` to find the common ancestor between two branches
2. **Refactored complete-task.ts squashing logic** to:
   - Detect when on a feature/task branch vs default branch
   - Find merge-base between current branch and default branch
   - Count ALL commits since merge-base (not just WIP commits)
   - Use `git reset --soft <merge-base>` to squash all commits
   - Properly handle edge cases (single commit, no merge-base, on default branch)
3. **Removed WIP-only detection** that was limiting squashing to specific commit patterns
4. **Updated messaging** to reflect branch-based approach rather than WIP-based

The fix ensures cleaner PR history with one commit per task, regardless of the commit message formats used during development. All validation checks pass (TypeScript, Biome, tests).

**PR:** #41 - Merged and released as v1.15.1

<!-- github_issue: 40 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/40 -->
<!-- issue_branch: 40-fix-complete-task-squashing-to-handle-all-branch-commits -->