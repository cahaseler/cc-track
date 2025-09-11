# Hook Functionality Differences: .claude → src/ CLI

This document lists only behavioral differences between the original .claude hook scripts and the refactored src CLI modules.

## Capture Plan
- Diagnostics: original wrote debug lines to `/tmp/capture_plan_debug.log`; refactor removes this ad‑hoc file logging and uses structured logger only.

## Edit Validation
- Blocking vs non‑blocking: original only annotated issues; refactor blocks edits with `{ decision: 'block' }` on failures.
- ✅ FIXED: Command resolution now properly uses configured commands from `.claude/track.config.json`.
- Edge cases: refactor adds explicit handling for `ETIMEDOUT` (blocks with timeout message) and `ENOENT` for new files (skips validation).
- Output channel: original used `hookSpecificOutput.additionalContext`; refactor returns `reason` (string) with a blocking decision.

## Summary of Functional Differences
- Capture Plan: removed ad‑hoc `/tmp` debug logging; now relies solely on logger.
- Edit Validation: blocks on failures; uses configured commands from track.config.json; adds explicit timeout/new‑file handling; returns `reason` instead of `hookSpecificOutput` for issues.
