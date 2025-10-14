# Support Custom Test Commands in Prepare Completion Hook

**Purpose:** Enable configurable test commands in the validation system, allowing projects using different test runners (npm test, yarn test, jest, vitest, etc.) to work with cc-track's prepare completion workflow.

**Status:** completed
**Started:** 2025-09-18 16:10
**Task ID:** 081

## Requirements
- [ ] Add `tests?: ValidationConfig` to `EditValidationConfig` interface in `src/lib/config.ts:15-19`
- [ ] Add tests configuration to `DEFAULT_CONFIG.hooks.edit_validation` in `src/lib/config.ts:84-97`
- [ ] Update `runTests()` function in `src/lib/validation.ts:154` to use configured command instead of hardcoded `'bun test'`
- [ ] Add configuration check for `enabled` flag before running tests (follow TypeScript pattern)
- [ ] Update tests in `src/lib/validation.test.ts` to verify custom test commands work correctly
- [ ] Ensure backward compatibility - existing behavior unchanged when no config provided

## Success Criteria
- Projects can configure custom test commands via `track.config.json`
- Test validation can be disabled entirely via `enabled: false`
- Existing projects continue working without configuration changes
- All validation tests pass including new test command scenarios

## Technical Approach
Follow the established pattern used by TypeScript and lint validation:

### 1. Configuration Interface (src/lib/config.ts)
Add `tests?: ValidationConfig` to `EditValidationConfig` interface at line 18, following the pattern of `typecheck` and `lint` properties.

### 2. Default Configuration (src/lib/config.ts:84-97)
Add tests configuration to the existing `edit_validation` section:
```typescript
tests: {
  enabled: true,
  command: 'bun test',
}
```

### 3. Validation Logic (src/lib/validation.ts:154-221)
Update `runTests()` function to:
- Get test config from configuration system (follow `runTypeScriptCheck` pattern at lines 66-89)
- Check `enabled` flag first and return early if disabled
- Use configured command instead of hardcoded `'bun test'` on lines 174 and 184

## Implementation Details

### Current Hardcoded Commands Found
- Line 174: `exec('bun test >/dev/null 2>&1', ...)`
- Line 184: `exec('bun test 2>&1 || true', ...)`

### Pattern to Follow
Based on `runTypeScriptCheck()` function at lines 66-89:
```typescript
const config = getConfig();
const editValidation = config.hooks?.edit_validation as EditValidationConfig | undefined;
const testsConfig = editValidation?.tests;

if (!testsConfig?.enabled) {
  log.info('Tests disabled');
  return { passed: true };
}

const command = testsConfig?.command || 'bun test';
```

### Configuration Access Pattern
TypeScript validation uses this pattern (lines 72-81):
```typescript
const config = getConfigFn();
const editValidation = config.hooks?.edit_validation as EditValidationConfig | undefined;
const tsConfig = editValidation?.typecheck;

if (!tsConfig?.enabled) {
  log.info('TypeScript check disabled');
  return { passed: true };
}

const command = tsConfig?.command || 'bunx tsc --noEmit';
```

### Dependency Injection Support
The function already accepts `deps: ValidationDeps` parameter and uses dependency injection for `getConfig` via `deps.getConfig || getConfig`.

## Current Focus

Task completed on 2025-09-18

## Research Findings
- **Similar Implementation**: Found TypeScript validation at `src/lib/validation.ts:66-89` follows exact pattern needed
- **Pattern Used Throughout**: Both TypeScript and lint use `ValidationConfig` interface with `enabled` and `command` properties  
- **Configuration Structure**: `DEFAULT_CONFIG.hooks.edit_validation` already contains `typecheck` and `lint` configurations
- **Test Infrastructure**: `src/lib/validation.test.ts` has comprehensive test suite with proper mocking patterns
- **Dependency Injection**: Function already supports dependency injection for all external dependencies including `getConfig`

## Next Steps
1. Add `tests?: ValidationConfig` to `EditValidationConfig` interface in `src/lib/config.ts:18`
2. Add tests configuration to `DEFAULT_CONFIG.hooks.edit_validation` in `src/lib/config.ts` following existing pattern
3. Update `runTests()` function in `src/lib/validation.ts:154` to use configuration system
4. Update tests in `src/lib/validation.test.ts` to verify custom test commands and disabled scenarios
5. Test backward compatibility with projects that don't have test configuration

## Example Configuration
Projects can configure custom test commands:
```json
{
  "hooks": {
    "edit_validation": {
      "tests": {
        "enabled": true,
        "command": "npm test"
      }
    }
  }
}
```

Or disable tests entirely:
```json
{
  "hooks": {
    "edit_validation": {
      "tests": {
        "enabled": false
      }
    }
  }
}
```

<!-- github_issue: 106 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/106 -->
<!-- issue_branch: 106-support-custom-test-commands-in-prepare-completion-hook -->