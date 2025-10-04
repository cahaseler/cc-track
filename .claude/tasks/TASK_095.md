# TASK_095: Add Codex Code Review Option

## Purpose
Add a third code review tool option using Codex CLI via execSync, following the same pattern as the CodeRabbit reviewer to provide users with another automated code review option.

## Status
- [x] in_progress

## Requirements
- [x] Update `CodeReviewTool` type union in types.ts to include `'codex'`
- [x] Create `src/lib/code-review/codex.ts` with `performCodexReview()` function
- [x] Implement execSync call to Codex CLI with comprehensive review prompt
- [x] Add 30-minute timeout handling (matching CodeRabbit pattern)
- [x] Parse Codex output and save to markdown file in code-reviews/ directory
- [x] Include dependency injection pattern for testing (execSync, fileOps, logger)
- [x] Update `src/lib/code-review/index.ts` to include Codex option
- [x] Add Codex import and case to switch statement
- [x] Update `CodeReviewDeps` interface with `performCodexReview`
- [x] Update prepare-completion.ts with Codex timeout display logic
- [x] Write comprehensive tests in `src/lib/code-review/codex.test.ts`
- [x] Test successful review, timeout handling, error cases, CLI not installed, and dependency injection
- [x] Update config.ts to include 'codex' in type definitions (identified by Codex code review)

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

## Recent Progress

### Implementation Completed (2025-10-04)
- ✅ Added `'codex'` to `CodeReviewTool` type union in types.ts
- ✅ Created `src/lib/code-review/codex.ts` with full Codex CLI integration
- ✅ Implemented `codex exec --output-last-message` command with temp file workaround for large prompts
- ✅ Added 30-minute timeout matching CodeRabbit pattern
- ✅ Integrated Codex option into code review dispatcher (index.ts)
- ✅ Updated prepare-completion.ts to show correct tool name and timeout
- ✅ Wrote comprehensive test suite with 6 tests covering all scenarios
- ✅ Fixed type system issue identified by Codex code review - added `'codex'` to config.ts type definitions

### Technical Challenges Solved
1. **Shell Escaping Issue**: Initial attempt to pass large multiline prompts via JSON.stringify caused shell parsing errors
   - **Solution**: Write prompt to temporary file, use command substitution `"$(cat /tmp/prompt)"` to read it

2. **Flag Name Correction**: Initially used `-o` flag which doesn't exist
   - **Solution**: Corrected to `--output-last-message` per official Codex docs

3. **Type System Gap**: Codex code review caught that config.ts types didn't include `'codex'`
   - **Solution**: Added `'codex'` to both `CodeReviewConfig.tool` and `getCodeReviewTool()` return type

### Validation
- All 402 tests passing
- TypeScript compilation successful
- Biome linting clean
- Successfully ran Codex code review on this task (proving the implementation works)

**Started:** 2025-10-03 16:50

<!-- github_issue: 134 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/134 -->
<!-- issue_branch: 134-task_095-add-codex-code-review-option -->

## Current Focus

Task completed on 2025-10-03
