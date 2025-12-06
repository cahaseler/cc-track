# Feature Specification: Remove Unused Standalone Function Exports

**Feature ID**: `038`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Clean up unused standalone function exports while maintaining class-based approach and keeping only essential standalone functions that are actually in use.

## Requirements

- [x] In `src/lib/github-helpers.ts`: Keep only `pushCurrentBranch` function, remove all other standalone exports (lines 342-388)
- [x] In `src/lib/git-helpers.ts`: Keep only `getDefaultBranch`, `isWipCommit`, `getCurrentBranch` functions, remove all other standalone exports
- [x] In `src/lib/claude-md.ts`: Keep only `clearActiveTask`, `getActiveTaskId` functions, remove any other unused standalone exports
- [x] Keep all class definitions and default instances in all files
- [x] Run tests to ensure nothing breaks
- [x] Run Knip to verify unused export warnings are resolved

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
