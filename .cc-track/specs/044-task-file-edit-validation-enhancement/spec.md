# Feature Specification: Task File Edit Validation Enhancement

**Feature ID**: `044`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Create a new PreToolUse hook that validates edits to task files using Claude SDK to prevent premature completion claims and weasel words, ensuring tasks are only marked complete via `/complete-task` command.

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

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
