# Feature Specification: Clean Up All TypeScript and Biome Errors/Warnings

**Feature ID**: `017`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Fix all 8 TypeScript errors and 76 Biome issues (52 errors + 24 warnings), then adjust configuration to make all rules errors for stricter enforcement.

## Requirements

### TypeScript Fixes (8 errors)
- [ ] Remove unused `HookOutput` interface from `post_compact.ts`
- [ ] Remove unused `HookOutput` interface from `stop_review.ts`
- [ ] Remove unused `claudeDir` variable in `post_compact.ts`
- [ ] Remove unused `reject` parameter in `pre_compact.ts` Promise
- [ ] Remove unused `basename` import in `stop_review.ts`
- [ ] Remove unused `cwd` parameters in `git-helpers.ts` (2 instances)
- [ ] Make `checkRecentNonTaskCommits` method public in `stop_review.ts`

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
