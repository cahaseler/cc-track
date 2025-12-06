# Feature Specification: TASK_090: Fix Semantic Release by Using Squash Merge Strategy

**Feature ID**: `090`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Migrated from old task structure

## Requirements

- [ ] Update GitHub repository settings to use squash merge as default
- [ ] Configure squash merge to use PR title for commit messages
- [ ] Modify `src/commands/complete-task.ts` to create PRs with conventional commit titles
- [ ] Change PR title format from "Complete TASK_XXX" to "feat: complete TASK_XXX - [Task Title]"
- [ ] Create manual release for already-merged changes since v1.39.0
- [ ] Document new merge process for contributors
- [ ] Test that semantic-release properly detects squashed commits

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
