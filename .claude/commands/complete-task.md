---
allowed-tools: Bash(bun run:*), TodoWrite, mcp__private-journal__process_thoughts, Edit, Read
description: Complete the current active task with reflection and documentation
---

# Complete Task Command

## Automated Completion Results
!`bun run .claude/scripts/complete-task.ts`

## Your Task

Based on the completion results above:

1. **Reflect in Journal** about the task:
   - Technical insights learned during this task
   - Challenges faced and how they were overcome  
   - Any patterns or mistakes discovered
   - Project-specific implementation notes
   - User collaboration insights

2. **Handle Any Issues from the Report:**
   - If validation errors exist: Assess if they need immediate fixing
   - If git operations failed: Handle manually using git commands if needed
   - If warnings present: Document any technical debt identified
   - If task status wasn't "in_progress": Verify completion is appropriate

3. **Update Key Documentation:**
   
   a) **Task File** - Add a "## Completion Summary" section with:
      - What was actually delivered
      - Key implementation details  
      - Any deviations from original requirements
      - Testing results
   
   b) **Progress Log** (`.claude/progress_log.md`):
      - Add completion entry with timestamp
      - List key files created/modified (from filesChanged in report)
      - Note any follow-up tasks identified
   
   c) **Decision Log** (`.claude/decision_log.md`) if applicable:
      - Add any significant architectural decisions made
      - Include alternatives considered and rationale
   
   d) **System Patterns** (`.claude/system_patterns.md`) if applicable:
      - Document any new patterns established
      - Update tool preferences if discovered
   
   e) **Backlog** (`.claude/backlog.md`):
      - Check if the completed task was listed in the backlog
      - Remove it if present (it's now complete, not a future item)

4. **Handle GitHub Workflow (if enabled):**
   
   **If the automated script indicates GitHub PR workflow is active:**
   - Create a pull request using: `gh pr create --title "Task XXX: [Task Title]" --body "[Task summary and key changes]"`
   - Include what was delivered, key technical details, and testing notes in PR description
   - After PR creation, switch back to default branch: `git checkout main` (or `master`)
   - Provide the PR URL to the user
   
   **If traditional git workflow was used:**
   - Confirm the branch was merged successfully
   - Note any manual steps needed
   
5. **Provide Summary to User:**
   - Task completion confirmation with ID and title
   - What was delivered (bullet points)
   - Key achievements or breakthroughs
   - Any issues, warnings, or follow-up items from the report
   - Git/GitHub status (squashed? merged? PR created?)
   - Validation status (TypeScript/Biome results)
   - Next steps recommendation

## Example Output

### Traditional Git Workflow
```
📝 Task 021 Completed: Improve /complete-task Command with Smart Script

✅ Delivered:
- Created comprehensive task completion script
- Automated all mechanical update operations
- Safe git squashing with intelligent edge case handling
- Structured JSON reporting for decision support

📊 Automated Results:
- Task status: Updated to completed ✓
- CLAUDE.md: Updated to no_active_task ✓
- Git: 5 WIP commits squashed, branch merged successfully
- Validation: TypeScript (0 errors), Biome (0 issues)

🔍 Follow-up Items:
- Consider adding progress percentage tracking
- Monitor script performance with large task files

Next: Ready for a new task? Use planning mode to get started.
```

### GitHub PR Workflow
```
📝 Task 025 Completed: GitHub Integration Implementation

✅ Delivered:
- Comprehensive GitHub integration with issue tracking
- Automatic PR workflow with branch management
- GitHub CLI wrapper functions with error handling
- Configuration system for flexible GitHub features

📊 Automated Results:
- Task status: Updated to completed ✓
- CLAUDE.md: Updated to no_active_task ✓
- Git: 3 WIP commits squashed, branch pushed to origin
- GitHub: Ready for PR creation
- Validation: TypeScript (0 errors), Biome (0 issues)

🚀 GitHub Workflow:
- Branch: feature/github-integration-setup-025 pushed ✓
- Issue: #25 linked to this task
- Creating PR: Task 025: GitHub Integration Implementation

📋 PR Created: https://github.com/cahaseler/cc-track/pull/1
- Switched back to main branch ✓
- Ready for code review and merge

Next: PR ready for review! Once merged, ready for a new task.
```

## Important Notes

- The script handles all mechanical updates automatically
- Focus on reflection, analysis, and high-level documentation
- Review warnings in the JSON report carefully
- If git squashing failed, you may need to handle it manually