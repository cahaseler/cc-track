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

## Current Focus
Fix the GitHub validation check in `src/lib/github-helpers.ts` by updating the `isGitHubRepoConnected` function to handle stderr properly.

## Open Questions & Blockers
- Need to verify the exact execSync options syntax for proper stderr handling
- May need to test with both connected and disconnected repositories to ensure validation works correctly

## Next Steps
1. Examine current implementation of `isGitHubRepoConnected` function
2. Update the function to use proper execSync error handling
3. Add debug logging to track validation results
4. Build and test the fix

<!-- branch: bug/fix-github-issue-creation-034 -->