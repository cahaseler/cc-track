# TASK_090: Fix Semantic Release by Using Squash Merge Strategy

## Purpose
Fix semantic-release not creating releases for merged PRs by switching to squash merge strategy and updating PR titles to use conventional commit format.

## Status
**in_progress** - Started: 2025-09-22 19:14

## Requirements
- [ ] Update GitHub repository settings to use squash merge as default
- [ ] Configure squash merge to use PR title for commit messages
- [ ] Modify `src/commands/complete-task.ts` to create PRs with conventional commit titles
- [ ] Change PR title format from "Complete TASK_XXX" to "feat: complete TASK_XXX - [Task Title]"
- [ ] Create manual release for already-merged changes since v1.39.0
- [ ] Document new merge process for contributors
- [ ] Test that semantic-release properly detects squashed commits

## Success Criteria
- Semantic-release automatically creates releases when PRs are merged
- PR titles follow conventional commit format (feat: complete TASK_XXX - [Task Title])
- Squash merge is the default merge method
- All accumulated changes since v1.39.0 are released
- Future PRs trigger appropriate version bumps and releases

## Technical Approach
The issue is that GitHub merge commits have generic titles like "Merge pull request #..." while the conventional commit message is buried in the body. Semantic-release only analyzes commit titles by default. Using squash merge creates a single commit with the PR title as the message, solving this issue without complex parser configuration.

### Code Changes
Update `src/commands/complete-task.ts`:
```typescript
// Change from:
const prTitle = `Complete ${taskId}`;

// To:
const prTitle = `feat: complete ${taskId} - ${taskTitle}`;
```

### Manual Release Trigger
After implementation, create empty commit:
```bash
git commit --allow-empty -m "feat: trigger release for accumulated changes

Includes:
- TASK_089: Fix Markdown Parsing Issue in Task Creation"
```

## Current Focus
Need to:
1. Examine current `complete-task.ts` implementation
2. Update PR title generation logic
3. Configure GitHub repository settings
4. Test the changes

## Next Steps
1. Review existing complete-task command code
2. Implement PR title format changes
3. Update GitHub repository merge settings
4. Create manual release commit
5. Document new process

<!-- github_issue: 122 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/122 -->
<!-- issue_branch: 122-task_090-fix-semantic-release-by-using-squash-merge-strategy -->