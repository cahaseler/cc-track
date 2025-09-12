# Make Default Branch Configurable and Migrate to 'main'

**Purpose:** Add configuration support for default branch names in cc-track and migrate this repository from 'master' to 'main' as the default branch.

**Status:** completed
**Started:** 2025-09-12 07:03
**Task ID:** 031

## Requirements

### Phase 1: Add Configuration Support
- [ ] Add `git.defaultBranch` configuration option to track.config.json (defaults to 'main')
- [ ] Update GitHelpers class `getDefaultBranch()` method to check config first
- [ ] Ensure GitHelpers falls back to current detection logic if not configured
- [ ] Update all GitHelpers methods to respect the configured default branch value
- [ ] Update GitHelpers tests for new configuration logic
- [ ] Update complete-task command documentation to use dynamic default branch detection

### Phase 2: Repository Migration
- [ ] Create 'main' branch from current 'master'
- [ ] Push 'main' branch to GitHub
- [ ] Update GitHub repository default branch setting to 'main'
- [ ] Update branch protection rules if any exist
- [ ] Update .releaserc.json to use 'main' branch
- [ ] Verify GitHub Actions workflow supports 'main' branch
- [ ] Delete local 'master' branch after verification
- [ ] Delete remote 'master' branch after verification

### Phase 3: Documentation Updates
- [ ] Update task documentation files that reference 'master'
- [ ] Update any other documentation mentioning 'master' branch

## Success Criteria
- [ ] cc-track supports configurable default branch names via track.config.json
- [ ] This repository uses 'main' as the default branch
- [ ] All CI/CD pipelines work with 'main' branch
- [ ] No references to 'master' remain in documentation
- [ ] GitHelpers class correctly uses configured default branch
- [ ] All tests pass with new configuration logic

## Technical Approach
Implement configuration-first approach where cc-track checks for `git.defaultBranch` in track.config.json before falling back to Git detection logic. Migrate repository in controlled phases to ensure no disruption to workflows.

## Current Focus

Task completed on 2025-09-12

## Open Questions & Blockers
- Need to verify current GitHub Actions workflow compatibility with 'main' branch
- Should confirm no external dependencies rely on 'master' branch name
- Need to check if semantic-release configuration requires updates beyond .releaserc.json

## Next Steps
1. Add `git.defaultBranch` configuration option to track.config.json
2. Update GitHelpers.getDefaultBranch() to use configuration
3. Update and run GitHelpers tests to ensure new logic works
4. Update complete-task command documentation

<!-- branch: feature/configurable-default-branch-031 -->