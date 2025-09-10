# Clean Up All TypeScript and Biome Errors/Warnings

**Purpose:** Fix all 8 TypeScript errors and 76 Biome issues (52 errors + 24 warnings), then adjust configuration to make all rules errors for stricter enforcement.

**Status:** completed
**Started:** 2025-09-10 13:54
**Task ID:** 017

## Requirements

### TypeScript Fixes (8 errors)
- [ ] Remove unused `HookOutput` interface from `post_compact.ts`
- [ ] Remove unused `HookOutput` interface from `stop_review.ts`
- [ ] Remove unused `claudeDir` variable in `post_compact.ts`
- [ ] Remove unused `reject` parameter in `pre_compact.ts` Promise
- [ ] Remove unused `basename` import in `stop_review.ts`
- [ ] Remove unused `cwd` parameters in `git-helpers.ts` (2 instances)
- [ ] Make `checkRecentNonTaskCommits` method public in `stop_review.ts`

### Biome Fixes (76 issues)
- [ ] Run `bun run fix` to auto-fix Node protocol imports (31 errors)
- [ ] Define proper types for logger parameters (20 errors)
- [ ] Create interfaces for hook inputs/outputs
- [ ] Type error handlers properly
- [ ] Remove unused variables and imports (14 issues)
- [ ] Prefix intentionally unused vars with underscore
- [ ] Wrap switch case statements in blocks when declaring variables (8 errors)
- [ ] Use optional chaining (5 instances)
- [ ] Use template literals instead of concatenation (2 instances)
- [ ] Use const instead of let (1 instance)
- [ ] Remove @ts-ignore comment
- [ ] Fix non-null assertions

### Configuration Updates
- [ ] Change `noUnusedVariables` from "warn" to "error" in `biome.json`
- [ ] Change `noNonNullAssertion` from "warn" to "error" in `biome.json`
- [ ] Add `useNodejsImportProtocol` as "error" explicitly in `biome.json`

### Validation
- [ ] Run final validation with `bun run check`
- [ ] Verify zero TypeScript errors
- [ ] Verify zero Biome errors or warnings

## Success Criteria
- Zero TypeScript errors
- Zero Biome errors or warnings
- Stricter configuration preventing future issues
- Clean, consistent codebase following all best practices
- All linting rules configured as "error" rather than "warn"

## Technical Approach
1. Start with automated fixes using `bun run fix` for Node.js import protocol
2. Manually fix TypeScript errors (unused declarations, private access)
3. Address remaining Biome errors (any types, switch blocks, code improvements)
4. Update biome.json configuration to enforce stricter rules
5. Validate with comprehensive check

## Current Focus
Task completed on 2025-09-10

## Open Questions & Blockers
- Need to verify current project structure and available npm/bun scripts
- May need to understand existing type definitions before creating new interfaces
- Some "unused" variables might be intentionally unused for error handling patterns

## Completion Summary

### What Was Delivered
- Successfully ran autofix tools to add node: protocol to all imports
- Fixed all 8 TypeScript errors
- Resolved all 76 Biome linting issues
- Updated configuration to use error severity for all rules
- Achieved zero errors and zero warnings across entire codebase

### Key Implementation Details
- Autofix tools worked correctly - only made safe formatting and import changes
- Created proper TypeScript interfaces (ToolInput, ToolResult) to replace 'any' types
- Fixed visibility modifiers (removed unnecessary 'private' keywords)
- All linting rules now enforce errors, not warnings

### Lessons Learned
- Initial concern about autofix "deleting" methods was incorrect - it only removed visibility modifiers
- Important to read full file context before making assumptions about code changes
- TypeScript visibility modifiers affect method accessibility from outside classes