# Feature Specification: Create Git Diff Summary Utility Using Claude SDK

**Feature ID**: `042`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Create a comprehensive utility function that uses the existing Claude SDK wrapper to summarize git diffs, following established patterns for dependency injection and testing.

## Requirements

- [x] Create `src/lib/diff-summary.ts` with `DiffSummary` class and `DiffSummaryInterface`
- [x] Implement `summarizeDiff(diff: string)` method for single diff summarization
- [x] Implement `summarizeDiffs(diffs: string[])` method for multiple diffs
- [x] Use constructor injection pattern for ClaudeSDK and logger dependencies
- [x] Use haiku model for cost-efficient summarization
- [x] Add 15000ms timeout for API calls
- [x] Implement diff truncation for large diffs (>3000 chars)
- [x] Include proper error handling and logging
- [x] Create `src/lib/diff-summary.test.ts` with comprehensive unit tests
- [x] Test successful single and multiple diff summaries
- [x] Test error handling (SDK failures, timeouts)
- [x] Test empty/invalid input handling
- [x] Use dependency injection with mock ClaudeSDK and logger
- [x] Create `src/lib/diff-summary.integration.test.ts` with real SDK testing (completed then removed per user request)
- [x] Follow existing test patterns from git-helpers.test.ts

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
