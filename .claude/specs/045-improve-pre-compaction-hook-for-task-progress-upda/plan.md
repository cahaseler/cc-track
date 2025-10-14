# Improve Pre-Compaction Hook for Task Progress Updates

**Purpose:** Replace the current error pattern extraction in the pre-compact hook with automatic task progress updates using the existing log parser and Claude SDK to keep active tasks current with recent development progress.

**Status:** completed
**Started:** 2025-09-14 20:18
**Task ID:** 045

## Requirements
- [x] Remove `ErrorPatternExtractor` class and related functions
- [x] Remove `analyzeErrorPatterns` and `updateLearnedMistakes` functions
- [x] Remove all references to learned_mistakes.md file
- [x] Add active task check using `getActiveTaskId` from `../lib/claude-md`
- [x] Implement early exit if no active task exists
- [x] Parse recent transcript messages using `ClaudeLogParser` from `../lib/log-parser`
- [x] Configure parser to get last 50 messages in simplified string format
- [x] Integrate Claude SDK's `prompt` function with Sonnet model
- [x] Set 2-minute timeout for Claude SDK calls
- [x] Allow only Read, Grep, Edit tools for Claude
- [x] Create prompt that updates task progress sections only
- [x] Ensure status field is never changed by the hook
- [x] Update hook configuration in track.config.json
- [x] Add Claude SDK dependency with proper type interface
- [x] Create mock tests for all scenarios (no task, success, timeout, errors)
- [x] Update `src/hooks/pre-compact.test.ts` for new functionality

## Success Criteria
- [x] Hook successfully updates active task files with recent progress when compaction occurs
- [x] Hook exits gracefully when no active task is present
- [x] Task status field remains unchanged (only `/complete-task` can modify it)
- [x] All error scenarios are handled without blocking compaction
- [x] Test coverage includes all major code paths
- [x] Code is reduced from ~400 lines to ~100 lines by removing error pattern logic (actually ~175 lines)

## Technical Approach
Complete rewrite of `src/hooks/pre-compact.ts` to:
1. Check for active task using existing claude-md utilities
2. Parse last 50 transcript messages using simplified log parser format
3. Send parsed messages to Claude SDK with specific instructions to update only progress sections
4. Handle all error cases gracefully without failing compaction process

## Recent Progress

- Successfully removed all error pattern extraction code (~400 lines)
- Implemented new pre-compact hook with task progress updates
- Added active task detection with early exit
- Integrated ClaudeLogParser for transcript parsing
- Configured Claude SDK with Sonnet model and 2-minute timeout
- Created comprehensive test suite with 9 passing tests
- Built and tested the hook manually with real transcripts
- Verified hook runs successfully and communicates with Claude SDK
- Cleaned up learned_mistakes.md file by removing duplicates and questionable entries
- Removed learned_mistakes.md from CLAUDE.md to prevent automatic context inclusion
- Reorganized learned_mistakes.md by topics instead of sessions for better organization
- Added backlog item to remove error pattern extraction from pre-compact hook entirely
- Fixed critical bug: Added cwd parameter support to Claude SDK (was hardcoded to tmpdir())
- Increased maxTurns from 1 to 20 to allow Claude sufficient turns for file investigation
- Added debug logging to track Claude's full output for better debugging
- Successfully tested hook with real transcript - it updated task file correctly

## Current Focus

Task completed on 2025-09-14

## Lessons Learned
- The log parser returns a single string when format is 'plaintext', not an array
- Claude SDK needs sufficient context in transcript to identify meaningful progress
- The hook works correctly but may not always make visible updates if progress isn't clear from transcript
- Stop-review hook auto-commits changes, making git diff appear empty after updates
- Critical SDK limitation discovered: Was hardcoded to run in tmpdir(), preventing project file access
- maxTurns must be set high (20+) to allow Claude to investigate files thoroughly before editing
- Debug logging is essential for understanding what Claude is doing inside the SDK

<!-- github_issue: 31 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/31 -->
<!-- issue_branch: 31-improve-pre-compaction-hook-for-task-progress-updates -->