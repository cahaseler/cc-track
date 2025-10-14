# Fix Code Review Failure Due to Token Limit Overflow

**Purpose:** Prevent Claude code review failures when git diffs exceed token limits by implementing smart diff truncation and better error handling.

**Status:** completed
**Started:** 2025-09-17 19:24
**Task ID:** 076

## Requirements
- [ ] Add diff size checking before passing to Claude code review
- [ ] Implement smart truncation that preserves file boundaries (not mid-file cuts)
- [ ] Add configurable `code_review.max_diff_size` setting to track.config.json
- [ ] Provide clear summary of what was omitted when truncating
- [ ] Improve error handling to detect "success but no output" cases
- [ ] Add descriptive error messages for token limit issues
- [ ] Add logging to help diagnose future token overflow problems

## Success Criteria
- Code reviews complete successfully even with large diffs (64+ files)
- Users get clear feedback when diffs are truncated for size
- Error messages clearly identify token limit issues vs other failures
- Configuration allows users to adjust limits based on their needs
- No more mysterious "success with cost but 0 tokens" crashes

## Technical Approach

### Files That Need Modification

**Primary Implementation:**
- `src/commands/prepare-completion.ts:112-133` - Add diff truncation before calling `performCodeReview`
- `src/lib/code-review/claude.ts:27-40` - Add error detection for empty reviews after "success"
- `src/lib/config.ts:134-140` - Add max_diff_size configuration option

**Supporting Implementation:**
- `src/lib/code-review/types.ts` - Add maxDiffSize to CodeReviewOptions interface
- `src/lib/code-review/index.ts` - Pass maxDiffSize through to review functions

### Implementation Details

**Diff Truncation Logic (based on existing patterns):**
- Follow pattern from `src/lib/diff-summary.ts:42-52` for smart boundary truncation
- Use character limit approach like `maxBuffer: 10 * 1024 * 1024` pattern seen in codebase
- Default to 320,000 characters (~80k tokens with 4 chars/token ratio)

**Config Pattern (follow existing pattern):**
```typescript
code_review: {
  enabled: false,
  description: 'Run comprehensive code review before task completion',
  tool: 'claude' as const,
  max_diff_size: 320000, // NEW: characters limit for diff size
},
```

**Error Handling Pattern:**
- Check `reviewText.length === 0` after stream completes with success
- Log token overflow scenarios similar to `src/lib/claude-sdk.ts:197-203` timeout pattern
- Return clear error message like existing patterns in claude.ts

## Current Focus

Task completed on 2025-09-17

## Research Findings

**Existing Token/Size Management:**
- `src/lib/diff-summary.ts` already implements smart diff truncation at file boundaries
- `maxBuffer: 10 * 1024 * 1024` pattern used throughout codebase for large outputs
- Config system in `src/lib/config.ts` supports nested configuration options
- Claude SDK already has timeout error handling patterns to follow

**Key Files and Patterns:**
- `src/commands/prepare-completion.ts:112-133` - Git diff generation for code review
- `src/lib/code-review/claude.ts:118-174` - Claude SDK stream processing and error handling
- `src/lib/diff-summary.ts:42-52` - Smart truncation at file boundaries
- `src/lib/config.ts:134-140` - Code review configuration section
- `src/lib/claude-sdk.ts:196-204` - Timeout and error handling patterns

**Integration Points:**
- `performCodeReview()` called from prepare-completion.ts with CodeReviewOptions
- CodeReviewOptions interface in `src/lib/code-review/types.ts` 
- Configuration loaded via `getConfig()` from config.ts
- Error logging via `createLogger('prepare-completion')` pattern

## Next Steps
1. Add max_diff_size to CodeReviewConfig interface in `src/lib/config.ts:34-35`
2. Create diff truncation function in `src/commands/prepare-completion.ts` using pattern from diff-summary.ts
3. Modify gitDiff assignment at line 112-133 to check size and truncate if needed
4. Add empty review detection in `src/lib/code-review/claude.ts:173` after success check
5. Add logging for truncation events and token overflow scenarios

## Open Questions & Blockers
None - all patterns and integration points identified through codebase research.

## Implementation Strategy

**Phase 1: Configuration**
- Add `max_diff_size: number` to CodeReviewConfig in config.ts
- Update DEFAULT_CONFIG to include the new setting
- Add getter function `getMaxDiffSize()` following existing pattern

**Phase 2: Diff Truncation**  
- Create `truncateGitDiff(diff: string, maxSize: number)` function in prepare-completion.ts
- Use smart boundary detection from diff-summary.ts as reference
- Add logging when truncation occurs with summary of omitted content

**Phase 3: Error Detection**
- Enhance claude.ts to detect "success but empty output" condition  
- Add specific error message for suspected token overflow
- Log additional debugging info for diagnosis

**Phase 4: Testing**
- Test with large diffs to verify truncation works
- Test error handling with edge cases
- Verify configuration changes don't break existing functionality

<!-- github_issue: 96 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/96 -->
<!-- issue_branch: 96-fix-code-review-failure-due-to-token-limit-overflow -->