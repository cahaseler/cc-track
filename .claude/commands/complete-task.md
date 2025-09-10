---
shortname: complete-task
---

# Complete Task Command

When the user runs `/complete-task`, guide them through completing the current active task with proper reflection and documentation.

## Instructions for Claude

1. **Reflect in Journal** - Start by writing journal entries about:
   - Technical insights learned during this task
   - Challenges faced and how they were overcome
   - Any patterns or mistakes to remember
   - Project-specific notes about the implementation
   - User context insights from the collaboration

2. **Review Git History** - Look at the WIP commits since task started:
   ```bash
   git log --oneline | grep -E "TASK_[0-9]{3}"
   ```

3. **Update Task File**:
   - Change status from "in_progress" to "completed"
   - Add a "## Completion Summary" section with:
     - What was actually delivered
     - Key implementation details
     - Any deviations from original requirements
     - Lessons learned
   - Update "## Current Focus" to "Task completed on [date]"

4. **Update Progress Log** (`/.claude/progress_log.md`):
   - Add completion entry with timestamp
   - List key files created/modified
   - Note any follow-up tasks identified

5. **Update Decision Log** (`/.claude/decision_log.md`):
   - Add any significant architectural or implementation decisions made
   - Include alternatives considered and why they were rejected
   - Note reversibility of decisions

6. **Update Code Index** if needed (`/.claude/code_index.md`):
   - Add new files or modules created
   - Update key functions/classes section
   - Note any new patterns introduced

7. **Update System Patterns** if applicable (`/.claude/system_patterns.md`):
   - Document any new patterns established
   - Update tool preferences if any were discovered

8. **Extract Learned Mistakes** - Review if any error patterns should be added to `/.claude/learned_mistakes.md`

9. **Squash WIP Commits**:
   ```bash
   bun run scripts/git-session.ts squash-session
   ```
   Create a proper commit message summarizing the entire task.

10. **Update CLAUDE.md**:
    - Change active task to `@.claude/no_active_task.md`
    - Or set to next task if one is ready

11. **Final Summary** - Provide the user with:
    - Task completion confirmation
    - Summary of what was delivered
    - Any follow-up tasks or issues identified
    - Suggested next steps

## Example Output

```
📝 Task 003 Completed: Git-Based Deviation Detection System

✅ Delivered:
- Stop hook with auto-commit functionality
- Claude CLI integration for deviation detection
- Git session utilities for managing WIP commits
- Pre-push migration guide

📊 Key Achievements:
- Solved infinite recursion issue with Claude CLI calls
- Implemented robust JSON parsing for Claude responses
- Created checkpoint system for easy recovery

🔍 Follow-up Items:
- Consider adding knip integration for orphan code detection
- Monitor performance impact of Stop hooks
- Add more review categories as patterns emerge

Git history squashed into: "TASK_003: Implemented Git-based deviation detection with auto-commit and review"

Next: Would you like to start a new task or review the completed work?
```

## Important Notes

- Use mcp__private-journal__process_thoughts to capture reflections
- Be thorough in documenting decisions and patterns
- Ensure all context files are updated before marking complete
- Always squash WIP commits for clean history