# Feature Specification: Fix Missing Shell Option in Lint Auto-Formatter Execution

**Feature ID**: `082`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Fix the lint auto-formatter execution in validation.ts that fails because it's missing the shell option required for npm script-style commands to run properly.

## Requirements

- [ ] Add `shell: '/bin/bash'` option to the autoFixCommand execution in `src/lib/validation.ts:121`
- [ ] Ensure consistency with existing shell option usage pattern found throughout codebase
- [ ] Maintain existing error handling behavior (try-catch remains, continue on auto-fix failure)
- [ ] Add test coverage for autoFixCommand execution with shell option
- [ ] Verify fix works with configured autoFixCommand (`"bunx biome check --write"`)

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
