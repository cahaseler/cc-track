# Hook Improvements for Better Developer Experience

**Purpose:** Improve edit-validation and stop-review hooks to provide cleaner developer experience by ensuring test files are silently skipped during TypeScript checking and private journal files are excluded from code review diffs while remaining in git for backup.

**Status:** planning
**Started:** 2025-09-12 22:34
**Task ID:** 030

## Requirements
- [ ] Update stop-review hook to filter out `.private-journal/**` files from review diffs
- [ ] Update stop-review hook to filter out files ending in `.embedding` from review diffs
- [ ] Verify edit-validation hook silently skips test files without generating output
- [ ] Add test cases to stop-review.test.ts for private journal file filtering
- [ ] Add test cases to stop-review.test.ts for .embedding file filtering
- [ ] Verify edit-validation.test.ts confirms silent skipping behavior
- [ ] Update learned_mistakes.md with insights from implementation
- [ ] Update system_patterns.md to document private journal tracking but review exclusion

## Success Criteria
- Private journal files remain tracked in git but are excluded from stop-review processing
- No "deviation" flags for private journal changes during code reviews
- Test files generate no confusing TypeScript error output when skipped
- All existing tests pass
- New test cases verify the filtering behavior works correctly

## Technical Approach
- Modify `getFilteredGitDiff()` method in `src/hooks/stop-review.ts` around lines 280-286
- Add filtering patterns to existing filter logic alongside .md file exclusions
- Leverage existing test file skipping logic in edit-validation hook (lines 115-119)
- Ensure silent operation when files are filtered/skipped

## Current Focus
Start with examining the current stop-review hook implementation to understand existing filtering logic and identify where to add new patterns.

## Open Questions & Blockers
- Need to locate and examine current stop-review.ts file structure
- Verify exact line numbers and existing filter implementation
- Confirm test file structure and naming conventions

## Next Steps
1. Examine `src/hooks/stop-review.ts` to understand current filtering implementation
2. Locate the `getFilteredGitDiff()` method and existing filter patterns
3. Add private journal and .embedding file patterns to the filter logic
4. Test the changes with sample files
5. Update test files to cover new filtering behavior

<!-- branch: feature/improve-dev-hooks-030 -->