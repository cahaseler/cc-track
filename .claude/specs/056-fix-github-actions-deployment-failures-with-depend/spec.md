# Feature Specification: Fix GitHub Actions Deployment Failures with Dependency Injection

**Feature ID**: `056`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Apply dependency injection pattern to task validation tests to prevent real branch protection logic from blocking edits on 'main' branch in CI, fixing GitHub Actions deployment failures.

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

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
