# Fix Complete-Task Squashing to Handle All Branch Commits

**Purpose:** Replace WIP-only commit squashing logic with branch-based squashing that handles all commit types (feat:, fix:, docs:, etc.) by squashing all commits from merge-base to HEAD on feature branches.

**Status:** completed
**Started:** 2025-09-14 19:48
**Task ID:** 049

## Requirements
- [ ] Add `getMergeBase()` method to git helpers in `src/lib/git-helpers.ts`
- [ ] Refactor squashing logic in `src/commands/complete-task.ts` (lines 204-251)
- [ ] Implement branch detection to identify feature/bug branches vs default branches
- [ ] Add logic to find merge-base between current branch and default branch
- [ ] Replace WIP-only commit counting with all-commits-since-merge-base counting
- [ ] Update squashing command to use `git reset --soft <merge-base>` approach
- [ ] Update result messages to reflect branch-based squashing instead of WIP-based
- [ ] Test with mixed commit types (wip:, feat:, fix:, docs:)
- [ ] Test behavior on feature branches vs main branch
- [ ] Test single commit branches

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

## Current Focus

Task completed on 2025-09-14

## Open Questions & Blockers
- Need to verify how default branch detection works in the existing codebase
- Should confirm the exact git commands used for squashing in current implementation
- May need to handle edge cases like orphaned branches or missing merge-base

## Next Steps
1. Read current `src/commands/complete-task.ts` to understand existing squashing logic
2. Read `src/lib/git-helpers.ts` to understand current git helper methods
3. Implement `getMergeBase()` method in git helpers
4. Refactor squashing logic in complete-task command
5. Update result messages and test the changes

<!-- github_issue: 40 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/40 -->
<!-- issue_branch: 40-fix-complete-task-squashing-to-handle-all-branch-commits -->