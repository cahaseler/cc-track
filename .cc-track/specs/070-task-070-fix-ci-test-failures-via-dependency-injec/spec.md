# Feature Specification: TASK_070: Fix CI Test Failures via Dependency Injection

**Feature ID**: `070`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Migrated from old task structure

## Requirements

- [x] Update `src/lib/code-review/index.ts` to add optional `deps` parameter to `performCodeReview`
- [x] Accept `performClaudeReview` and `performCodeRabbitReview` as injectable dependencies
- [x] Default to real implementations when dependencies not provided
- [x] Update `src/lib/code-review/index.test.ts` to remove ALL `mock.module()` calls
- [x] Pass mock functions via deps parameter instead of global mocks
- [x] Verify tests remain isolated with no global module pollution
- [x] Ensure pattern matches existing DI approach used in `coderabbit.test.ts`

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
