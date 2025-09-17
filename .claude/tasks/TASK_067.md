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

## Current Focus
Implementing proper mock cleanup in index.test.ts to prevent cross-test pollution while maintaining test functionality.

## Next Steps
1. Examine current test files to understand mock usage patterns
2. Implement mock.restore() calls in appropriate locations
3. Test locally with different execution orders
4. Validate fix resolves CI failures
5. Update release pipeline if needed