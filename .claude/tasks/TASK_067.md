# TASK_067: Fix GitHub Release Pipeline - mock.module Cross-Test Pollution

**Purpose**: Fix CI test failures in GitHub release pipeline caused by mock.module pollution between test files, specifically where index.test.ts mocks persist and interfere with coderabbit.test.ts execution.

**Status**: in_progress

**Started**: 2025-09-17 21:37

## Requirements
- [ ] Analyze current mock.module usage in index.test.ts and coderabbit.test.ts
- [ ] Identify the specific mock pollution causing CI failures
- [ ] Fix mock isolation in index.test.ts by adding proper cleanup
- [ ] Ensure mock.module effects don't persist between test files
- [ ] Verify tests pass in different execution orders
- [ ] Validate fix works in CI environment
- [ ] Document the solution for future reference

## Success Criteria
- [ ] All tests pass consistently in CI pipeline
- [ ] No mock pollution between test files
- [ ] Tests return expected values (not "CodeRabbit review content" from wrong mock)
- [ ] GitHub release pipeline completes successfully
- [ ] Tests maintain proper isolation and can run in any order

## Technical Approach
### Root Cause Analysis
- `index.test.ts` uses `mock.module('./coderabbit', ...)` returning `{ success: true, review: 'CodeRabbit review content' }`
- This mock persists in CI and affects `coderabbit.test.ts` tests
- Tests expect their own mocks but get the index.test.ts mock instead
- Results in 1ms execution times (mocked speed) with wrong return values

### Solution Options
1. **Add proper cleanup in afterEach** (Primary approach):
   - Call `mock.restore()` after each test in index.test.ts
   - Ensure mock.module effects don't persist

2. **Switch to dependency injection** (Alternative):
   - Pass mocked dependencies directly instead of using mock.module
   - Match the pattern used in coderabbit.test.ts

## Recent Progress

Successfully identified and fixed the root cause of CI test failures:

1. **Root Cause Analysis**: Discovered that `mock.module` calls in `index.test.ts` were persisting and affecting `coderabbit.test.ts` in CI due to different test execution order/parallelization
   - Tests were getting "CodeRabbit review content" from index.test.ts instead of their own mocks
   - Issue only manifested in CI, not locally

2. **Solution Implemented**: Fixed mock isolation by importing `performCodeReview` dynamically AFTER setting up mocks in each test
   - Added `afterEach()` cleanup for additional safety
   - Removed unnecessary `mock()` wrappers around simple functions
   - All 5 tests in index.test.ts now properly isolated

3. **Verification**: Tested thoroughly with different test execution orders - all 355 tests pass consistently

4. **Code Quality**: Confirmed this was the only file violating the DI pattern - all other test files properly inject dependencies

The fix is minimal, focused, and aligns with project patterns. Ready for merge to resolve the GitHub release pipeline failures.

<!-- github_issue: 78 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/78 -->
<!-- issue_branch: 78-task_067-fix-github-release-pipeline-mockmodule-cross-test-pollution -->

## Current Focus

Task completed on 2025-09-17
