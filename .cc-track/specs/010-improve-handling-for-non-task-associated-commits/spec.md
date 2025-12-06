# Feature Specification: Improve Handling for Non-Task Associated Commits

**Feature ID**: `010`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Generate meaningful commit messages for work not associated with tasks and suggest task creation after detecting patterns of non-task work.

## Requirements

- [x] Generate meaningful commit messages using Haiku for non-task work
- [x] Track consecutive non-task commits ~~in `.claude/non_task_commits.json`~~ using git log directly
- [x] Suggest task creation after 3+ consecutive non-task commits
- [x] ~~Use "[exploratory]" prefix instead of "[wip]" for non-task commits~~ Use clean commit messages without fixed prefixes
- [x] ~~Reset tracking when a task is created or acknowledged~~ No tracking file needed

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
