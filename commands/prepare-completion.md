---
allowed-tools: Bash(bun run ${CLAUDE_PLUGIN_ROOT}/commands/scripts/prepare-completion.ts), Edit, Read, Bash(bunx tsc:*), Bash(bunx biome:*), Bash(bun test:*)
description: Prepare the current active task for completion (Phase 1 of task completion workflow)
---

# Prepare Task for Completion Command

!`bun run ${CLAUDE_PLUGIN_ROOT}/commands/scripts/prepare-completion.ts`

Note: If you have the private journal MCP available, consider using mcp__private-journal__process_thoughts to record insights about technical challenges and learnings.