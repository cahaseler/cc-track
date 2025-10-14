# TASK_070: Fix CI Test Failures via Dependency Injection

## Purpose
Fix test failures in CI where `index.test.ts` mocks pollute the global module cache and interfere with `coderabbit.test.ts`, causing the latter to receive mocked "CodeRabbit review content" instead of running real tests.

## Status
in_progress

## Requirements
- [x] Update `src/lib/code-review/index.ts` to add optional `deps` parameter to `performCodeReview`
- [x] Accept `performClaudeReview` and `performCodeRabbitReview` as injectable dependencies
- [x] Default to real implementations when dependencies not provided
- [x] Update `src/lib/code-review/index.test.ts` to remove ALL `mock.module()` calls
- [x] Pass mock functions via deps parameter instead of global mocks
- [x] Verify tests remain isolated with no global module pollution
- [x] Ensure pattern matches existing DI approach used in `coderabbit.test.ts`

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

## Recent Progress

**2025-09-17 13:35** - Task completed successfully:
- Added `CodeReviewDeps` interface with all injectable dependencies
- Updated `performCodeReview` to accept optional `deps` parameter
- Refactored all 5 test cases in `index.test.ts` to use DI instead of `mock.module()`
- All 10 tests pass locally and in CI-like environment (env HOME=/root)
- Full test suite passes (355 tests)
- Code review: EXCEPTIONAL rating - 5 stars, no issues found
- Solution completely eliminates test interference in CI

---
**Started:** 2025-09-17 09:16

<!-- github_issue: 83 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/83 -->
<!-- issue_branch: 83-task_070-fix-ci-test-failures-via-dependency-injection -->

## Current Focus

Task completed on 2025-09-17
