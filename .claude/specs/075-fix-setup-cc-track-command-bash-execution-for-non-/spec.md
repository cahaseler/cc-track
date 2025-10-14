# Feature Specification: Fix setup-cc-track command bash execution for non-git repos

**Feature ID**: `075`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Fix bash command execution in setup-cc-track.md that fails when the project is not a git repository or GitHub CLI is not authenticated by adding proper error handling with `|| echo` fallbacks.

## Requirements

- [ ] Fix line 66 in src/commands/init.ts: Change `!\`git status 2>&1\`` to `!\`git status 2>&1 || echo "Not a git repository"\``
- [ ] Fix line 67 in src/commands/init.ts: Change `!\`gh auth status 2>&1\`` to `!\`gh auth status 2>&1 || echo "GitHub CLI not authenticated or not installed"\``
- [ ] Fix line 20 in .claude/commands/setup-cc-track.md: Add same git status fallback
- [ ] Fix line 21 in .claude/commands/setup-cc-track.md: Add same gh auth status fallback
- [ ] Verify existing tests in src/commands/init.test.ts still pass after changes
- [ ] Remove the backlog item "setup-cc-track command fails when project is not a git repo" from .claude/backlog.md

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
