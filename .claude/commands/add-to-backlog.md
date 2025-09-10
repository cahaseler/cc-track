---
shortname: add-to-backlog
description: Quickly add an item to the backlog without disrupting current work
usage: /add-to-backlog "Your idea or bug description"
allowed-tools: Bash
---

!`if [ -z "$ARGUMENTS" ]; then echo "❌ No item provided. Please specify what to add to the backlog."; echo ""; echo "Please tell me what you'd like to add to the backlog, then I'll add it and return to the current task."; else echo "- $ARGUMENTS" >> .claude/backlog.md && echo "✅ Added to backlog: $ARGUMENTS"; fi`

Do not change your current focus or priorities. Continue working as you have been, this backlog item will be handled later.