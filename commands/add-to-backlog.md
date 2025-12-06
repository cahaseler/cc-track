---
shortname: add-to-backlog
description: Quickly add an item to the backlog without disrupting current work
usage: /add-to-backlog "Your idea or bug description"
allowed-tools: Bash(bun:*), Skill
---

# Add to Backlog

Invoke the `cc-track:cc-track-tools` skill to get the script path, then run:

```bash
bun {base_directory}/scripts/backlog.ts "$ARGUMENTS"
```

Do not change your current focus or priorities. Continue with your work if there was a clear task you are working on.
