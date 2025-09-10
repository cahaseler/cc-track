---
shortname: add-to-backlog
description: Quickly add an item to the backlog without disrupting current work
usage: /add-to-backlog "Your idea or bug description"
allowed-tools: Bash
---

!`echo "- $ARGUMENTS" >> .claude/backlog.md && echo "✅ Added to backlog: $ARGUMENTS"`
Do not change your current focus or priorities. Continue working as you have been, this backlog item will be handled later.