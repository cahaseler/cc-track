---
allowed-tools: Read, Edit, Glob, Grep, Bash(git:*), Bash(gh:*), Bash(bun:*), Skill
description: Complete the current active task (Phase 2 of task completion workflow)
---

# Complete Task Command

Finalize the current task by updating metadata, squashing commits, and creating a PR.

**Prerequisites:** Validation must have passed via `/prepare-completion`

## Current Context

- Current branch: !`git branch --show-current`
- Git status: !`git status --short`
- Recent commits on this branch: !`git log --oneline -5`

## Step 1: Get Script Path via Skill

First, invoke the `cc-track:cc-track-tools` skill to get the base directory for cc-track scripts.

Note the base directory provided (e.g., `/path/to/skills/cc-track-tools`).

## Step 2: Run Complete Task Script

Run the complete-task script using the base directory from Step 1:

```bash
bun {base_directory}/scripts/complete-task.ts
```

The script will:
- Run pre-flight validation (TypeScript, lint, tests, knip)
- Update task metadata (status → completed, completion date)
- Update task lists in no_active_task.md
- Squash WIP commits into a single feat commit
- Push branch and create PR (if GitHub integration enabled)
- Switch back to main branch
- Update CLAUDE.md to reference no_active_task.md

## Step 3: Interpret Results

The script returns JSON-like output with messages and data. Parse and present the results:

**If completion failed:**
- Show what failed with error details
- Common failures:
  - Validation failed → Run `/prepare-completion` first to fix issues
  - Push failed → Check for merge conflicts or authentication issues
  - No active task → Ensure a task is active before running
- **STOP** - do not proceed

**If completion succeeded:**
- Report task completion: Task ID and title from output
- Report git status: Number of WIP commits squashed
- Report PR status: URL if created, or existing PR if updated
- Confirm branch switch to main

## Step 4: Enhance PR Description (if PR was created)

If a new PR was created, enhance its description with details from the spec files:

1. Read the spec folder files (spec.md, plan.md, progress.md)
2. Update the PR with comprehensive details:

```bash
gh pr edit {pr-url} --body "## Summary
Completes {taskId}: {taskTitle}

## What Was Delivered
[Key deliverables from spec.md requirements]

## Technical Implementation
[Important details from plan.md and actual changes]

## Testing
[Test results and coverage from validation]

Generated with [Claude Code](https://claude.ai/code)"
```

## Script Options

The script supports these optional flags:

- `--no-squash` - Skip commit squashing (useful when PR already has review comments)
- `--no-branch` - Skip branch operations (stay on current branch)
- `--skip-validation` - Skip pre-flight validation (use with caution)

Example with flags:
```bash
bun {base_directory}/scripts/complete-task.ts --no-squash
```
