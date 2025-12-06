# TASK_062: Clean up SDK type usage across codebase

## Purpose
Improve type safety throughout the codebase by replacing generic `unknown` types, type assertions, and missing SDK type imports with proper TypeScript types from the Anthropic Claude SDK.

## Status
**in_progress**

## Requirements
- [ ] Import proper SDK types (`SDKMessage`, `Options`, `Query`) in claude-sdk.ts
- [ ] Remove generic `type SDKMessage = unknown` definition
- [ ] Update prompt() function to use proper `Options` type from SDK
- [ ] Replace `stream as AsyncGenerator<SDKMessage, void>` with proper typing
- [ ] Add type guards where appropriate instead of type assertions
- [ ] Improve error handling types with proper interfaces
- [ ] Document remaining necessary type assertions with explanatory comments
- [ ] Fix type assertions in capture-plan.ts hook
- [ ] Address type safety issues in github-helpers.ts
- [ ] Review and fix similar issues in git-helpers.ts and diff-summary.ts

## Success Criteria
- [ ] TypeScript compiler passes with no new type errors
- [ ] All existing tests continue to pass
- [ ] Linting passes without type-related warnings
- [ ] Type assertions reduced by at least 50%
- [ ] Proper SDK types imported and used consistently
- [ ] Code maintains runtime functionality while improving compile-time safety

## Technical Approach
1. **Phase 1**: Fix core SDK wrapper in `src/lib/claude-sdk.ts`
   - Import actual SDK types from '@anthropic-ai/claude-code'
   - Replace generic SDKMessage with proper type
   - Update prompt() function signature

2. **Phase 2**: Address type assertions in streams and async generators
   - Replace `as AsyncGenerator<unknown, void>` with proper types
   - Add type guards for runtime type checking where needed

3. **Phase 3**: Improve error handling and validation
   - Create proper error type interfaces
   - Add validation functions instead of type assertions where possible

4. **Phase 4**: Update remaining files
   - Fix similar issues in capture-plan.ts, github-helpers.ts, git-helpers.ts, diff-summary.ts
   - Document any remaining necessary assertions

## Current Focus

Task completed on 2025-09-16

## Next Steps
1. Examine current SDK type imports and available types
2. Replace generic SDKMessage type with proper import
3. Update prompt() function to use correct Options typing
4. Fix stream type assertions with proper AsyncGenerator typing
5. Run TypeScript compiler to verify changes
6. Move to capture-plan.ts and other identified files

**Started**: 2025-09-16 09:57

<!-- github_issue: 69 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/69 -->
<!-- issue_branch: 69-task_062-clean-up-sdk-type-usage-across-codebase -->