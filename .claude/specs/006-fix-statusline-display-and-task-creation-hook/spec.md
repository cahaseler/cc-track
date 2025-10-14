# Feature Specification: Fix Statusline Display and Task Creation Hook

**Feature ID**: `006`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Fix statusline regex to show correct token percentage, simplify display, add git branch, and prevent premature task creation

## Requirements

- [x] Fix regex in statusline.sh to extract percentage (42%) instead of token count (84,339)
- [x] Remove block cost and timing displays from statusline
- [x] Reduce emoji usage (keep minimal indicators)
- [x] Add git branch display to statusline
- [x] Fix task detection to parse CLAUDE.md for active task reference
- [x] Change capture_plan hook from PreToolUse to PostToolUse
- [x] Clean up abandoned TASK_005.md file
- [x] Update CLAUDE.md to reference no_active_task.md (kept TASK_006 as current)

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
