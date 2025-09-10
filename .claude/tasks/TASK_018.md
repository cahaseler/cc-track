# Clean Up All TypeScript and Biome Errors

**Purpose:** Complete cleanup of remaining TypeScript errors and Biome linting issues to achieve zero errors across the codebase

**Status:** planning
**Started:** 2025-09-10 14:13
**Task ID:** 018

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

## Success Criteria
- Zero TypeScript compilation errors
- Zero Biome linting warnings or errors
- All linting rules configured as errors (not warnings)
- Clean git diff showing only intentional formatting/import changes
- `bun run check` passes without any issues

## Technical Approach
Systematic cleanup approach focusing on remaining TypeScript errors first, then Biome linting issues, followed by configuration hardening to prevent future warnings

## Current Focus
Audit autofix changes and remove unused HookOutput interface from stop_review.ts

## Open Questions & Blockers
None - autofix tools worked correctly and project is in stable state

## Next Steps
1. Review git diff for autofix changes
2. Fix unused HookOutput interface in stop_review.ts
3. Run TypeScript check to identify remaining errors
4. Address Biome linting issues systematically
5. Update biome.json configuration to use "error" severity