# Feature Specification: Fix GitHub Branch Linking Issue

**Feature ID**: `037`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Fix the flawed logic in capture-plan hook that prevents GitHub issues from being properly linked to branches/PRs when both git_branching and use_issue_branches are enabled.

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

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
