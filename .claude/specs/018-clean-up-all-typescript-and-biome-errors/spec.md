# Feature Specification: Clean Up All TypeScript and Biome Errors

**Feature ID**: `018`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Complete cleanup of remaining TypeScript errors and Biome linting issues to achieve zero errors across the codebase

## Requirements

- [ ] Audit autofix changes via git diff to ensure no unintended modifications
- [ ] Remove unused HookOutput interface from stop_review.ts (line 19)
- [ ] Check for any other TypeScript errors across all files
- [ ] Fix explicit any types by creating proper interfaces
- [ ] Fix switch block declarations (wrap in blocks when declaring variables)
- [ ] Apply code improvements (optional chaining, template literals, const vs let)
- [ ] Remove any remaining unused variables/imports
- [ ] Change noUnusedVariables from "warn" to "error" in biome.json
- [ ] Change noNonNullAssertion from "warn" to "error" in biome.json
- [ ] Explicitly set useNodejsImportProtocol as "error" in biome.json
- [ ] Run `bun run check` to ensure zero errors
- [ ] Verify all linting rules are now errors, not warnings

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
