# Feature Specification: Hook Improvements for Better Developer Experience

**Feature ID**: `030`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Improve edit-validation and stop-review hooks to provide cleaner developer experience by ensuring test files are silently skipped during TypeScript checking and private journal files are excluded from code review diffs while remaining in git for backup.

## Requirements

- [x] Update stop-review hook to filter out `.private-journal/**` files from review diffs
- [x] Update stop-review hook to filter out files ending in `.embedding` from review diffs
- [x] Verify edit-validation hook silently skips test files without generating output
- [x] Add test cases to stop-review.test.ts for private journal file filtering
- [x] Add test cases to stop-review.test.ts for .embedding file filtering
- [x] Verify edit-validation.test.ts confirms silent skipping behavior
- [x] Fix false positive task warning when active task exists
- [x] Rebuild CLI binary with all changes

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
