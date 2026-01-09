---
description: Test if ${CLAUDE_PLUGIN_ROOT} is substituted in bash execution
allowed-tools: Bash(echo:*), Bash(ls:*), Bash(bun:*)
---

# Test Plugin Root Variable

This command tests whether `${CLAUDE_PLUGIN_ROOT}` is properly substituted in bash execution.

## Test 1: Inline echo (immediate execution)

!`echo "Plugin root is: ${CLAUDE_PLUGIN_ROOT}"`

## Test 2: List scripts directory (inline)

!`ls "${CLAUDE_PLUGIN_ROOT}/skills/cc-track-tools/scripts/" 2>/dev/null || echo "FAILED: Cannot list scripts directory"`

## Analysis

If Test 1 shows the actual path (not the literal `${CLAUDE_PLUGIN_ROOT}`), the fix works.
If it shows the literal string or empty, we still need the skill workaround.
