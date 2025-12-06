# Feature Specification: Remove Commit Reminder Logic from Stop Hook

**Feature ID**: `040`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Remove the logic that adds commit reminders from the stop-review hook to restore its previous behavior of only providing review feedback

## Requirements

- [x] Remove `checkRecentNonTaskCommits()` method from `src/hooks/stop-review.ts` (lines 490-518)
- [x] Remove `nonTaskSuggestion` variable and logic from `src/hooks/stop-review.ts` (lines 702-718)
- [x] Update `generateStopOutput()` to remove the `nonTaskSuggestion` parameter
- [x] Remove all places where `nonTaskSuggestion` is appended to messages
- [x] Remove test assertion in `src/hooks/stop-review.test.ts` that checks the message doesn't contain "I notice you've made"

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
