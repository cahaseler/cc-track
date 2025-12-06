# Feature Specification: TASK_062: Clean up SDK type usage across codebase

**Feature ID**: `062`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Migrated from old task structure

## Requirements

- [ ] Import proper SDK types (`SDKMessage`, `Options`, `Query`) in claude-sdk.ts
- [ ] Remove generic `type SDKMessage = unknown` definition
- [ ] Update prompt() function to use proper `Options` type from SDK
- [ ] Replace `stream as AsyncGenerator<SDKMessage, void>` with proper typing
- [ ] Add type guards where appropriate instead of type assertions
- [ ] Improve error handling types with proper interfaces
- [ ] Document remaining necessary type assertions with explanatory comments
- [ ] Fix type assertions in capture-plan.ts hook
- [ ] Address type safety issues in github-helpers.ts
- [ ] Review and fix similar issues in git-helpers.ts and diff-summary.ts

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
