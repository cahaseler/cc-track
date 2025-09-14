# Improve Pre-Compaction Hook for Task Progress Updates

**Purpose:** Replace the current error pattern extraction in the pre-compact hook with automatic task progress updates using the existing log parser and Claude SDK to keep active tasks current with recent development progress.

**Status:** planning
**Started:** 2025-09-14 20:18
**Task ID:** 045

## Requirements
- [ ] Remove `ErrorPatternExtractor` class and related functions
- [ ] Remove `analyzeErrorPatterns` and `updateLearnedMistakes` functions
- [ ] Remove all references to learned_mistakes.md file
- [ ] Add active task check using `getActiveTaskId` from `../lib/claude-md`
- [ ] Implement early exit if no active task exists
- [ ] Parse recent transcript messages using `ClaudeLogParser` from `../lib/log-parser`
- [ ] Configure parser to get last 50 messages in simplified string format
- [ ] Integrate Claude SDK's `prompt` function with Sonnet model
- [ ] Set 2-minute timeout for Claude SDK calls
- [ ] Allow only Read, Grep, Edit tools for Claude
- [ ] Create prompt that updates task progress sections only
- [ ] Ensure status field is never changed by the hook
- [ ] Update hook configuration in track.config.json
- [ ] Add Claude SDK dependency with proper type interface
- [ ] Create mock tests for all scenarios (no task, success, timeout, errors)
- [ ] Update `src/hooks/pre-compact.test.ts` for new functionality

## Success Criteria
- Hook successfully updates active task files with recent progress when compaction occurs
- Hook exits gracefully when no active task is present
- Task status field remains unchanged (only `/complete-task` can modify it)
- All error scenarios are handled without blocking compaction
- Test coverage includes all major code paths
- Code is reduced from ~400 lines to ~100 lines by removing error pattern logic

## Technical Approach
Complete rewrite of `src/hooks/pre-compact.ts` to:
1. Check for active task using existing claude-md utilities
2. Parse last 50 transcript messages using simplified log parser format
3. Send parsed messages to Claude SDK with specific instructions to update only progress sections
4. Handle all error cases gracefully without failing compaction process

## Current Focus
Begin by analyzing the existing pre-compact hook structure and identifying all error pattern extraction code that needs to be removed.

## Open Questions & Blockers
- Need to verify the exact interface for Claude SDK's `prompt` function
- Confirm the proper import path for `getActiveTaskId` function
- Determine if additional configuration is needed for Claude SDK integration
- Verify that log parser's simplified format provides sufficient context for task updates

## Next Steps
1. Examine current `src/hooks/pre-compact.ts` to understand existing structure
2. Review `../lib/claude-md` and `../lib/log-parser` interfaces
3. Plan the new hook implementation focusing on active task detection first
4. Design the Claude SDK integration with proper error handling

<!-- github_issue: 31 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/31 -->
<!-- issue_branch: 31-improve-pre-compaction-hook-for-task-progress-updates -->