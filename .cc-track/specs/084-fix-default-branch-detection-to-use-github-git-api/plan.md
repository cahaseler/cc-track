# Fix Default Branch Detection to Use GitHub/Git APIs

**Purpose:** Enhance the `getDefaultBranch()` function to use GitHub and Git APIs for reliable default branch detection instead of hardcoded fallbacks.

**Status:** completed
**Started:** 2025-09-21 18:02
**Task ID:** 084

## Requirements
- [ ] Add GitHub API check using `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'` as second priority after config
- [ ] Replace current `git symbolic-ref` with more reliable `git ls-remote --symref origin HEAD` command
- [ ] Keep track.config.json check as highest priority (existing behavior)
- [ ] Maintain fallback chain: config → GitHub API → git remote HEAD → git config → branch existence → "main"
- [ ] Add debug logging to show which method successfully determined the branch
- [ ] Update existing tests to cover new GitHub API and improved git remote checking
- [ ] Ensure backward compatibility with existing dependency injection pattern

## Success Criteria
- Function correctly detects non-standard default branches (test, develop, trunk, etc.) from GitHub
- Graceful handling when GitHub CLI is unavailable or repo not connected to GitHub
- All existing tests pass and new tests cover GitHub API scenarios
- Debug logging clearly shows detection method used
- Zero breaking changes to existing API

## Technical Approach
Enhance `src/lib/git-helpers.ts:42-98` (getDefaultBranch method) to add GitHub API detection and improve git remote HEAD checking while maintaining the existing dependency injection architecture.

## Implementation Details

### Current Implementation Analysis
The existing `getDefaultBranch` method in `src/lib/git-helpers.ts:42-98` follows this pattern:
1. Check track.config.json via `this.getGitConfig()` 
2. Try `git symbolic-ref refs/remotes/origin/HEAD` with shell redirection
3. Try `git config init.defaultBranch` 
4. Check if main/master branches exist locally
5. Fallback to "main"

### Integration with GitHubHelpers
The `GitHubHelpers` class in `src/lib/github-helpers.ts` already provides:
- `isGitHubCLIAvailable()` method (line 41)
- `gh repo view` usage patterns (lines 55, 68)
- Proper error handling for GitHub operations

### New Detection Chain
Implement this enhanced fallback hierarchy:
1. **track.config.json** (existing - keep as-is)
2. **GitHub API** (NEW): `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'`
3. **Git remote HEAD** (IMPROVED): `git ls-remote --symref origin HEAD | head -1 | sed 's/.*refs\/heads\///'`
4. **Git config** (existing - keep as-is)
5. **Branch existence** (existing - keep as-is) 
6. **Final fallback** (existing - keep as-is)

### Dependencies and Integration
- Use existing `this.exec` function for all command execution
- Follow error handling patterns from GitHubHelpers class
- Add logging using the same pattern as other lib files
- Maintain compatibility with `GetGitConfigFunction` type

## Current Focus

Task completed on 2025-09-21

## Research Findings
- GitHub CLI integration pattern established in `github-helpers.ts:41-78`
- Error handling uses try/catch blocks, not stderr redirection in commands
- Dependency injection via constructor: `GitHelpers(exec?, getGitConfig?, claudeSDK?)`
- Test mocking pattern: `mock((command: string) => { ... })` in `git-helpers.test.ts:29-112`
- No logging currently used in git-helpers.ts (unlike github-helpers.ts which uses createLogger)
- Config structure supports `git.defaultBranch` in `config.ts:39-42`

## Next Steps
1. Add GitHub API check in `src/lib/git-helpers.ts:42-98` between config check and current git commands
2. Replace `git symbolic-ref refs/remotes/origin/HEAD` with `git ls-remote --symref origin HEAD` approach
3. Add comprehensive test cases for GitHub API scenarios in `src/lib/git-helpers.test.ts`
4. Test with repositories that have non-standard default branches

## Open Questions & Blockers
None - all technical details have been researched and implementation path is clear.

<!-- github_issue: 111 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/111 -->
<!-- issue_branch: 111-fix-default-branch-detection-to-use-githubgit-apis -->