```markdown
# TASK_061: Create Task from GitHub Issue Implementation

## Purpose
Implement a new command that creates cc-track tasks directly from GitHub issues, leveraging the existing task enrichment system and GitHub integration to streamline the workflow from issue to tracked task.

## Status
- **Current Status**: in_progress
- **Started**: 2025-09-16 08:05
- **Assigned**: Claude
- **Priority**: Medium

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

## Success Criteria
- [ ] Command successfully fetches GitHub issue data
- [ ] Task enrichment system generates comprehensive task files with research
- [ ] Automatic branch creation and linking works properly
- [ ] Both CLI and slash command interfaces function correctly
- [ ] CLAUDE.md updates correctly with new active task
- [ ] Integration tests pass with real GitHub issues

## Technical Approach

### Key Design Decisions
- **Reuse existing enrichment**: Leverage the same comprehensive research flow that capture-plan uses
- **Issue data as plan**: Transform issue title/body into a plan format compatible with the research agent
- **Automatic branching**: Use `gh issue develop` for proper issue-PR linking
- **Dual interface**: Provide both CLI and slash command for flexibility

### Architecture
1. **CLI Command Layer**: Accept and validate input, fetch issue data
2. **Enrichment Integration**: Transform issue data and call existing research pipeline
3. **GitHub Integration**: Handle branch creation and metadata updates
4. **File Management**: Task file creation and CLAUDE.md updates

### Files to Create/Modify
- **Create**: `src/commands/create-task-from-issue.ts` - Main CLI command implementation
- **Create**: `.claude/commands/task-from-issue.md` - Slash command wrapper
- **Modify**: `src/cli/index.ts` - Command registration
- **Modify**: `src/lib/github-helpers.ts` - Add getIssue method if needed

## Current Focus
Setting up the basic CLI command structure and GitHub issue data fetching functionality.

## Next Steps
1. Analyze existing capture-plan.ts to understand enrichment flow
2. Create the CLI command with issue fetching capability
3. Implement the enrichment integration
4. Add GitHub workflow integration
5. Create and test slash command wrapper
6. Register command in CLI system
7. Test with real GitHub issues from cc-track repo

## Notes
- This command bridges the gap between GitHub issue tracking and internal task management
- The enrichment system should provide the same level of research and context as manual task creation
- Proper error handling needed for GitHub API interactions and network issues
```