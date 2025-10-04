# TASK_095: Add Codex Code Review Option

## Purpose
Add a third code review tool option using Codex CLI via execSync, following the same pattern as the CodeRabbit reviewer to provide users with another automated code review option.

## Status
- [x] in_progress

## Requirements
- [ ] Update `CodeReviewTool` type union in types.ts to include `'codex'`
- [ ] Create `src/lib/code-review/codex.ts` with `performCodexReview()` function
- [ ] Implement execSync call to Codex CLI with comprehensive review prompt
- [ ] Add 30-minute timeout handling (matching CodeRabbit pattern)
- [ ] Parse Codex output and save to markdown file in code-reviews/ directory
- [ ] Include dependency injection pattern for testing (execSync, fileOps, logger)
- [ ] Update `src/lib/code-review/index.ts` to include Codex option
- [ ] Add Codex import and case to switch statement
- [ ] Update `CodeReviewDeps` interface with `performCodexReview`
- [ ] Update prepare-completion.ts with Codex timeout display logic
- [ ] Write comprehensive tests in `src/lib/code-review/codex.test.ts`
- [ ] Test successful review, timeout handling, error cases, CLI not installed, and dependency injection

## Success Criteria
- Codex appears as a selectable code review tool option
- Codex reviews are performed with comprehensive prompts including task context, git diff, and review criteria
- Reviews are saved to `code-reviews/TASK_XXX_[DATE].md` format
- 30-minute timeout is properly handled and displayed to users
- Error handling covers CLI not installed and execution failures
- All tests pass with proper dependency injection patterns
- Implementation follows existing CodeRabbit reviewer patterns

## Technical Approach
- Mirror CodeRabbit's implementation structure using execSync to invoke Codex CLI directly
- Pass comprehensive review prompt similar to Claude reviewer including:
  - Task context (ID, title, requirements)
  - Git diff of changes  
  - Review criteria (requirements alignment, security, quality, performance)
  - Instructions to write review to markdown file
- Use same timeout and error handling patterns as CodeRabbit
- Maintain dependency injection for testability

## Current Focus
Setting up the basic Codex reviewer implementation following the established patterns from CodeRabbit.

## Next Steps
1. Update types.ts to add 'codex' to CodeReviewTool union
2. Create codex.ts with performCodexReview function
3. Update index.ts to integrate Codex option
4. Add timeout display logic to prepare-completion.ts
5. Write comprehensive tests

**Started:** 2025-10-03 16:50

<!-- github_issue: 134 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/134 -->
<!-- issue_branch: 134-task_095-add-codex-code-review-option -->