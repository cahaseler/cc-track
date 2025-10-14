# Feature Specification: Enhance capture-plan hook to handle active tasks and set in_progress status

**Feature ID**: `053`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Prevent capture-plan hook from creating duplicate tasks when an active task exists and ensure new tasks start with correct "in_progress" status instead of "planning"

## Requirements

- [x] Add active task detection using `ClaudeMdHelpers.hasActiveTask()` before creating new tasks
- [x] Return systemMessage when active task exists instructing Claude to update existing task file
- [x] Include task ID in systemMessage so Claude knows which file to update
- [x] Change hardcoded "planning" status to "in_progress" in `generateEnrichmentPrompt()`
- [x] Update prompt template to use "in_progress" status
- [x] Add test for active task detection blocking new task creation
- [x] Add test for systemMessage returned when active task exists
- [x] Add test that new tasks are created with "in_progress" status
- [x] Ensure existing tests still pass with status change
- [x] Update `src/hooks/capture-plan.ts` with active task check logic
- [x] Update `src/hooks/capture-plan.test.ts` with new test cases

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
