# Feature Specification: Fix Default Branch Detection to Use GitHub/Git APIs

**Feature ID**: `084`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Enhance the `getDefaultBranch()` function to use GitHub and Git APIs for reliable default branch detection instead of hardcoded fallbacks.

## Requirements

- [ ] Add GitHub API check using `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'` as second priority after config
- [ ] Replace current `git symbolic-ref` with more reliable `git ls-remote --symref origin HEAD` command
- [ ] Keep track.config.json check as highest priority (existing behavior)
- [ ] Maintain fallback chain: config → GitHub API → git remote HEAD → git config → branch existence → "main"
- [ ] Add debug logging to show which method successfully determined the branch
- [ ] Update existing tests to cover new GitHub API and improved git remote checking
- [ ] Ensure backward compatibility with existing dependency injection pattern

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
