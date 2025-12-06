---
shortname: migrate
description: Migrate from old task structure to spec-driven workflow format
usage: /migrate
allowed-tools: Bash, Edit, Read
---

# Migrate to Spec-Driven Structure

Migrate old cc-track task structure to new spec-driven format.

## Step 1: Check for Active Task

Read `CLAUDE.md` and look for a reference like `@.claude/tasks/TASK_XXX.md`

**If NO active task found:**
- Inform user: "⚠️ No active task to migrate. Historical task migration is temporarily unavailable due to a Claude Code plugin issue. You can start using the new workflow with `/specify` for new tasks."
- Stop here

**If active task found:**
- Continue to Step 2

## Step 2: Migrate Active Task

Extract the task ID (e.g., `001` from `TASK_001.md`)

1. Read the old task file: `.claude/tasks/TASK_{taskId}.md`
2. Extract from the content:
   - Title (first `# ` heading)
   - Branch name (from `<!-- branch: xxx -->` comment if present)
   - GitHub issue (from `<!-- github_issue: NNN -->` if present)
   - GitHub URL (from `<!-- github_url: xxx -->` if present)

3. Generate feature name from title (lowercase, replace spaces with hyphens, remove special chars)

4. Create directory: `.claude/specs/{taskId}-{feature-name}/`

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

Review and refine this specification before proceeding to `/plan`.
```

6. Create `plan.md` - copy the entire old task file content here

7. Create `tasks.md`:
```markdown
# Tasks: {Title}

**Feature ID**: `{taskId}`
**Note**: This tasks file was created during migration.

## Migration Note

Task breakdown should be regenerated using `/plan` and `/tasks` commands based on the current plan and spec.

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
- Converted from tasks/TASK_{taskId}.md to specs/{taskId}-{feature-name}/ directory structure
- Original content preserved in plan.md
- Spec and tasks files created as placeholders for refinement

---

## Next Steps

1. Review and enhance spec.md with clear requirements
2. Run `/plan` to create technical design
3. Run `/tasks` to generate task breakdown
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

10. Update `CLAUDE.md`: Replace `@.claude/tasks/TASK_{taskId}.md` with `@.claude/specs/{taskId}-{feature-name}/spec.md`

11. Backup old task: Copy `.claude/tasks/TASK_{taskId}.md` to `.claude/tasks.backup/TASK_{taskId}.md`

12. Delete old task file: `.claude/tasks/TASK_{taskId}.md`

## Step 3: Report Results

Report to user:
- ✅ Migrated active task TASK_{taskId} to `.claude/specs/{taskId}-{feature-name}/`
- 📦 Original task backed up to `.claude/tasks.backup/`
- 📝 Updated CLAUDE.md reference
- ℹ️ Historical task migration temporarily unavailable - will be restored when Claude Code plugin issue is resolved
- 💡 You can continue working with the new structure immediately
