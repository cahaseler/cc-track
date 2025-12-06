# Feature Specification: Support Custom Test Commands in Prepare Completion Hook

**Feature ID**: `081`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Enable configurable test commands in the validation system, allowing projects using different test runners (npm test, yarn test, jest, vitest, etc.) to work with cc-track's prepare completion workflow.

## Requirements

- [ ] Add `tests?: ValidationConfig` to `EditValidationConfig` interface in `src/lib/config.ts:15-19`
- [ ] Add tests configuration to `DEFAULT_CONFIG.hooks.edit_validation` in `src/lib/config.ts:84-97`
- [ ] Update `runTests()` function in `src/lib/validation.ts:154` to use configured command instead of hardcoded `'bun test'`
- [ ] Add configuration check for `enabled` flag before running tests (follow TypeScript pattern)
- [ ] Update tests in `src/lib/validation.test.ts` to verify custom test commands work correctly
- [ ] Ensure backward compatibility - existing behavior unchanged when no config provided

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
