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

**Backlog command bug (initial)**: The `!` prefix requires backticks around the command for bash execution. Original syntax `!echo "..."` was treated as literal text. Correct syntax is `` !`echo "..."` ``.

**Backlog command bug (second issue)**: After adding backticks, Claude Code's permission system blocks `$()` command substitution in bash commands, regardless of allowed-tools. The date expansion `$(date +%Y-%m-%d)` triggers this security check with error: "Command contains $() command substitution".

**Solution**: Use the existing `backlog.ts` script which uses `deps.time.todayISO()` for reliable system date. This follows the skill + script pattern used by other commands and avoids both the bash execution and permission issues.

---

## Success Criteria
- [ ] `/cc-track:add-to-backlog "test"` successfully appends to backlog.md
- [ ] complete-task.md contains warning about branch switch behavior
