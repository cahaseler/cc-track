# Feature Specification: TASK_060: Fix Capture-Plan Hook to Commit Task Files Without CLAUDE.md Updates

**Feature ID**: `060`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Migrated from old task structure

## Requirements

- [x] Remove CLAUDE.md update from main branch execution in capture-plan hook
- [x] Add commitTaskFilesToMain() function to commit only task files (.claude/tasks/ and .claude/plans/)
- [x] Implement automatic push of task files to main branch
- [x] Move CLAUDE.md update to occur after branch creation (on feature branch)
- [x] Ensure main branch CLAUDE.md always points to no_active_task.md
- [x] Maintain conventional commit format for task file commits
- [x] Add proper error handling for git operations
- [ ] Verify no merge conflicts occur when PRs are merged

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
