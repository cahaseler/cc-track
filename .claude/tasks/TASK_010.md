# Improve Handling for Non-Task Associated Commits

**Purpose:** Generate meaningful commit messages for work not associated with tasks and suggest task creation after detecting patterns of non-task work.

**Status:** in_progress
**Started:** 2025-09-10 09:15
**Task ID:** 010

## Requirements
- [ ] Generate meaningful commit messages using Haiku for non-task work
- [ ] Track consecutive non-task commits in `.claude/non_task_commits.json`
- [ ] Suggest task creation after 3+ consecutive non-task commits
- [ ] Use "[exploratory]" prefix instead of "[wip]" for non-task commits
- [ ] Reset tracking when a task is created or acknowledged

## Success Criteria
- Non-task commits have descriptive messages based on actual changes
- System tracks consecutive non-task commits accurately
- Gentle suggestion appears after 3+ non-task commits
- Suggestion is non-intrusive (informational only, not blocking)
- Tracking resets appropriately when tasks are created

## Technical Approach
1. **Enhance stop_review.ts**: 
   - Import generateCommitMessage from git-helpers
   - Call Haiku to generate messages when no task is active
   - Use "[exploratory]" prefix for clarity

2. **Add tracking mechanism**:
   - Create/update `.claude/non_task_commits.json`
   - Track count, last commit hash, and commit messages
   - Increment counter for each non-task commit

3. **Implement suggestion logic**:
   - Check count after each non-task commit
   - Display gentle reminder at 3+ commits
   - Include shift-tab instruction for planning mode

## Current Focus
Modifying stop_review.ts to generate better commit messages and add tracking

## Open Questions & Blockers
- None currently

## Next Steps
1. Complete modifications to stop_review.ts
2. Test with non-task commits
3. Verify suggestion appears appropriately
4. Update backlog to mark item as completed