# Feature Specification: Consolidate Duplicate Helper Functions Across Codebase

**Feature ID**: `029`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Eliminate duplicate helper functions across the codebase by creating centralized modules for CLAUDE.md operations, git utilities, and config access patterns to reduce ~150 lines of duplicate code and prevent future implementation drift.

## Requirements

- [x] Create src/lib/claude-md.ts module with CLAUDE.md operations
  - [x] `getActiveTaskFile(projectRoot): string | null` - Returns task filename
  - [x] `getActiveTaskId(projectRoot): string | null` - Returns TASK_XXX id
  - [x] `getActiveTaskContent(projectRoot): string | null` - Returns full task content
  - [x] `setActiveTask(projectRoot, taskId): void` - Updates CLAUDE.md to point to task
  - [x] `clearActiveTask(projectRoot): void` - Sets to no_active_task.md
  - [x] `getActiveTaskDisplay(projectRoot): string` - Returns formatted task display
- [x] Update all consumers: statusline, stop-review, post-compact, capture-plan, complete-task
- [x] Consolidate git helpers in existing git-helpers.ts
  - [x] Remove duplicate `hasUncommittedChanges` from stop-review.ts
  - [x] Remove duplicate `getCurrentBranch` from statusline.ts
  - [x] Replace inline default branch detection in complete-task.ts with `getDefaultBranch`
  - [x] Move `isWipCommit` to git-helpers.ts and export it
- [x] Fix config access in complete-task.ts
  - [x] Replace direct JSON.parse calls with config library functions
  - [x] Use `getConfig()` for general config access
  - [x] Use `isGitHubIntegrationEnabled()` for GitHub checks
- [ ] Extract validation utilities to src/lib/validation.ts (optional)
  - [ ] Move TypeScript/Biome/Knip runners from edit-validation
  - [ ] Reuse in complete-task for project-wide checks
- [x] Update all imports in consumer files
- [x] Fix remaining test failures from refactoring

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
