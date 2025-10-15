---
shortname: migrate
description: Migrate from old task structure to spec-driven workflow format
usage: /migrate
allowed-tools: Bash(bun run ${CLAUDE_PLUGIN_ROOT}/commands/scripts/migrate.ts)
---

!`bun run ${CLAUDE_PLUGIN_ROOT}/commands/scripts/migrate.ts`

The migration process will:
1. Scan for old `.claude/tasks/TASK_*.md` files
2. Convert each to new spec-driven structure in `.claude/specs/NNN-feature-name/`
3. Backup original files to `.claude/tasks.backup/`
4. Update references in CLAUDE.md if needed

After migration completes, review the conversion results and verify the new spec structure is correct.
