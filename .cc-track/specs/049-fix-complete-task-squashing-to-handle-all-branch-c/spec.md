# Feature Specification: Fix Complete-Task Squashing to Handle All Branch Commits

**Feature ID**: `049`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Replace WIP-only commit squashing logic with branch-based squashing that handles all commit types (feat:, fix:, docs:, etc.) by squashing all commits from merge-base to HEAD on feature branches.

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

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
