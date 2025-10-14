# TASK_058: Fix Code Review Error: Convert String Prompts to AsyncIterable Format

## Purpose
Fix the code review feature that's failing with "canUseTool callback requires --input-format stream-json" error by converting string prompts to the required AsyncIterable<SDKUserMessage> format when using canUseTool.

## Status
**in_progress** - Started: 2025-09-15 15:36

## Requirements
- [x] Add helper function in `src/lib/claude-sdk.ts` to convert strings to AsyncIterable<SDKUserMessage>
- [x] Update `performCodeReview()` function (line 428) to use streaming format
- [x] Update capture-plan hook's task enrichment (line 216) to use streaming format
- [x] Import necessary SDKUserMessage type from '@anthropic-ai/claude-code'
- [x] Test the fix by running `/prepare-completion` on a task with code review enabled

## Success Criteria
- Code review feature executes without "canUseTool callback requires --input-format stream-json" error
- Both affected functions (`performCodeReview()` and capture-plan task enrichment) use proper streaming format
- No regression in existing functionality
- `/prepare-completion` command works successfully with code review enabled

## Technical Approach
1. **Create Helper Function**: Implement `createMessageStream()` in `src/lib/claude-sdk.ts` that converts string prompts to AsyncIterable<SDKUserMessage>
2. **Update performCodeReview()**: Replace direct string prompt usage with `createMessageStream(p)`
3. **Update Capture-Plan Hook**: Modify task enrichment logic to use the same streaming pattern
4. **Type Safety**: Ensure proper TypeScript imports and type annotations

## Recent Progress
- Successfully identified the root cause: Claude Code SDK requires AsyncIterable<SDKUserMessage> format when using canUseTool
- Implemented `createMessageStream()` helper function with proper message structure including required `role: 'user'` field
- Updated `performCodeReview()` to use streaming format
- Updated capture-plan hook's task enrichment to use streaming format
- Refactored to eliminate code duplication by exporting helper from claude-sdk.ts
- Added documentation explaining session_id and parent_tool_use_id values
- Verified fix works - code review ran successfully and generated comprehensive review
- Removed completed item from backlog

<!-- github_issue: 60 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/60 -->
<!-- issue_branch: 60-task_058-fix-code-review-error-convert-string-prompts-to-asynciterable-format -->