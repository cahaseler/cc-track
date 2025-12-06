# Feature Specification: TASK_095: Add Codex Code Review Option

**Feature ID**: `095`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Migrated from old task structure

## Requirements

- [x] Update `CodeReviewTool` type union in types.ts to include `'codex'`
- [x] Create `src/lib/code-review/codex.ts` with `performCodexReview()` function
- [x] Implement execSync call to Codex CLI with comprehensive review prompt
- [x] Add 30-minute timeout handling (matching CodeRabbit pattern)
- [x] Parse Codex output and save to markdown file in code-reviews/ directory
- [x] Include dependency injection pattern for testing (execSync, fileOps, logger)
- [x] Update `src/lib/code-review/index.ts` to include Codex option
- [x] Add Codex import and case to switch statement
- [x] Update `CodeReviewDeps` interface with `performCodexReview`
- [x] Update prepare-completion.ts with Codex timeout display logic
- [x] Write comprehensive tests in `src/lib/code-review/codex.test.ts`
- [x] Test successful review, timeout handling, error cases, CLI not installed, and dependency injection
- [x] Update config.ts to include 'codex' in type definitions (identified by Codex code review)

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
