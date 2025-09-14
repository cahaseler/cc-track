---
shortname: cc-track-uninstall
description: Safely uninstall cc-track from this project
model: sonnet
---

# Uninstall cc-track

You are going to safely uninstall cc-track from this project. Follow these steps carefully and ask for user confirmation at each major step.

## Step 1: Confirm Uninstallation

Ask the user: "Are you sure you want to uninstall cc-track from this project? This will remove hooks, configurations, and optionally your task files and documentation."

If they say no, stop here.

## Step 2: Remove Hooks from settings.json

Read `.claude/settings.json` and remove all cc-track related hooks:
- Remove any hooks with command containing "cc-track hook"
- Remove the statusLine configuration if it contains "cc-track statusline"
- Keep any non-cc-track hooks and configurations intact

Use the Edit or MultiEdit tool to make these changes.

## Step 3: Remove cc-track Configuration

Delete the following configuration files:
- `.claude/track.config.json`

## Step 4: Remove cc-track Command Files

Delete the following command files from `.claude/commands/`:
- `setup-cc-track.md`
- `complete-task.md`
- `prepare-completion.md`
- `add-to-backlog.md`
- `config-track.md`
- `cc-track-uninstall.md`

Note: Only delete these specific cc-track command files, not any custom commands the user may have created.

## Step 5: Optional - Remove Task Files

Ask the user: "Do you want to remove the task files in `.claude/tasks/`? These contain your project's task history."

If yes, delete the entire `.claude/tasks/` directory.

## Step 6: Optional - Remove Documentation Files

Ask the user: "Do you want to remove the cc-track documentation files? This includes:
- product_context.md
- system_patterns.md
- decision_log.md
- progress_log.md
- code_index.md
- user_context.md
- cc-track-workflow.md (documentation)
- active_task.md (template)
- no_active_task.md
- backlog.md

These files contain valuable project documentation you may want to keep."

If yes, delete these files from `.claude/`.

## Step 7: Update CLAUDE.md

Ask the user: "Do you want to remove the cc-track file references from CLAUDE.md? The documentation files will remain but won't be automatically imported."

If yes:
1. Read `CLAUDE.md`
2. Remove the following sections if they exist:
   - `## Active Task` section with `@.claude/no_active_task.md` or task references
   - `## Product Vision` section with `@.claude/product_context.md`
   - `## System Patterns` section with `@.claude/system_patterns.md`
   - `## Decision Log` section with `@.claude/decision_log.md`
   - `## Code Index` section with `@.claude/code_index.md`
   - `## User Context` section with `@.claude/user_context.md`
   - `## Workflow Guide` section with `@.claude/cc-track-workflow.md`
   - The comment about not committing work and using /complete-task

3. Keep any other content the user has added to CLAUDE.md

## Step 8: Remove npm Dependency (if present)

Check if cc-track is listed in package.json:
1. Read `package.json`
2. Check if "cc-track" appears in dependencies or devDependencies

If found, ask: "cc-track is installed as a project dependency. Do you want to remove it from package.json?"

If yes:
- Remove the cc-track entry from dependencies/devDependencies
- Suggest running `npm install` or `bun install` to update lock files

## Step 9: Clean Up Logs Directory

The centralized logs are stored outside the project directory. Inform the user:
"cc-track logs are stored in `~/.local/share/cc-track/logs/` (or platform equivalent). You can manually delete this directory if you want to remove all cc-track logs from your system."

## Step 10: Final Instructions

Tell the user:
"cc-track has been uninstalled from this project. Please restart Claude Code for all changes to take effect.

If you want to reinstall cc-track in the future, you can run:
```bash
npx cc-track init
```

Then use the `/setup-cc-track` command in Claude Code."

## Important Notes

- Be careful to preserve any custom content the user has added
- Don't delete files without explicit confirmation
- Make backups if the user seems uncertain
- Explain what each step does before doing it