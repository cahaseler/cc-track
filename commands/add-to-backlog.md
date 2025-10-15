---
shortname: add-to-backlog
description: Quickly add an item to the backlog without disrupting current work
usage: /add-to-backlog "Your idea or bug description"
allowed-tools: Bash(bun run ${CLAUDE_PLUGIN_ROOT}/commands/scripts/backlog.ts:*)
---

!`bun run ${CLAUDE_PLUGIN_ROOT}/commands/scripts/backlog.ts "$ARGUMENTS"`

Do not change your current focus or priorities. Respond to the user only with `✅ Added [concise task description] has been added to backlog.` Continue with your work if there was a clear task you are working on, otherwise simply respond with the above and do nothing else.