---
allowed-tools: Bash, Edit, Read
description: Complete the current active task (Phase 2 of task completion workflow)
---

# Complete Task Command

Finalize the current task by updating metadata, squashing commits, and creating a PR.

**Prerequisites:** Validation must have passed via `/prepare-completion`

## Step 1: Update Task Metadata

1. Find the active spec directory (referenced in `CLAUDE.md` as `@.claude/specs/NNN-feature-name/spec.md`)
2. Read `.metadata.json` from that directory
3. Update the metadata:
   - Set `status: "completed"`
   - Set `completed: "YYYY-MM-DD"` (today's date)
4. Write the updated metadata back to `.metadata.json`

## Step 2: Update Task Lists

1. Read `.claude/no_active_task.md`
2. Under "## Completed Tasks:" section, append: `- {taskId}: {taskTitle}`
3. Save the file

## Step 3: Git Operations

**Commit any uncommitted changes:**
- Run `git status --porcelain` to check for changes
- If changes exist: `git add -A && git commit -m "docs: final task documentation updates"`

**Squash WIP commits:**
- Get the default branch name (usually `main` or `master`)
- Get merge base with default branch: `git merge-base {current-branch} {default-branch}`
- Count commits since merge base: `git rev-list --count {merge-base}..HEAD`
- If more than 1 commit:
  - Run: `git reset --soft {merge-base}`
  - Commit: `git commit -m "feat: complete {taskId} - {taskTitle}"`

**Push and create PR** (if GitHub integration enabled):
- Push branch: `git push -u origin HEAD`
- Wait 2-3 seconds for GitHub to recognize the branch
- Create minimal PR: `gh pr create --base {default-branch} --head {current-branch} --title "feat: complete {taskId} - {taskTitle}" --body "## Summary\nCompletes {taskId}: {taskTitle}\n\n🤖 Generated with [Claude Code](https://claude.ai/code)"`
- If PR creation succeeds, get the PR URL

**Enhance PR description:**
- Read the active spec folder files (spec.md, plan.md, progress.md)
- Get git diff: `git diff {merge-base}..HEAD`
- Get test results from validation output
- Write comprehensive PR description with:
  - Summary: What was delivered based on spec.md requirements
  - Technical Implementation: Key technical details from plan.md and actual changes
  - Testing: Test results and coverage
- Update PR: `gh pr edit {pr-url} --body "{enhanced-description}"`

**Switch back to main:**
- Run: `git checkout {default-branch}`
- Run: `git pull origin {default-branch}`

**Error handling:** If anything fails (push, PR creation, branch switch), explain the issue to the user and stop. Don't try to auto-revert - just report what happened and what state things are in.

## Step 4: Update CLAUDE.md

1. Read `CLAUDE.md`
2. Replace `@.claude/specs/{nnn}-{feature-name}/spec.md` with `@.claude/no_active_task.md`
3. Save the file

## Step 5: Report Completion

Report to user:
- ✅ Task {taskId} completed: {taskTitle}
- Git: {N} WIP commits squashed successfully
- PR created and enhanced: {url} (if applicable)
- Switched to {default-branch} branch