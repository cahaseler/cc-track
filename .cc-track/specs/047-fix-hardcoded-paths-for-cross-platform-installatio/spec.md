# Feature Specification: Fix Hardcoded Paths for Cross-Platform Installation

**Feature ID**: `047`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Remove hardcoded Unix-specific paths and make the cc-track installation work across different operating systems and installation locations.

## Requirements

- [x] Copy slash command files from `.claude/commands/` to `src/commands/`
- [x] Update `add-to-backlog.md` to use `cc-track backlog add`
- [x] Update `complete-task.md` to use `cc-track complete-task`
- [x] Update `prepare-completion.md` to use `cc-track prepare-completion`
- [x] Update `templates/settings.json` to use `cc-track` instead of hardcoded path
- [x] Delete `templates/settings_with_stop.json`
- [x] Remove init command entirely (out of scope - will be rebuilt later)
- [x] Review and fix OS-specific commands (replace `which` with portable alternatives)
- [x] Ensure cross-platform compatibility for shell operations

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
