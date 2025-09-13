# Remove Commit Reminder Logic from Stop Hook

**Purpose:** Remove the logic that adds commit reminders from the stop-review hook to restore its previous behavior of only providing review feedback

**Status:** planning
**Started:** 2025-09-13 17:01
**Task ID:** 040

## Requirements
- [ ] Remove `checkRecentNonTaskCommits()` method from `src/hooks/stop-review.ts` (lines 490-518)
- [ ] Remove `nonTaskSuggestion` variable and logic from `src/hooks/stop-review.ts` (lines 702-718)
- [ ] Update `generateStopOutput()` to remove the `nonTaskSuggestion` parameter
- [ ] Remove all places where `nonTaskSuggestion` is appended to messages
- [ ] Remove test assertion in `src/hooks/stop-review.test.ts` that checks the message doesn't contain "I notice you've made"

## Success Criteria
- Stop hook no longer displays "You have made X commits without an active task. Consider using planning mode..." reminders
- All tests pass after changes
- Hook still provides normal review feedback functionality
- No broken references to removed code

## Technical Approach
Remove the commit counting and reminder logic while preserving the core review functionality of the stop hook. This involves removing specific methods, variables, and test assertions that were added for the commit reminder feature.

## Current Focus
Start by examining the current implementation in `src/hooks/stop-review.ts` to understand the exact structure and dependencies of the code to be removed.

## Open Questions & Blockers
- Need to verify the exact line numbers and method signatures in the current codebase
- Ensure no other parts of the system depend on the removed functionality

## Next Steps
1. Read `src/hooks/stop-review.ts` to understand current implementation
2. Remove `checkRecentNonTaskCommits()` method
3. Remove `nonTaskSuggestion` variable and related logic
4. Update `generateStopOutput()` method signature
5. Update test file to remove related assertions
6. Run tests to verify changes work correctly

<!-- github_issue: 23 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/23 -->