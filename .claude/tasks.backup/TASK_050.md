# Move All Documentation Updates to Prepare Phase

**Purpose:** Consolidate all documentation updates (progress log, backlog clearing) into the prepare-completion phase to prevent issues when completing tasks on feature branches, where documentation prompts occur after switching back to main.

**Status:** completed
**Started:** 2025-09-15 20:50
**Task ID:** 050

## Requirements
- [x] Update `prepare-completion.ts` to include progress log update prompts
- [x] Update `prepare-completion.ts` to include backlog item clearing prompts
- [x] Remove documentation update prompts from `complete-task.ts` (lines ~494-500)
- [x] Keep existing prepare-completion prompts for task file, decision log, and system patterns
- [x] Keep PR enhancement prompts in complete-task.ts
- [x] Ensure clean separation: prepare = validation + docs, complete = git operations + PR
- [x] Update backlog to mark this item as addressed

## Success Criteria
- All documentation updates happen before branch switching
- No documentation prompts remain in complete-task.ts after PR creation
- prepare-completion.ts handles all documentation responsibilities
- No merge conflicts from updating docs on main after PR creation
- The workflow itself serves as validation when completing this task

## Technical Approach
Move documentation-related prompts from the complete phase to the prepare phase:
1. Add progress log update prompts to prepare-completion.ts after existing documentation prompts
2. Add backlog clearing prompts to prepare-completion.ts
3. Remove post-completion documentation prompts from complete-task.ts while preserving PR enhancement functionality

## Recent Progress
- Analyzed the current implementation in both prepare-completion.ts and complete-task.ts
- Successfully moved progress log update prompts from complete-task to prepare-completion
- Successfully moved backlog clearing prompts from complete-task to prepare-completion
- Ensured documentation prompts only appear when validation passes (not when it fails)
- Removed post-completion documentation prompts from complete-task.ts
- Simplified the "Next Steps" messaging to prevent Claude from getting ahead of itself
- Rebuilt the cc-track binary and validated the changes are working correctly

## Current Focus

Task completed on 2025-09-15

## Open Questions & Blockers
- Need to verify the exact line numbers and prompt structure in complete-task.ts
- Ensure no dependencies between documentation prompts and post-PR operations
- Confirm backlog clearing logic can be safely moved to prepare phase

## Next Steps
1. Examine `src/commands/prepare-completion.ts` to understand current structure
2. Examine `src/commands/complete-task.ts` to identify documentation prompts to move
3. Plan the specific prompt additions and removals
4. Implement changes to both files
5. Test the workflow by completing this task itself

<!-- github_issue: 44 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/44 -->
<!-- issue_branch: 44-move-all-documentation-updates-to-prepare-phase -->

# Fix Stop-Review Hook Max Turns Error

**Purpose:** Resolve the error_max_turns issue in the stop-review hook by adding maxTurns parameter to the Claude SDK call

**Status:** completed
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

