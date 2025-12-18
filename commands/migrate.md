---
shortname: migrate
description: Migrate from old task structure to spec-driven workflow format
usage: /migrate
---

# Migrate to Spec-Driven Structure

Migrate old cc-track task structure to new directory layout (`.claude/` → `.cc-track/`).

## Step 1: Detect Current State

Read `CLAUDE.md` and check for active task references:

**Case A: Old task format** - `@.claude/tasks/TASK_XXX.md`
- Continue to Step 2A (Old task → new spec structure in `.cc-track/`)

**Case B: Current spec format in old directory** - `@.claude/specs/NNN-feature-name/`
- Continue to Step 2B (Directory rename `.claude/` → `.cc-track/`)

**Case C: Already using `.cc-track/`** - `@.cc-track/specs/NNN-feature-name/`
- Inform user: "✅ Already using `.cc-track/` directory structure. No migration needed."
- Stop here

**Case D: No active task**
- Inform user: "⚠️ No active task to migrate. You can start using the new workflow with `/cc-track:specify` for new tasks."
- Stop here

## Step 2A: Migrate from Old Task Format

**For `@.claude/tasks/TASK_XXX.md` references:**

Extract the task ID (e.g., `001` from `TASK_001.md`)

1. Read the old task file: `.claude/tasks/TASK_{taskId}.md`
2. Extract from the content:
   - Title (first `# ` heading)
   - Branch name (from `<!-- branch: xxx -->` comment if present)
   - GitHub issue (from `<!-- github_issue: NNN -->` if present)
   - GitHub URL (from `<!-- github_url: xxx -->` if present)

3. Generate feature name from title (lowercase, replace spaces with hyphens, remove special chars)

4. Create directory: `.cc-track/specs/{taskId}-{feature-name}/`

5. Create `spec.md`:
```markdown
# Feature Specification: {Title}

**Feature ID**: `{taskId}`
**Created**: {today's date YYYY-MM-DD}
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Migrated from old task structure

## Requirements

- [Requirement to be defined based on plan.md]

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Review and refine this specification before proceeding to `/cc-track:plan`.
```

6. Create `plan.md` - copy the entire old task file content here

7. Create `tasks.md`:
```markdown
# Tasks: {Title}

**Feature ID**: `{taskId}`
**Note**: This tasks file was created during migration.

## Migration Note

Task breakdown should be regenerated using `/cc-track:plan` and `/cc-track:tasks` commands based on the current plan and spec.

Alternatively, you can manually populate this file with the task breakdown from the plan.md file.
```

8. Create `progress.md`:
```markdown
# Progress: {Title}

**Feature ID**: `{taskId}`
**Status**: in_progress
**Started**: {today's date and time}
**Last Updated**: {today's date and time}

---

## Migration Note

This progress file was created during migration from old cc-track structure.

### {today's date and time} - Migrated from old structure
- Converted from .claude/tasks/TASK_{taskId}.md to .cc-track/specs/{taskId}-{feature-name}/ directory structure
- Original content preserved in plan.md
- Spec and tasks files created as placeholders for refinement

---

## Next Steps

1. Review and enhance spec.md with clear requirements
2. Run `/cc-track:plan` to create technical design
3. Run `/cc-track:tasks` to generate task breakdown
```

9. Create `.metadata.json`:
```json
{
  "task_id": "{taskId}",
  "feature_name": "{feature-name}",
  "branch": "{branch from old task or taskId-feature-name}",
  "status": "in_progress",
  "started": "{ISO timestamp}",
  "github": {
    "issue": {github issue number if found},
    "url": "{github url if found}"
  }
}
```

10. Update `CLAUDE.md`: Replace `@.claude/tasks/TASK_{taskId}.md` with `@.cc-track/specs/{taskId}-{feature-name}/spec.md`

11. Backup old task: Copy `.claude/tasks/TASK_{taskId}.md` to `.claude/tasks.backup/TASK_{taskId}.md`

12. Delete old task file: `.claude/tasks/TASK_{taskId}.md`

13. Continue to Step 3

## Step 2B: Migrate Directory Structure

**For `@.claude/specs/NNN-feature-name/` references:**

1. Create `.cc-track/` directory if it doesn't exist (use file tools, not shell commands)

2. Move **only cc-track owned files** from `.claude/` to `.cc-track/`:

**Directories to move (if they exist):**
- `.claude/specs` → `.cc-track/specs`
- `.claude/plans-archive` → `.cc-track/plans-archive`
- `.claude/research` → `.cc-track/research`

**Files to move (only these cc-track owned files, if they exist):**
- `.claude/backlog.md` → `.cc-track/backlog.md`
- `.claude/cc-track-workflow.md` → `.cc-track/cc-track-workflow.md`
- `.claude/code_index.md` → `.cc-track/code_index.md`
- `.claude/constitution.md` → `.cc-track/constitution.md`
- `.claude/decision_log.md` → `.cc-track/decision_log.md`
- `.claude/learned_mistakes.md` → `.cc-track/learned_mistakes.md`
- `.claude/no_active_task.md` → `.cc-track/no_active_task.md`
- `.claude/product_context.md` → `.cc-track/product_context.md`
- `.claude/progress_log.md` → `.cc-track/progress_log.md`
- `.claude/system_patterns.md` → `.cc-track/system_patterns.md`
- `.claude/track.config.json` → `.cc-track/track.config.json`
- `.claude/user_context.md` → `.cc-track/user_context.md`

Use Read/Write tools or `git mv` to move files. Cross-platform compatible.

**IMPORTANT**: Do NOT move these files (they belong to Claude Code):
- `settings.json`
- `settings.local.json`
- `commands/` directory
- `hooks/` directory
- Any other files not in the explicit list above

3. Update `CLAUDE.md`: Replace all `@.claude/` references with `@.cc-track/`
   - Replace `@.claude/specs/` → `@.cc-track/specs/`
   - Replace `@.claude/product_context.md` → `@.cc-track/product_context.md`
   - Replace `@.claude/system_patterns.md` → `@.cc-track/system_patterns.md`
   - Replace `@.claude/decision_log.md` → `@.cc-track/decision_log.md`
   - Replace `@.claude/code_index.md` → `@.cc-track/code_index.md`
   - Replace `@.claude/user_context.md` → `@.cc-track/user_context.md`
   - Replace `@.claude/cc-track-workflow.md` → `@.cc-track/cc-track-workflow.md`
   - Replace `@.claude/backlog.md` → `@.cc-track/backlog.md`
   - Replace `@.claude/no_active_task.md` → `@.cc-track/no_active_task.md`
   - Replace any `.claude/specs/` text references → `.cc-track/specs/`
   - Replace any `.claude/progress_log.md` text references → `.cc-track/progress_log.md`

4. Continue to Step 3

## Step 3: Report Results

**For Case A (Old task format):**
```
✅ Migration complete!

Migrated:
- TASK_{taskId} → .cc-track/specs/{taskId}-{feature-name}/
- Original task backed up to .claude/tasks.backup/
- Updated CLAUDE.md references

You can continue working with the new structure immediately.
```

**For Case B (Directory structure migration):**
```
✅ Migration complete!

Migrated cc-track owned files:
- specs/ → .cc-track/specs/
- Context files (backlog.md, constitution.md, etc.) → .cc-track/
- Updated all CLAUDE.md references

Claude Code files remain in .claude/:
- settings.json, settings.local.json

You can continue working with the new .cc-track/ structure immediately.
```
