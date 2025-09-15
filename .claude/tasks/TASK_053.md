# Enhance capture-plan hook to handle active tasks and set in_progress status

**Purpose:** Prevent capture-plan hook from creating duplicate tasks when an active task exists and ensure new tasks start with correct "in_progress" status instead of "planning"

**Status:** completed
**Started:** 2025-09-15 22:06
**Task ID:** 053

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

## Success Criteria
- When planning mode is exited with an active task: Claude receives message to update existing task file
- When planning mode is exited without active task: New task created with "in_progress" status
- All existing tests pass with status change
- New tests verify active task detection and blocking behavior
- Clear messaging guides users on task management workflow

## Technical Approach
1. **Active Task Detection**: Use existing `ClaudeMdHelpers.hasActiveTask()` at start of `capturePlanHook()`
2. **Conditional Logic**: If active task exists, return systemMessage instead of creating new task
3. **Status Update**: Change hardcoded "planning" to "in_progress" in task generation
4. **Test Coverage**: Add comprehensive tests for new blocking behavior and status changes

## Current Focus

Task completed on 2025-09-15

## Open Questions & Blockers
- Need to verify the exact format and content expected in the systemMessage for Claude
- Should confirm the task ID format returned by `hasActiveTask()` matches what Claude expects
- May need to understand how Claude handles systemMessage responses in practice

## Next Steps
1. Examine current `src/hooks/capture-plan.ts` implementation
2. Review `ClaudeMdHelpers.hasActiveTask()` method signature and return format
3. Add active task check at beginning of `capturePlanHook()`
4. Implement systemMessage return when active task detected
5. Update status from "planning" to "in_progress"
6. Write and run tests to verify new behavior

## Recent Progress

Successfully implemented both enhancements to the capture-plan hook:

### Active Task Detection
- Added check in `capturePlanHook()` using `ClaudeMdHelpers.hasActiveTask()`
- When an active task exists, the hook now returns a systemMessage instructing Claude to update the existing task file
- The message includes the task ID and clear instructions on what to do
- This prevents creation of multiple concurrent tasks and maintains focus

### Task Status Update
- Changed the hardcoded "planning" status to "in_progress" in `generateEnrichmentPrompt()`
- This better reflects reality - Claude immediately starts working on tasks after they're created
- Updated the task template to use the new status

### Testing
- Added comprehensive test for active task blocking behavior
- Updated existing tests to verify the new "in_progress" status
- All 10 tests in capture-plan.test.ts pass
- Full test suite (287 tests) passes without issues
- TypeScript compilation succeeds
- Biome linting passes after formatting fix

### Implementation Details
- Modified `src/hooks/capture-plan.ts` to check for active tasks early in the hook execution
- System message provides clear guidance: warns about existing task, instructs to update it, and suggests using /complete-task if new task was intended
- All changes are backward compatible - existing functionality remains intact

<!-- github_issue: 50 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/50 -->
<!-- issue_branch: 50-enhance-capture-plan-hook-to-handle-active-tasks-and-set-in_progress-status -->