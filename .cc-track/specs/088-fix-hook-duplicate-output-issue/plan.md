# Fix Hook Duplicate Output Issue

**Purpose:** Resolve the JSON duplicate output issue in the hook dispatcher that causes Claude Code to fail parsing with "Unexpected non-whitespace character after JSON at position 460"

**Status:** completed
**Started:** 2025-09-22 09:16
**Task ID:** 088

## Requirements
- [x] Debug and identify the root cause of duplicate JSON output in PreToolUse hooks
- [x] Fix the duplicate output issue without breaking existing hook functionality
- [x] Ensure branch protection works correctly (currently broken due to JSON parse error)
- [x] Verify edit validation feedback is properly received by Claude
- [x] Test all hook types (PreToolUse, PostToolUse, Stop, PreCompact) still work correctly
- [x] Add logging to help debug future hook output issues
- [x] Ensure exit codes work correctly for all scenarios

## Success Criteria
- [x] Hook dispatcher outputs exactly one JSON object per execution
- [x] Claude Code can successfully parse hook responses
- [x] Branch protection prevents edits on main/master branches with proper user feedback
- [x] Edit validation blocks invalid task status changes with proper user feedback
- [x] All existing hook functionality remains intact

## Technical Approach

### Root Cause Analysis
Based on code analysis, the duplicate output likely stems from multiple stdout.write() calls in `src/commands/hook.ts`:

1. **Line 121**: `stdout.write(messages[0] + '\n')` - for null hook type case
2. **Line 138**: `stdout.write(payload + '\n')` - for successful hook execution  
3. **Line 151**: `stdout.write(payload + '\n')` - for error cases

### Investigation Points
1. **Multiple hook configuration**: Settings in `.claude/settings.json` show PreToolUse hooks configured for "Edit|MultiEdit" matcher
2. **Handler return paths**: The `runHookCommand` function has multiple return paths that all write to stdout
3. **Error handling**: Error cases may be causing additional output after successful output
4. **Command result handling**: The returned CommandResult structure may be causing duplicate processing

### Fix Strategy
1. **Consolidate output logic**: Ensure only one stdout.write() call per hook execution
2. **Fix runHookCommand flow**: Streamline the function to have a single output point
3. **Add debugging**: Include more detailed logging to track output generation
4. **Test integration**: Verify the fix works with actual Claude Code hook execution

## Implementation Details

### Key Files to Modify
- **src/commands/hook.ts** (lines 106-160): Main hook dispatcher logic
  - `runHookCommand` function has multiple stdout write points
  - Need to consolidate to single output point
  - Current flow: readStdinJson -> determineHookType -> execute handler -> write output

### Current Hook Flow Analysis
```typescript
// Current problematic flow in runHookCommand:
1. Line 121: writes {"continue":true} for null hook type
2. Line 138: writes handler result JSON for successful execution
3. Line 151: writes error JSON for failures
```

### Specific Bug Location
The issue is in `runHookCommand` function where there are three separate `stdout.write()` calls. For PreToolUse events with Edit/MultiEdit tools:
1. Hook type is determined as "pre-tool-validation" 
2. Handler executes and returns result
3. Multiple paths could potentially write output

### Existing Test Coverage
- `src/commands/hook.test.ts` has basic tests for hook routing
- `src/hooks/pre-tool-validation.test.ts` has comprehensive hook logic tests
- Missing integration tests for actual stdout output behavior

### Dependencies Available
- Logger system (`src/lib/logger.ts`) for debugging output
- Existing mock infrastructure in test files
- CommandDeps system for dependency injection

## Current Focus

Task completed on 2025-09-22

## Research Findings

### Hook Output Specification  
From Claude Code documentation (`reference/hooks.md`):
- Hooks should output exactly one JSON object to stdout
- Exit code 0 = success, 2 = blocking error, other = non-blocking error
- JSON format for PreToolUse: `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "reason"}}`

### Current Implementation Analysis
- `determineHookType()` correctly routes Edit/MultiEdit to "pre-tool-validation"
- `preToolValidationHook()` returns proper HookOutput structure
- Issue appears to be in output serialization/writing, not hook logic

### Hook Configuration
Settings in `.claude/settings.json` shows proper single hook configuration:
- PreToolUse matcher "Edit|MultiEdit" -> single cc-track hook command
- No duplicate hook entries found

### Command Architecture  
- Uses Commander.js with dependency injection pattern
- `applyCommandResult()` may be processing results after stdout already written
- Need to trace if CommandResult handling adds duplicate output

## Next Steps
1. Add debug logging to each stdout.write() call in hook.ts to identify duplicate source
2. Create minimal reproduction case to isolate the exact output duplication
3. Fix the root cause by consolidating output logic to single write point  
4. Test branch protection and edit validation work correctly after fix
5. Add integration test to prevent regression

## Recent Progress

### Solution Implemented
Successfully identified and fixed the root cause of duplicate JSON output:
- **Root cause**: The `runHookCommand` function was writing directly to stdout AND returning messages that `applyCommandResult` would also write
- **Fix**: Removed all direct `stdout.write()` calls from `runHookCommand`, letting `applyCommandResult` handle all output uniformly
- **Cleanup**: Removed the `hook-status.json` workaround completely as it's no longer needed
- **Testing**: Added comprehensive tests to prevent regression

### Verification Completed
- Tested all hook scenarios (PreToolUse, PostToolUse, Stop, PreCompact) - all output single JSON
- Branch protection now works correctly without JSON parse errors
- Edit validation feedback properly reaches Claude (tested with TypeScript and lint errors)
- All tests passing, TypeScript and linting checks clean
- Code review completed and APPROVED

## Open Questions & Blockers
None - all issues resolved. The duplication was coming from our own code calling stdout.write twice, not from Claude Code.

<!-- github_issue: 118 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/118 -->
<!-- issue_branch: bug/fix-hook-duplicate-output-088 -->