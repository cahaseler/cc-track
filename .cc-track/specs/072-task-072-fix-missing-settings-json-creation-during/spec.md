# Feature Specification: TASK_072: Fix Missing settings.json Creation During Setup

**Feature ID**: `072`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Migrated from old task structure

## Requirements

- [ ] Update `src/commands/init.ts` to add Step 5 for settings.json creation
- [ ] Create dynamic settings.json generation based on enabled features in track.config.json
- [ ] Map each track.config.json feature to corresponding settings.json hooks:
  - [ ] `capture_plan` → ExitPlanMode hook
  - [ ] `stop_review` → Stop hook
  - [ ] `edit_validation` → PostToolUse hook for Edit/MultiEdit
  - [ ] `pre_tool_validation` → PreToolUse hook for Edit/MultiEdit
  - [ ] `pre_compact` → PreCompact hook
  - [ ] `statusline` → statusLine configuration
  - [ ] `code_review` → validation-passed hook
- [ ] Use correct command paths with `cc-track hook` format
- [ ] Test the complete setup flow to verify settings.json is created properly
- [ ] Verify hooks actually execute after setup completion

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
