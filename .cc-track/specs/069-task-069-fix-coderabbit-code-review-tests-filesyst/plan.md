# TASK_069: Fix CodeRabbit/code-review Tests Filesystem Access

## Purpose
Stop CodeRabbit/code-review tests from touching the real filesystem so CI (which runs as a user without ~/.local/share/cc-track/logs write access) no longer errors on logger initialization.

## Status
**in_progress**

## Requirements
- [x] Update `src/lib/code-review/coderabbit.test.ts` to use mock logger
- [x] Update `src/lib/code-review/index.test.ts` to mock logger module
- [x] Verify tests pass locally with `bun test`
- [x] Verify tests pass in CI-like environment with `env HOME=/root bun test`
- [x] Ensure no changes to production code - only test files modified

## Success Criteria
- All CodeRabbit/code-review tests pass without filesystem access
- Tests work in CI environment where ~/.local/share/cc-track/logs is not writable
- No production code changes required
- Mock logger implements full logger interface (debug/info/warn/error/exception)

## Technical Approach
1. **coderabbit.test.ts**: Use existing dependency injection to pass `createMockLogger` via deps parameter
2. **index.test.ts**: Use `mock.module('../logger', ...)` to return mock logger before imports
3. **Mock Implementation**: Leverage existing `createMockLogger` from `src/test-utils/command-mocks.ts`

## Recent Progress

**2025-09-17 11:45** - Task completed successfully:
- Updated `coderabbit.test.ts` to inject mock logger via existing deps parameter (5 test cases)
- Updated `index.test.ts` to use `mock.module('../logger', ...)` for logger mocking (5 test cases)
- All tests pass locally: 10/10 tests across 2 files
- All tests pass in CI environment (HOME=/root): Verified no filesystem access errors
- Code review approved: Clean implementation following established patterns
- No production code changes required - only test files modified

**Started:** 2025-09-17 08:45

<!-- github_issue: 81 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/81 -->
<!-- issue_branch: 81-task_069-fix-coderabbitcode-review-tests-filesystem-access -->

## Current Focus

Task completed on 2025-09-17
