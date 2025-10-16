---
shortname: add-to-backlog
description: Quickly add an item to the backlog without disrupting current work
usage: /add-to-backlog "Your idea or bug description"
allowed-tools: Read, Edit
---

# Add to Backlog

Add the user's item to `.claude/backlog.md` with a timestamp:

1. Read `.claude/backlog.md`
2. Get today's date in format `YYYY-MM-DD` (e.g., `2025-10-16`)
3. Append to the file: `- [YYYY-MM-DD] {user's item}`
4. Respond only with: `✅ Added to backlog`

Do not change your current focus or priorities. Continue with your work if there was a clear task you are working on, otherwise simply respond with the above and do nothing else.