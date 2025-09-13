# Task File Edit Validation Enhancement

**Purpose:** Create a new PreToolUse hook that validates edits to task files using Claude SDK to prevent premature completion claims and weasel words, ensuring tasks are only marked complete via `/complete-task` command.

**Status:** completed
**Started:** 2025-09-13 18:57
**Task ID:** 044

## Requirements
- [x] Create new task validation hook (`src/hooks/task-validation.ts`)
- [x] Implement PreToolUse validation for Edit/MultiEdit operations on task files
- [x] Use Claude SDK's `prompt` function with Sonnet model for validation
- [x] Check if file path matches `.claude/tasks/TASK_*.md` pattern
- [x] Extract old/new content from tool_input for validation
- [x] Pass diff to Claude for review with strict validation instructions
- [x] Update hook dispatcher (`src/commands/hook.ts`) to add PreToolUse case
- [x] Import and register the new task-validation hook
- [x] Route Edit/MultiEdit PreToolUse events to task validation
- [x] Configure PreToolUse in settings (`/.claude/settings.json`)
- [x] Add PreToolUse configuration for Edit and MultiEdit matchers
- [x] Point to the cc-track hook command with appropriate timeout
- [x] Add configuration support (`/.claude/track.config.json`)
- [x] Add `task_validation` section under hooks with enabled flag
- [x] Update types if needed for PreToolUse HookOutput interface
- [x] Implement proper error handling and timeouts (allow edit on error)
- [x] Add logging for validation decisions

## Success Criteria
- PreToolUse hook blocks edits that set task status to "complete"
- Hook detects and blocks weasel words claiming completion without finishing work
- Non-task files pass through without validation
- Hook integrates seamlessly with existing hook system
- Proper error handling allows edits when validation fails
- All tests pass and system remains stable

## Technical Approach
- Create new PreToolUse hook using Claude SDK for intelligent validation
- Use pattern matching to identify task files (`.claude/tasks/TASK_*.md`)
- Extract diffs from Edit/MultiEdit tool inputs
- Send validation prompts to Claude with strict completion criteria
- Return `permissionDecision: "deny"` with detailed reasoning when blocking
- Maintain dependency injection pattern for testability
- Handle timeouts gracefully to avoid blocking legitimate edits

## Current Focus

Task completed on 2025-09-13

## Open Questions & Blockers
- Need to verify exact structure of tool_input for Edit/MultiEdit operations
- Confirm PreToolUse hook registration process in existing codebase
- Determine optimal timeout values for Claude SDK validation calls
- Verify Claude SDK prompt function usage and model selection

## Next Steps
1. Create `src/hooks/task-validation.ts` with basic structure and Claude SDK integration
2. Implement file path pattern matching for task files
3. Add diff extraction logic from Edit/MultiEdit tool inputs
4. Create validation prompt template for Claude SDK
5. Update hook dispatcher to register PreToolUse validation

## Recent Progress

Successfully implemented a PreToolUse validation hook that uses Claude SDK to intelligently validate edits to task files. The hook:

- Intercepts Edit/MultiEdit operations on task files before they execute
- Uses Claude SDK with Sonnet model to analyze whether edits violate completion rules
- Blocks attempts to change status to "completed" (reserved for /complete-task command)
- Detects and blocks weasel words that claim completion while admitting failures
- Handles robust JSON parsing to extract responses even when wrapped in markdown
- Provides clear explanations when blocking edits
- Allows legitimate documentation of completed work

Key implementation challenges solved:
- Fixed TypeScript types to match PreToolUse hook specification
- Improved JSON parsing to handle various response formats from Claude
- Refined validation prompt to distinguish between legitimate documentation and inappropriate completion claims
- Added comprehensive test coverage for all validation scenarios

All tests pass, TypeScript checks pass, and Biome linting passes. The hook is actively protecting task files from inappropriate edits.

<!-- github_issue: 29 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/29 -->
<!-- issue_branch: 29-task-file-edit-validation-enhancement -->