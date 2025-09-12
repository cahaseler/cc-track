# Fix GitHub Branch Linking Issue

**Purpose:** Fix the flawed logic in capture-plan hook that prevents GitHub issues from being properly linked to branches/PRs when both git_branching and use_issue_branches are enabled.

**Status:** planning
**Started:** 2025-09-12 13:17
**Task ID:** 037

## Requirements
- [x] Reorder operations in capturePlanHook to create GitHub issue BEFORE git branching
- [x] Fix condition logic on line 241 from `!gitBranchingEnabled` to check for issue existence
- [x] Update handleGitHubIntegration function to return issue object instead of just info string
- [x] Modify handleGitBranching to accept parameter for skipping when issue branch already created
- [x] Implement proper issue branch creation using `gh issue develop` when configured
- [x] Ensure regular git branching is skipped if issue branch was created
- [x] Test that branches are properly linked to issues with both settings enabled
- [x] Verify PRs created from issue branches automatically link to issues
- [x] Test fallback behavior when GitHub integration fails

## Success Criteria
- GitHub issues are created before branching operations
- When `use_issue_branches` is enabled and issue exists, `gh issue develop` is used instead of regular branching
- Branches created from issues are properly linked in GitHub
- PRs from issue branches automatically reference the original issue
- Fallback to regular branching works when GitHub integration fails
- No regression in existing functionality

## Technical Approach
The core issue is backwards logic where issue branches are only created when git branching is DISABLED. The fix involves reordering operations to create issues first, then using that issue to determine the branching strategy. The handleGitHubIntegration function needs to return the actual issue object so the main flow can make informed decisions about which branching method to use.

## Current Focus
Analyze the current capturePlanHook implementation to understand the exact flow and identify all locations that need modification.

## Open Questions & Blockers
- Need to examine the current handleGitHubIntegration and handleGitBranching function signatures
- Verify the exact return format needed from handleGitHubIntegration
- Confirm the correct parameters for `gh issue develop` command
- Check if there are any dependencies between the functions that could complicate reordering

## Next Steps
All requirements have been completed successfully.

## Recent Progress

### Completed Implementation (2025-09-12)

Successfully fixed the GitHub branch linking issue by refactoring the capture-plan hook:

1. **Refactored handleGitHubIntegration function**: Changed return type from string to `{ issue: GitHubIssue | null; infoString: string }` to return both the issue object and metadata string. This allows the main flow to make decisions based on issue creation success.

2. **Reordered operations in capturePlanHook**: 
   - Moved GitHub issue creation (line 360) BEFORE branch creation
   - Issue creation now happens first at line 354
   - Branch decision logic follows based on issue creation result

3. **Fixed the condition logic**: 
   - Original flawed logic: `if (githubConfig?.use_issue_branches && !gitBranchingEnabled)`
   - New correct logic: `if (githubResult.issue && githubConfig?.use_issue_branches)`
   - Now creates issue-linked branches when configured AND an issue was successfully created

4. **Improved branching flow**:
   - If issue exists and `use_issue_branches` is enabled, uses `gh issue develop` to create properly linked branch
   - Falls back to regular git branching if no issue or issue branches disabled
   - Branch metadata is appended to task file for tracking

5. **Updated tests**: Modified test suite to match new return type and expectations. All 23 tests passing.

6. **Validation**: Ran TypeScript, Biome, and full test suite - all checks passing.

The fix ensures that when both `git_branching` and `use_issue_branches` are enabled, GitHub issues and branches are properly linked, making PRs automatically reference their issues.

<!-- branch: bug/fix-github-branch-linking-037 -->

<!-- github_issue: 14 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/14 -->