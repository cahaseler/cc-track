# Feature Specification: TASK_057: Remove Post-Compact/SessionStart Hook

**Feature ID**: `057`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Migrated from old task structure

## Requirements

- [x] Delete `src/hooks/post-compact.ts`
- [x] Delete `src/hooks/post-compact.test.ts`
- [x] Remove SessionStart hook section from `.claude/settings.json` (lines 52-63)
- [x] Remove post_compact entry from `.claude/track.config.json` (lines 11-14)
- [x] Remove post_compact from `templates/track.config.json`
- [x] Remove post-compact case from `src/commands/hook.ts`
- [x] Remove import statement for postCompactHook from `src/commands/hook.ts`
- [x] Remove any SessionStart hook setup from `src/commands/init.ts`
- [x] Remove SessionStart from HookEventName in `src/types.ts` if present
- [x] Update `src/commands/hook.test.ts` to remove post-compact tests
- [x] Update `src/lib/config.test.ts` if it has post-compact references
- [x] Remove post-compact references from code_index.md
- [x] Clean up any other documentation mentioning post-compact/SessionStart
- [x] Remove item #6 about reviewing session start hook instructions from backlog
- [x] Remove item #9 about stop-review message filtering from backlog (already implemented)

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
