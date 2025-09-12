# Fix TypeScript Validation Hook Issue

**Purpose:** Resolve the TypeScript validation hook's false positive errors by implementing proper project-wide validation with file-specific filtering

**Status:** planning
**Started:** 2025-09-12 12:26
**Task ID:** 035

## Requirements
- [ ] Identify and understand the root cause of TypeScript validation false positives
- [ ] Analyze the current hook implementation that uses `tsc file.ts`
- [ ] Research TypeScript's behavior when checking individual files vs project-wide
- [ ] Implement Option 1: Check entire project with `tsc --noEmit --incremental`
- [ ] Add output parsing to filter results for only the edited file
- [ ] Test the performance impact (should be 0.3-0.5s with incremental cache)
- [ ] Ensure the incremental cache file is properly managed
- [ ] Verify that modern TypeScript features (import.meta, Map iteration) validate correctly
- [ ] Update hook documentation to reflect the new approach

## Success Criteria
- TypeScript validation hook no longer produces false positive errors for valid TypeScript code
- Hook correctly validates files using project tsconfig.json settings
- Performance remains acceptable (under 0.5s for typical projects)
- All modern TypeScript features used in the project validate correctly
- Incremental compilation cache improves subsequent validation speed

## Technical Approach
Replace the current file-specific TypeScript checking (`tsc file.ts`) with project-wide validation using `tsc --noEmit --incremental`. Parse the output to extract only errors relevant to the edited file. This approach works around TypeScript's design limitation where individual file checking ignores tsconfig.json settings.

## Current Focus
Implement the project-wide TypeScript validation with file-specific output filtering as the primary solution.

## Open Questions & Blockers
- Need to locate the current edit-validation hook implementation
- Determine the best output parsing strategy for extracting file-specific errors
- Consider fallback behavior if incremental compilation fails

## Next Steps
1. Find and examine the current TypeScript validation hook code
2. Implement the new project-wide validation approach
3. Add output filtering logic for file-specific errors
4. Test with files that currently produce false positives
5. Measure and validate performance impact

<!-- branch: bug/typescript-validation-hook-fix-035 -->