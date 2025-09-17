# TASK_069: Fix CodeRabbit/code-review Tests Filesystem Access

## Purpose
Stop CodeRabbit/code-review tests from touching the real filesystem so CI (which runs as a user without ~/.local/share/cc-track/logs write access) no longer errors on logger initialization.

## Status
**in_progress**

## Requirements
- [ ] Update `src/lib/code-review/coderabbit.test.ts` to use mock logger
- [ ] Update `src/lib/code-review/index.test.ts` to mock logger module
- [ ] Verify tests pass locally with `bun test`
- [ ] Verify tests pass in CI-like environment with `env HOME=/root bun test`
- [ ] Ensure no changes to production code - only test files modified

## Success Criteria
- All CodeRabbit/code-review tests pass without filesystem access
- Tests work in CI environment where ~/.local/share/cc-track/logs is not writable
- No production code changes required
- Mock logger implements full logger interface (debug/info/warn/error/exception)

## Technical Approach
1. **coderabbit.test.ts**: Use existing dependency injection to pass `createMockLogger` via deps parameter
2. **index.test.ts**: Use `mock.module('../logger', ...)` to return mock logger before imports
3. **Mock Implementation**: Leverage existing `createMockLogger` from `src/test-utils/command-mocks.ts`

## Current Focus
Starting with updating test files to use mock logger instead of real filesystem-dependent logger.

## Next Steps
1. Import and integrate `createMockLogger` in coderabbit.test.ts
2. Add module mocking for logger in index.test.ts  
3. Run test verification in both normal and CI-like environments

**Started:** 2025-09-17 08:45