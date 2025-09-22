# TASK_089: Fix Markdown Parsing Issue in Task Creation

## Purpose
Fix the issue where task content wrapped in markdown code blocks by the LLM causes GitHub issues to be created with titles like `` ```markdown ``, which then creates branches named like `387-markdown`.

## Status
- [x] in_progress

## Requirements
- [x] Strip markdown code block wrappers from LLM responses in task content
- [x] Ensure clean task files without markdown wrappers
- [x] Fix GitHub issue titles to use actual task titles
- [x] Handle responses with or without markdown blocks
- [x] Add tests for markdown wrapper stripping
- [x] Verify all existing tests pass

## Success Criteria
- Task files are created without markdown code block wrappers
- GitHub issues get proper titles from the actual task content (e.g., "TASK_004: Merge PR...")
- GitHub creates sensible branch names from proper issue titles
- Both plain text and markdown-wrapped LLM responses work correctly

## Technical Approach
**Updated approach based on investigation**: The root cause was in `capture-plan.ts` where task content from the LLM is processed. When the LLM wraps its response in markdown code blocks, this wrapper was being saved to the task file, causing `formatTaskForGitHub` to extract `` ```markdown `` as the title.

**Solution implemented**:
1. Added `stripMarkdownWrapper` function in `capture-plan.ts`
2. Applied the function in three places where task content is written:
   - When using injected SDK (line 215)
   - After research succeeds (line 346)
   - In fallback enrichment (line 382)
3. Added comprehensive test for markdown wrapper stripping

## Current Focus
Completed - the fix has been implemented and tested.

## Next Steps
✅ All requirements completed

## Recent Progress

Successfully fixed the markdown parsing issue by implementing a `stripMarkdownWrapper` function in `capture-plan.ts` that removes markdown code block wrappers from LLM responses before saving task content. This ensures:

1. Task files are created without unnecessary markdown wrappers
2. GitHub issues get proper titles from the actual task content
3. GitHub creates sensible branch names from proper issue titles

The fix was applied in three critical locations where task content is written:
- When using injected SDK (line 215)
- After research succeeds (line 346)
- In fallback enrichment (line 382)

Added comprehensive test coverage and verified all 380 existing tests still pass. Code review completed and approved the implementation with no critical issues identified.

**Started**: 2025-09-22 18:06

<!-- github_issue: 120 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/120 -->
<!-- issue_branch: 120-task_089-fix-markdown-parsing-issue-in-branch-name-generation -->