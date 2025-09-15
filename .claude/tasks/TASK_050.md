# Fix Stop-Review Hook Max Turns Error

**Purpose:** Resolve the error_max_turns issue in the stop-review hook by adding maxTurns parameter to the Claude SDK call

**Status:** planning
**Started:** 2025-09-15 20:11
**Task ID:** 050

## Requirements
- [ ] Locate the Claude SDK call in `src/hooks/stop-review.ts` at line 566
- [ ] Add `maxTurns: 5` parameter to the options object
- [ ] Ensure the change follows the same pattern used in other hooks
- [ ] Verify the fix resolves the error_max_turns issue

## Success Criteria
- [ ] Claude SDK call includes `maxTurns: 5` in options
- [ ] Code change matches the pattern used in pre-compact and update task flow hooks
- [ ] No syntax errors or type issues introduced
- [ ] Hook can complete reviews that require multiple turns

## Technical Approach
Update the Claude SDK prompt call from:
```typescript
const response = await claudeSDK.prompt(prompt, model, { timeoutMs });
```

To:
```typescript
const response = await claudeSDK.prompt(prompt, model, { timeoutMs, maxTurns: 5 });
```

This follows the established pattern where pre-compact uses maxTurns: 20 and update task flow uses maxTurns: 10.

## Recent Progress
- ✅ Located the Claude SDK call in `src/hooks/stop-review.ts` at line 566
- ✅ Added `maxTurns: 5` parameter to the options object in the Claude SDK prompt call
- ✅ Verified the change follows the same pattern as other hooks (pre-compact uses maxTurns: 20)
- ✅ Confirmed no TypeScript compilation errors
- ✅ Removed the completed item from the backlog

The fix was straightforward - changed the Claude SDK call from:
```typescript
const response = await claudeSDK.prompt(prompt, model, { timeoutMs });
```
To:
```typescript
const response = await claudeSDK.prompt(prompt, model, { timeoutMs, maxTurns: 5 });
```

This allows the stop-review hook to use up to 5 turns when reviewing changes, preventing the error_max_turns issue that occurred when the review needed more than the default 1 turn to complete.

<!-- github_issue: 42 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/42 -->
<!-- issue_branch: 42-fix-stop-review-hook-max-turns-error -->