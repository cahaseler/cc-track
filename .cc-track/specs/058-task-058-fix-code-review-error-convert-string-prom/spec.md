# Feature Specification: TASK_058: Fix Code Review Error: Convert String Prompts to AsyncIterable Format

**Feature ID**: `058`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Migrated from old task structure

## Requirements

- [x] Add helper function in `src/lib/claude-sdk.ts` to convert strings to AsyncIterable<SDKUserMessage>
- [x] Update `performCodeReview()` function (line 428) to use streaming format
- [x] Update capture-plan hook's task enrichment (line 216) to use streaming format
- [x] Import necessary SDKUserMessage type from '@anthropic-ai/claude-code'
- [x] Test the fix by running `/prepare-completion` on a task with code review enabled

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
