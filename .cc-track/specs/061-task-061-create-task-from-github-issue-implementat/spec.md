# Feature Specification: TASK_061: Create Task from GitHub Issue Implementation

**Feature ID**: `061`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Migrated from old task structure

## Requirements

- [ ] Create CLI command `src/commands/create-task-from-issue.ts`
  - [ ] Accept issue number or URL as argument
  - [ ] Use `gh issue view --json` to fetch issue data (title, body, labels, assignees)
  - [ ] Extract task description from issue body
  - [ ] Generate a plan-like structure from the issue content
- [ ] Reuse existing task enrichment infrastructure
  - [ ] Call `enrichPlanWithResearch` function from capture-plan.ts
  - [ ] Pass issue title and body as the "plan" input
  - [ ] Let research agent analyze codebase and create comprehensive task file
  - [ ] Ensure task file is written to `.claude/tasks/TASK_XXX.md`
- [ ] Implement GitHub integration flow
  - [ ] Use `gh issue develop` to create linked branch after task creation
  - [ ] Update task file with issue metadata (issue number, URL, branch name)
  - [ ] Commit task file to main before switching to feature branch
  - [ ] Update CLAUDE.md to set as active task
- [ ] Create slash command `.claude/commands/task-from-issue.md`
  - [ ] Simple wrapper that calls the CLI command
  - [ ] Configure allowed tools: Bash (cc-track command), Read, Grep, Glob
  - [ ] Format: `/task-from-issue <issue-number-or-url>`
- [ ] Register command in CLI
  - [ ] Add import and registration in `src/cli/index.ts`
  - [ ] Follow existing command patterns (Commander.js structure)

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
