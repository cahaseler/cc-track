# cc-track Workflow Guide

**Purpose:** Quick reference for the cc-track task management workflow, from planning to completion.

## Workflow Overview

The cc-track system follows a structured workflow that ensures tasks are properly tracked, validated, and completed:

```
Plan → Task Created → Development → Validation → Documentation → Completion → PR → Merge
```

## Stage Details

### 1. Planning Mode → Task Creation
**Trigger:** User enters planning mode in Claude Code  
**Hook:** `capture-plan` automatically captures the plan when exiting planning mode  
**Result:** 
- New task file created in `.claude/tasks/TASK_XXX.md`
- Task automatically set as active in `CLAUDE.md`
- Git branch created (if configured): `feature/[task-name]-[task-id]`

### 2. Development Work
**What happens:** Claude works on the implementation  
**Hooks during work:**
- `edit-validation`: Real-time TypeScript/Biome validation on file edits
- `stop-review`: Reviews changes at stop points, auto-commits with WIP messages
  - **Important:** Stop-review validates work against the task file's requirements
  - If it flags deviations, either:
    1. Claude is off-track and needs to realign with requirements, or
    2. Requirements have evolved and task file needs updating
  - Work with user to clarify and update task file if needed
- Work continues across multiple sessions as needed

### 3. Prepare for Completion
**Trigger:** User runs `/prepare-completion`  
**What it does:**
- Runs all validation checks (TypeScript, Biome, tests, Knip)
- Provides dynamic instructions for fixing any issues
- Reminds about documentation updates and journal reflections
**Result:** Clear feedback on what needs fixing before task can be completed

### 4. Documentation Updates
**What to update:**
- Task file's "Recent Progress" section
- Decision log for significant architectural choices
- System patterns for new conventions
- Journal reflections on learnings
**Note:** Stop-review hook will auto-commit these changes

### 5. Complete Task
**Trigger:** User runs `/complete-task` (after validation passes)  
**What it does:**
- Final validation check
- Updates task status to "completed"
- Squashes WIP commits into single feat commit
- Creates PR with basic description
- Switches back to main branch
**Result:** Task marked complete, PR ready for review

### 6. Pull Request Enhancement
**What Claude does:** Enhances PR description with:
- Detailed summary of changes
- Technical implementation details
- Test plan and results
**How:** Uses `gh pr edit` command

### 7. Merge & Cleanup
**Manual step:** User reviews and merges PR on GitHub  
**After merge:** Pull latest changes to main branch

## Key Commands

- `/init-track` - Initialize cc-track in a project (one-time setup)
- `/prepare-completion` - Validate and prepare task for completion
- `/complete-task` - Finalize task and create PR
- `/add-to-backlog` - Add ideas without disrupting current work

## Important Notes

- Tasks are automatically tracked through the workflow
- Validation is enforced before completion (can't complete with errors)
- Documentation is part of the workflow, not an afterthought
- The system handles git operations automatically (branching, commits, PR creation)
- Stop-review hook provides continuous code review and auto-commits

## What This Means for Claude

When you see references to task files, prepare-completion, or complete-task commands, you're working within this structured workflow. The system ensures quality through validation, maintains context through documentation, and automates the mechanical aspects of task management.