---
shortname: add-to-backlog
description: Quickly add an item to the backlog without disrupting current work
usage: /add-to-backlog "Your idea or bug description"
allowed-tools: Bash
---

!`if [ -z "$ARGUMENTS" ]; then echo "❌ No item provided. Please specify what to add to the backlog."; echo ""; echo "Claude should:"; echo "1. Ask for details about what to add"; echo "2. Add the item to backlog once provided"; echo "3. Return focus to the current task"; exit 1; else echo "- $ARGUMENTS" >> .claude/backlog.md && echo "✅ Added to backlog: $ARGUMENTS"; fi`

Do not change your current focus or priorities. Continue working as you have been, this backlog item will be handled later.