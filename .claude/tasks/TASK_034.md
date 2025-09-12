# Fix GitHub Issue Creation Not Working

**Purpose:** Restore GitHub issue creation functionality that's currently failing due to a validation check incorrectly determining the repository is not connected to GitHub.

**Status:** planning
**Started:** 2025-09-12 10:25
**Task ID:** 034

## Requirements
- [ ] Fix the `isGitHubRepoConnected` validation function in `src/lib/github-helpers.ts`
- [ ] Update stderr handling to use execSync options instead of command string redirection
- [ ] Add better error logging to understand validation failures
- [ ] Build the project to test changes
- [ ] Test creating a task from planning mode to verify GitHub issue creation works
- [ ] Add retry logic for transient GitHub API failures (optional)
- [ ] Implement better error messages when GitHub operations fail (optional)

## Success Criteria
- GitHub issue creation works when creating tasks from planning mode
- `isGitHubRepoConnected` correctly identifies connected repositories
- No silent failures in GitHub integration
- Clear error messages when GitHub operations fail

## Technical Approach
The root cause is that `isGitHubRepoConnected` uses `gh repo view 2>/dev/null` but the error redirection might not work correctly in all contexts. The fix involves:
1. Replacing command string stderr redirection with execSync options
2. Improving error handling and logging
3. Testing the validation logic thoroughly

## Recent Progress

**Issue Identified and Fixed Successfully:**

1. **GitHub Repository Connection Validation Fixed:**
   - Updated `isGitHubRepoConnected` function in `src/lib/github-helpers.ts`
   - Removed problematic `2>/dev/null` stderr redirection from command string
   - Added explicit shell option and better error logging
   - Validation now correctly identifies connected repositories

2. **Command Escaping Issue Fixed:**
   - Discovered GitHub issue creation was failing due to backticks in task content being interpreted as shell commands
   - Added proper escaping for quotes, backticks, and dollar signs in `createGitHubIssue`
   - Prevents shell interpretation of markdown code snippets in issue bodies

3. **Testing and Validation:**
   - Built and tested the fixes with updated CLI binary
   - Validation checks now pass completely
   - GitHub integration is fully operational

## Current Focus

GitHub issue creation functionality has been restored and is ready for production use.

## Open Questions & Blockers
~~All blockers resolved.~~ ✅ Task complete.

<!-- branch: bug/fix-github-issue-creation-034 -->