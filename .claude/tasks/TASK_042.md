# Create Git Diff Summary Utility Using Claude SDK

**Purpose:** Create a comprehensive utility function that uses the existing Claude SDK wrapper to summarize git diffs, following established patterns for dependency injection and testing.

**Status:** planning
**Started:** 2025-09-13 17:57
**Task ID:** 042

## Requirements
- [ ] Create `src/lib/diff-summary.ts` with `DiffSummary` class and `DiffSummaryInterface`
- [ ] Implement `summarizeDiff(diff: string)` method for single diff summarization
- [ ] Implement `summarizeDiffs(diffs: string[])` method for multiple diffs
- [ ] Use constructor injection pattern for ClaudeSDK and logger dependencies
- [ ] Use haiku model for cost-efficient summarization
- [ ] Add 15000ms timeout for API calls
- [ ] Implement diff truncation for large diffs (>3000 chars)
- [ ] Include proper error handling and logging
- [ ] Create `src/lib/diff-summary.test.ts` with comprehensive unit tests
- [ ] Test successful single and multiple diff summaries
- [ ] Test error handling (SDK failures, timeouts)
- [ ] Test empty/invalid input handling
- [ ] Use dependency injection with mock ClaudeSDK and logger
- [ ] Create `src/lib/diff-summary.integration.test.ts` with real SDK testing
- [ ] Follow existing test patterns from git-helpers.test.ts

## Success Criteria
- DiffSummary class properly implements the interface with dependency injection
- All unit tests pass with mocked dependencies
- Integration test validates real SDK behavior
- Summaries are concise (<500 chars) and focus on user-visible changes
- Error handling gracefully manages SDK failures and timeouts
- Code follows established patterns from existing codebase

## Technical Approach
- Use optional dependency injection with defaults (following GitHelpers pattern)
- Lazy load ClaudeSDK if not provided (ensureClaudeSDK pattern)
- Implement structured prompt engineering for bullet-point summaries
- Focus on "what changed" rather than "how"
- Group related changes and ignore formatting/whitespace changes
- Truncate large diffs before API submission

## Current Focus
Start with creating the main `DiffSummary` class in `src/lib/diff-summary.ts`, implementing the core functionality with proper dependency injection and error handling.

## Open Questions & Blockers
- Need to verify existing ClaudeSDK interface and available methods
- Confirm logger creation patterns from existing codebase
- Validate haiku model availability and naming convention

## Next Steps
1. Create `src/lib/diff-summary.ts` with class structure and interfaces
2. Implement core summarization methods with proper error handling
3. Create comprehensive unit tests with mocked dependencies
4. Add integration test for real SDK validation
5. Test edge cases and validate truncation logic

<!-- github_issue: 25 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/25 -->
<!-- issue_branch: 25-create-git-diff-summary-utility-using-claude-sdk -->