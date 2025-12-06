# Feature Specification: Branch Protection Implementation - Extend PreToolUse Hook

**Feature ID**: `051`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Rename and extend the existing task-validation PreToolUse hook to become a generic pre-tool-validation hook that handles both task file validation and branch protection, blocking edits on protected branches while allowing gitignored files.

## Requirements

- [ ] Rename `task-validation.ts` → `pre-tool-validation.ts`
- [ ] Rename `task-validation.test.ts` → `pre-tool-validation.test.ts`
- [ ] Update all imports and references to renamed files
- [ ] Rename `task_validation` to `pre_tool_validation` in configuration structure
- [ ] Add branch protection sub-configuration with protected_branches array and allow_gitignored flag
- [ ] Add task validation sub-configuration to maintain existing functionality
- [ ] Implement branch protection check before task validation in hook logic
- [ ] Add current branch detection using GitHelpers for Edit/Write/MultiEdit tools
- [ ] Implement gitignore status checking for file exemptions
- [ ] Add clear blocking messages when edits are not allowed on protected branches
- [ ] Preserve existing task validation logic intact
- [ ] Update hook dispatcher to use new 'pre-tool-validation' type
- [ ] Update hookHandlers mapping with renamed module
- [ ] Add conditional branch protection section to no_active_task.md
- [ ] Write comprehensive tests for branch protection functionality
- [ ] Test configuration backwards compatibility
- [ ] Ensure existing task validation tests continue to pass
- [ ] Update decision log with implementation rationale
- [ ] Update system_patterns.md documentation
- [ ] Add configuration example to documentation

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
