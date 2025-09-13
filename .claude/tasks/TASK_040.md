# Remove Commit Reminder Logic from Stop Hook

**Purpose:** Remove the logic that adds commit reminders from the stop-review hook to restore its previous behavior of only providing review feedback

**Status:** completed
**Started:** 2025-09-13 17:01
**Task ID:** 040

## Requirements
- [x] Remove `checkRecentNonTaskCommits()` method from `src/hooks/stop-review.ts` (lines 490-518)
- [x] Remove `nonTaskSuggestion` variable and logic from `src/hooks/stop-review.ts` (lines 702-718)
- [x] Update `generateStopOutput()` to remove the `nonTaskSuggestion` parameter
- [x] Remove all places where `nonTaskSuggestion` is appended to messages
- [x] Remove test assertion in `src/hooks/stop-review.test.ts` that checks the message doesn't contain "I notice you've made"

## Success Criteria
- Stop hook no longer displays "You have made X commits without an active task. Consider using planning mode..." reminders
- All tests pass after changes
- Hook still provides normal review feedback functionality
- No broken references to removed code

## Technical Approach
Remove the commit counting and reminder logic while preserving the core review functionality of the stop hook. This involves removing specific methods, variables, and test assertions that were added for the commit reminder feature.

## Recent Progress
Successfully removed all commit reminder logic from the stop-review hook:
- Removed the `checkRecentNonTaskCommits()` method completely
- Removed all `nonTaskSuggestion` variable declarations and usage
- Updated `generateStopOutput()` function signature to remove the parameter
- Removed test for `checkRecentNonTaskCommits` functionality
- Removed test checking for task warning message
- Fixed TypeScript type issue that was introduced during changes (replaced `as any` with proper type)
- All tests pass, TypeScript and Biome checks pass

<!-- github_issue: 23 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/23 -->