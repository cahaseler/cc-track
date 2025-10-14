# Feature Specification: TASK_093: Fix Statusline Token Tracking for Sonnet 4.5

**Feature ID**: `093`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Migrated from old task structure

## Requirements

- [x] Update ccusage dependency from 16.2.3 to latest 17.1.1
- [x] Keep ccusage statusline call but pass full Claude Code JSON (session_id, transcript_path, etc.)
- [x] Keep regex parsing of ccusage output for tokens/rate/window
- [x] Add static overhead adjustment (61k) to account for Claude Code's reserved + system tokens
- [x] Calculate adjusted percentage based on 200K window
- [x] Keep `getTodaysCost()` function for daily cost calculations
- [x] Maintain model name, branch, and task extraction functionality
- [x] Preserve API timer configuration logic
- [x] Update tests to match new implementation
- [x] Test with actual Claude Code session to verify accuracy

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
