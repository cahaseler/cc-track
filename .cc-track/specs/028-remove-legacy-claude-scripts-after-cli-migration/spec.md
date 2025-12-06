# Feature Specification: Remove Legacy .claude Scripts After CLI Migration

**Feature ID**: `028`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Clean up legacy .claude scripts and hooks that have been fully migrated to the new CLI structure under src/, removing 14 obsolete files while preserving all functionality.

## Requirements

- [x] Delete 5 legacy hook files from `.claude/hooks/`
  - [x] Remove `capture_plan.ts` (migrated to `src/hooks/capture-plan.ts`)
  - [x] Remove `pre_compact.ts` (migrated to `src/hooks/pre-compact.ts`)
  - [x] Remove `post_compact.ts` (migrated to `src/hooks/post-compact.ts`)
  - [x] Remove `stop_review.ts` (migrated to `src/hooks/stop-review.ts`)
  - [x] Remove `edit_validation.ts` (migrated to `src/hooks/edit-validation.ts`)
- [x] Delete 4 legacy script files from `.claude/scripts/`
  - [x] Remove `init-templates.ts` (migrated to `cc-track init`)
  - [x] Remove `git-session.ts` (migrated to `cc-track git-session`)
  - [x] Remove `add-to-backlog.ts` (migrated to `cc-track backlog`)
  - [x] Remove `complete-task.ts` (migrated to `cc-track complete-task`)
- [x] Delete 4 legacy library files from `.claude/lib/`
  - [x] Remove `logger.ts` (migrated to `src/lib/logger.ts`)
  - [x] Remove `config.ts` (migrated to `src/lib/config.ts`)
  - [x] Remove `git-helpers.ts` (migrated to `src/lib/git-helpers.ts`)
  - [x] Remove `github-helpers.ts` (migrated to `src/lib/github-helpers.ts`)
- [x] Delete legacy shell script
  - [x] Remove `.claude/statusline.sh` (migrated to `cc-track statusline`)
- [x] Update knip.json to remove reference to `.claude/scripts/*.ts`
- [x] Update code_index.md to remove references to old script locations
- [x] Preserve all command files (`.claude/commands/*.md`)
- [x] Preserve all context files and configuration files
- [x] Preserve essential directories (`plans/`, `tasks/`, `utils/`)

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
