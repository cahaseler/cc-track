# Feature Specification: Fix Backlog Command and Complete-Task Warning

**Feature ID**: `106`
**Branch**: `106-fix-backlog-command-and-complete-task-warning`
**Created**: 2025-12-06
**Status**: Specified

## Quick Summary

Two minor fixes:
1. Fix `/cc-track:add-to-backlog` command - bash not executing due to missing backticks
2. Add warning to `/cc-track:complete-task` command about branch switch to main

---

## Requirements

### Fix 1: Backlog Command (FR-1xx)
- **FR-101**: The `!echo` line in add-to-backlog.md MUST use backtick syntax: `` !`command` ``
- **FR-102**: After fix, running `/cc-track:add-to-backlog "text"` MUST append timestamped entry to backlog.md

### Fix 2: Complete-Task Warning (FR-2xx)
- **FR-201**: The complete-task.md command MUST include a note warning Claude that the script switches back to main branch
- **FR-202**: Warning should explain that files appearing "reverted" is expected behavior, not an error

---

## Root Cause Analysis

**Backlog command bug**: The `!` prefix requires backticks around the command for bash execution. Current syntax `!echo "..."` is treated as literal text. Correct syntax is `` !`echo "..."` ``.

Evidence: `commands/specify.md` uses `` !`ls ...` `` and executes correctly.

---

## Success Criteria
- [ ] `/cc-track:add-to-backlog "test"` successfully appends to backlog.md
- [ ] complete-task.md contains warning about branch switch behavior
