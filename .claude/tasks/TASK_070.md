# TASK_070: Fix CI Test Failures via Dependency Injection

## Purpose
Fix test failures in CI where `index.test.ts` mocks pollute the global module cache and interfere with `coderabbit.test.ts`, causing the latter to receive mocked "CodeRabbit review content" instead of running real tests.

## Status
in_progress

## Requirements
- [ ] Update `src/lib/code-review/index.ts` to add optional `deps` parameter to `performCodeReview`
- [ ] Accept `performClaudeReview` and `performCodeRabbitReview` as injectable dependencies
- [ ] Default to real implementations when dependencies not provided
- [ ] Update `src/lib/code-review/index.test.ts` to remove ALL `mock.module()` calls
- [ ] Pass mock functions via deps parameter instead of global mocks
- [ ] Verify tests remain isolated with no global module pollution
- [ ] Ensure pattern matches existing DI approach used in `coderabbit.test.ts`

## Success Criteria
- `index.test.ts` and `coderabbit.test.ts` can run independently without interference
- No global module mocking in `index.test.ts` 
- All tests pass in CI environment
- Dependency injection pattern consistent with existing codebase

## Technical Approach
Implement dependency injection by:
1. Adding optional `deps` parameter to `performCodeReview` function signature
2. Destructuring dependencies with default fallbacks to real implementations
3. Replacing `mock.module()` calls with direct function injection in tests
4. Following the same DI pattern already successfully used in other test files

## Current Focus
Starting with updating the `performCodeReview` function to accept injectable dependencies while maintaining backward compatibility.

## Next Steps
1. Analyze current `performCodeReview` function signature
2. Add deps parameter with proper TypeScript types
3. Update function implementation to use injected dependencies
4. Refactor test file to use dependency injection instead of global mocks

---
**Started:** 2025-09-17 09:16