# Fix GitHub Actions Deployment Failures with Dependency Injection

**Purpose:** Apply dependency injection pattern to task validation tests to prevent real branch protection logic from blocking edits on 'main' branch in CI, fixing GitHub Actions deployment failures.

**Status:** completed
**Started:** 2025-09-15 14:37
**Task ID:** 056

## Requirements
- [x] Reuse existing mock helpers already defined in the file
  - [x] `createMockGitHelpers(currentBranch)`
  - [x] `createMockConfig(branchProtectionEnabled, options)`
  - [x] `createMockLogger()`
- [x] Update 8 failing task validation tests to inject mocks
  - [x] "allows edits to non-task files"
  - [x] "blocks status change to completed"
  - [x] "blocks weasel words about test failures"
  - [x] "allows legitimate progress updates"
  - [x] "handles Claude SDK errors gracefully"
  - [x] "handles invalid JSON response"
  - [x] "ignores non-Edit/MultiEdit tools"
- [x] Apply consistent dependency injection pattern across all tests
- [x] Disable branch protection in test configuration
- [x] Use non-protected branch name in git helpers mock

## Success Criteria
- All task validation tests pass in CI environment
- GitHub Actions deployment pipeline completes successfully
- Test isolation maintained through proper dependency injection
- No real branch protection logic executed during tests

## Technical Approach
Apply the same dependency injection pattern already used in branch protection tests to task validation tests. Each test will receive mocked dependencies through the options parameter, ensuring real services are not called during testing.

## Recent Progress

### Investigation Phase
- Identified root cause: Task validation tests were not mocking dependencies
- Real branch protection logic was running in CI and blocking edits on 'main' branch
- Found 8 failing tests in `src/hooks/pre-tool-validation.test.ts`

### Implementation Phase
- Added mock helper functions to task validation test suite (copied from branch protection suite)
- Applied dependency injection pattern to all 8 failing tests
- Each test now receives:
  - `getConfig: () => createMockConfig(false)` - disables branch protection
  - `gitHelpers: createMockGitHelpers('feature/test')` - uses non-protected branch
- Maintained test isolation by keeping separate mock helpers per test suite

### Verification Phase
- All 27 tests in pre-tool-validation.test.ts now passing
- Full test suite passes (297 tests total)
- Code review completed with APPROVE status
- Implementation follows established patterns and maintains code quality

<!-- github_issue: 56 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/56 -->
<!-- issue_branch: 56-fix-github-actions-deployment-failures-with-dependency-injection -->