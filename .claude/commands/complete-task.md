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

4. **Provide Summary to User:**
   - Task completion confirmation with ID and title
   - What was delivered (bullet points)
   - Key achievements or breakthroughs
   - Any issues, warnings, or follow-up items from the report
   - Git status (was it squashed? any manual steps needed?)
   - Validation status (TypeScript/Biome results)
   - Next steps recommendation

## Example Output

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
- Git: 5 WIP commits squashed successfully
- Validation: TypeScript (0 errors), Biome (0 issues)

🔍 Follow-up Items:
- Consider adding progress percentage tracking
- Monitor script performance with large task files

Next: Ready for a new task? Use planning mode to get started.
```

## Important Notes

- The script handles all mechanical updates automatically
- Focus on reflection, analysis, and high-level documentation
- Review warnings in the JSON report carefully
- If git squashing failed, you may need to handle it manually