---
shortname: add-to-backlog
description: Quickly add an item to the backlog without disrupting current work
usage: /add-to-backlog "Your idea or bug description"
allowed-tools: Bash(echo:*)
---

!echo "- [$(date +%Y-%m-%d)] $ARGUMENTS" >> .cc-track/backlog.md

✅ Added to backlog

Do not change your current focus or priorities. Continue with your work if there was a clear task you are working on.
