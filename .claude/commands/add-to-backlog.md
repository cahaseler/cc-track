---
shortname: add-to-backlog
description: Quickly add an item to the backlog without disrupting current work
usage: /add-to-backlog "Your idea or bug description"
---

!`echo "- $(date +%Y-%m-%d): $1" >> .claude/backlog.md && echo "✅ Added to backlog: $1"`