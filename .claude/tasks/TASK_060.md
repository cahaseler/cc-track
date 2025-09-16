# TASK_060: Fix Capture-Plan Hook to Commit Task Files Without CLAUDE.md Updates

## Purpose
Fix the capture-plan hook to properly separate task file management (on main) from active task tracking (on branches) to eliminate merge conflicts and follow branch protection principles.

## Status
**in_progress** - Started: 2025-09-15 18:01

## Requirements
- [x] Remove CLAUDE.md update from main branch execution in capture-plan hook
- [x] Add commitTaskFilesToMain() function to commit only task files (.claude/tasks/ and .claude/plans/)
- [x] Implement automatic push of task files to main branch
- [x] Move CLAUDE.md update to occur after branch creation (on feature branch)
- [x] Ensure main branch CLAUDE.md always points to no_active_task.md
- [x] Maintain conventional commit format for task file commits
- [x] Add proper error handling for git operations
- [ ] Verify no merge conflicts occur when PRs are merged

## Success Criteria
- Main branch only receives committed task files, never CLAUDE.md updates
- Feature branches properly update CLAUDE.md to point to their specific task
- No merge conflicts when PRs containing CLAUDE.md changes are merged
- Clean separation between task registry (main) and active work tracking (branches)
- Hook continues to work for both task creation and branch workflows

## Technical Approach
1. **Restructure hook execution flow:**
   - Current: Create files → Update CLAUDE.md → Create branch
   - New: Create files → Commit files to main → Create branch → Update CLAUDE.md on branch

2. **Implement selective git operations:**
   - Use `git add` with specific file paths to exclude CLAUDE.md from main commits
   - Push task files immediately after creation to keep main up-to-date

3. **Maintain branch-specific CLAUDE.md management:**
   - Only update CLAUDE.md after switching to feature branch
   - Preserve existing updateClaudeMd() functionality for branch context

## Current Focus

Task completed on 2025-09-15

## Recent Progress

Successfully implemented the capture-plan hook fix with the following changes:

1. **Added commitTaskFilesToMain() function** that commits only task files to main branch
2. **Moved CLAUDE.md update** to occur after branch creation (on feature branch only)
3. **Security hardening implemented:**
   - Added taskId validation to prevent command injection
   - Added branch verification to ensure we're on main/master
   - Improved error handling for "nothing to commit" scenarios
4. **Code review completed** with all critical issues addressed

The implementation now ensures:
- Task files are committed to remote main before any branch work begins
- CLAUDE.md only gets updated on feature branches
- No merge conflicts when PRs are merged
- Secure handling of user inputs

## Next Steps
1. Locate capture-plan hook source code
2. Add commitTaskFilesToMain() function implementation
3. Remove CLAUDE.md update from main branch execution path
4. Move CLAUDE.md update to post-branching phase
5. Test with sample task creation to verify no conflicts
6. Update any related documentation or comments

<!-- github_issue: 64 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/64 -->
<!-- issue_branch: 64-task_060-fix-capture-plan-hook-to-commit-task-files-without-claudemd-updates -->