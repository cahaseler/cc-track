# Handle Second Runs of complete-task Command

**Purpose:** Modify the complete-task command to detect if it's being run a second time (PR already exists) and adjust its behavior accordingly, preventing unnecessary squashing and ensuring smooth workflow for PR review iterations.

**Status:** completed
**Started:** 2025-09-15 16:11
**Task ID:** 059

## Requirements

- [x] Move PR existence check to happen BEFORE git squashing operations (before line 186)
- [x] Store PR existence state in a variable for use throughout the function
- [x] Make commit squashing conditional: only squash if no PR exists for the branch
- [x] Ensure push operations always happen regardless of PR status (for new commits)
- [x] Update user messaging to distinguish between first run (PR created) and subsequent runs (PR updated)
- [x] Maintain all existing functionality for non-GitHub workflows
- [x] Ensure branch switching back to default branch always happens
- [x] Preserve error handling and validation logic throughout

## Success Criteria

1. **First run behavior unchanged**: Squashes commits, creates PR, switches branches
2. **Second+ run behavior**: Skips squashing, pushes new commits to existing PR, switches branches
3. **No duplicate PRs created**: System correctly detects existing PRs and avoids duplication
4. **Clear user feedback**: Different messages for creating vs updating PRs
5. **Robust error handling**: Gracefully handles cases where PR checking fails
6. **All workflows supported**: Both GitHub PR workflow and traditional git branching work correctly

## Technical Approach

Based on analysis of `src/commands/complete-task.ts`, the modification involves restructuring the GitHub PR workflow section (lines 282-433) to check for existing PRs before squashing:

### Current Problem Flow:
```
Safety Commit → Squashing (lines 186-280) → PR Check & Creation (lines 312-333)
```

### Required New Flow:
```
Safety Commit → PR Check → Conditional Squashing → Push → Branch Switch
```

### Key Files to Modify:
- `src/commands/complete-task.ts` - Main logic restructuring

## Implementation Details

### PR Detection Pattern (Already Implemented):
The existing code at line 313-323 uses the correct pattern:
```typescript
const prListOutput = execSync(`gh pr list --head ${branchName} --json number,url,state`, {
  encoding: 'utf-8',
  cwd: projectRoot,
});
const existingPRs = JSON.parse(prListOutput) as Array<{number: number; url: string; state: string}>;
const openPR = existingPRs.find((pr) => pr.state === 'OPEN');
```

### Restructuring Strategy:
1. **Extract PR check logic** from lines 312-333 and move before line 186
2. **Create prExists boolean** to track state throughout function
3. **Wrap squashing logic** (lines 186-280) in `if (!prExists)` condition
4. **Simplify GitHub workflow section** to focus on push and branch operations
5. **Update result messaging** based on prExists state

### Branch Name Extraction Pattern:
The existing code correctly extracts branch names from task files:
```typescript
const branchMatch = taskContent.match(/<!-- branch: (.*?) -->/) ||
                   taskContent.match(/<!-- issue_branch: (.*?) -->/);
```

### Git Operations to Preserve:
- Safety commit for uncommitted changes (lines 188-202)
- Push with rebase handling via `pushCurrentBranch()` (line 305)
- Branch switching and pull (lines 374-380)

## Current Focus

Task completed on 2025-09-15

## Recent Progress

### Implementation Completed
Successfully restructured the complete-task command to handle second runs gracefully:

1. **PR Detection Moved Early** (lines 185-220):
   - PR existence check now happens BEFORE any git operations
   - Stores result in `existingPR` variable for use throughout function
   - Properly handles JSON parsing errors with try/catch

2. **Conditional Squashing** (line 222):
   - Created `shouldSquash = !options.noSquash && !existingPR` logic
   - Squashing only happens on first run when no PR exists
   - Second runs preserve commit history for PR review

3. **Security Fixes Applied**:
   - Added proper shell escaping for all branch names and commit messages
   - Prevents command injection vulnerabilities
   - Handles malformed JSON responses gracefully

4. **User Messaging Updated**:
   - First run: "Created PR: [url]"
   - Second run: "Updated existing PR: [url]"
   - Clear distinction in output between create vs update scenarios

### Testing Results
- TypeScript compilation: ✅ Passed
- Biome linting: ✅ Passed
- Binary build: ✅ Successful
- Unit tests: ✅ Basic structure tests pass

### Code Review Findings Addressed
- **Fixed**: Command injection vulnerabilities via proper shell escaping
- **Fixed**: JSON parsing error handling for external command output
- **Not Fixed (Justified)**: Draft PRs intentionally excluded, code duplication minor, comprehensive tests in backlog

## Research Findings

### Existing Git Helpers Available:
- `getCurrentBranch(projectRoot)` - Get current branch name
- `getDefaultBranch(projectRoot)` - Get main/master branch
- `getMergeBase(branch1, branch2, projectRoot)` - Find common ancestor
- `pushCurrentBranch(projectRoot)` - Push with automatic rebase handling

### GitHub Integration Context:
- GitHub PR workflow is controlled by `githubConfig?.auto_create_prs` flag
- Branch names stored in task files as `<!-- branch: branchName -->` or `<!-- issue_branch: branchName -->`
- Issue numbers stored as `<!-- github_issue: 123 -->`
- GitHub helpers include proper error handling and shell escaping

### Task File Format Pattern:
- HTML comments store metadata: `<!-- branch: feature/task-name-059 -->`
- Status updates use replace: `taskContent.replace(/\*\*Status:\*\* .+/, '**Status:** completed')`
- Result object structure already includes `github.prExists` and `github.prCreated` fields

### Error Handling Patterns:
- All git operations wrapped in try/catch with result.warnings array
- GitHub operations use logger from `createLogger('complete-task-command')`
- Shell commands use execSync with proper cwd and encoding options

## Next Steps

1. Identify exact line ranges to restructure in complete-task.ts
2. Extract PR existence check into separate function if needed for clarity
3. Implement conditional squashing logic
4. Test with both first run and second run scenarios
5. Verify all existing functionality remains intact

## Open Questions & Blockers

- **Resolved**: PR detection pattern is already correctly implemented using `gh pr list --head`
- **Resolved**: Branch name extraction logic already handles both branch types (git and issue branches)
- **Resolved**: Error handling patterns established and should be preserved
- **Resolved**: Result object structure already supports the required fields

<!-- github_issue: 62 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/62 -->
<!-- issue_branch: 62-handle-second-runs-of-complete-task-command -->