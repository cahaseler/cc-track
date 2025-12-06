# Feature Specification: Make Default Branch Configurable and Migrate to 'main'

**Feature ID**: `031`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Add configuration support for default branch names in cc-track and migrate this repository from 'master' to 'main' as the default branch.

## Requirements

### Phase 1: Add Configuration Support
- [ ] Add `git.defaultBranch` configuration option to track.config.json (defaults to 'main')
- [ ] Update GitHelpers class `getDefaultBranch()` method to check config first
- [ ] Ensure GitHelpers falls back to current detection logic if not configured
- [ ] Update all GitHelpers methods to respect the configured default branch value
- [ ] Update GitHelpers tests for new configuration logic
- [ ] Update complete-task command documentation to use dynamic default branch detection

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
