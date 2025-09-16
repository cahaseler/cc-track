# TASK_065: Fix Default Branch Assumptions

## Purpose
Fix hardcoded assumptions about default branch names ("main"/"master") throughout the codebase to support any configured default branch name (like "develop", "trunk", etc.).

## Status
**in_progress** - Started: 2025-09-16 19:04

## Requirements
- [ ] Improve GitHelpers.getDefaultBranch() to use `git config init.defaultBranch` when no remote HEAD is available
- [ ] Update capture-plan.ts to use dynamic default branch detection instead of hardcoded checks
- [ ] Update config.ts to dynamically determine default protected branches based on actual project default
- [ ] Update pre-tool-validation.ts to use GitHelpers for fallback instead of hardcoded array
- [ ] Update relevant tests to properly mock getDefaultBranch() behavior
- [ ] Ensure all changes maintain backward compatibility

## Success Criteria
- [ ] Code works correctly with any default branch name (not just "main"/"master")
- [ ] GitHelpers.getDefaultBranch() follows proper fallback hierarchy: remote HEAD → git config → branch existence → final fallback
- [ ] No hardcoded branch name assumptions remain in the identified files
- [ ] All existing tests pass
- [ ] New behavior is properly tested

## Technical Approach
1. **GitHelpers Enhancement**: Add `git config init.defaultBranch` check as intermediate fallback
2. **Dynamic Detection**: Replace all hardcoded checks with calls to GitHelpers.getDefaultBranch()
3. **Config Awareness**: Make protected branches configuration aware of project's actual default branch
4. **Graceful Degradation**: Maintain existing fallback behavior as last resort

## Current Focus
Analyzing existing GitHelpers.getDefaultBranch() implementation and planning improvements to the fallback hierarchy.

## Next Steps
1. Examine current GitHelpers.getDefaultBranch() implementation
2. Add git config fallback to the method
3. Update capture-plan.ts hardcoded checks
4. Modify config.ts default protected branches logic
5. Update pre-tool-validation.ts fallback mechanism
6. Review and update tests as needed