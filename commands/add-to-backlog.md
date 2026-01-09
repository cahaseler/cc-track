---
shortname: add-to-backlog
description: Quickly add an item to the backlog without disrupting current work
usage: /add-to-backlog "Your idea or bug description"
allowed-tools: Bash(bun:*)
---

# Add to Backlog

Run the backlog script directly:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/skills/cc-track-tools/scripts/backlog.ts" "$ARGUMENTS"
```

Do not change your current focus or priorities. Continue with your work if there was a clear task you are working on.
