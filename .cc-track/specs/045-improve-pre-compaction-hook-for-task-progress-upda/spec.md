# Feature Specification: Improve Pre-Compaction Hook for Task Progress Updates

**Feature ID**: `045`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Replace the current error pattern extraction in the pre-compact hook with automatic task progress updates using the existing log parser and Claude SDK to keep active tasks current with recent development progress.

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

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
