# Feature Specification: Add Hook Status Display to Statusline

**Feature ID**: `071`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Display recent stop-review hook messages in the statusline as a workaround for Claude Code hiding hook outputs.

## Requirements

- [ ] Modify stop-review hook to write status to `.claude/hook-status.json` with timestamp and message
- [ ] Update statusline script to read hook status and display recent messages (< 60 seconds old)
- [ ] Add third line to statusline when recent hook message exists
- [ ] Format hook status line with `🛤️ [message]` to match existing hook emoji
- [ ] Only write meaningful statuses (exclude "No changes to commit")
- [ ] Test with different stop-review statuses and verify timing

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
