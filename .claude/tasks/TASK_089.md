# TASK_089: Fix Markdown Parsing Issue in Branch Name Generation

## Purpose
Fix the markdown parsing issue in the `generateBranchName` method in `src/lib/git-helpers.ts` where LLM responses wrapped in markdown code blocks fail to extract the actual branch name, causing fallback to generic names like `387-markdown`.

## Status
- [x] in_progress

## Requirements
- [ ] Strip markdown code block wrappers from LLM responses
- [ ] Extract actual branch name from cleaned text
- [ ] Handle responses with or without markdown blocks
- [ ] Maintain existing branch name pattern matching (`^(feature|bug|chore|docs)/`)
- [ ] Preserve task ID addition logic
- [ ] Test with various response formats

## Success Criteria
- Branch name generation works correctly for both plain text and markdown-wrapped responses
- Plain text response `feature/merge-llm-tests-004` → `feature/merge-llm-tests-004`
- Markdown wrapped response `` ```markdown\nfeature/merge-llm-tests-004\n``` `` → `feature/merge-llm-tests-004`
- Generic fallback names are no longer generated when valid branch names exist in markdown blocks

## Technical Approach
Update the `generateBranchName` method in `src/lib/git-helpers.ts` (lines 239-271):

1. **Pre-process response**: Strip markdown code blocks using regex patterns
   - Remove opening: `/^```[a-z]*\n?/i`
   - Remove closing: `/\n?```$/i`
2. **Parse cleaned text**: Apply existing branch name pattern matching logic
3. **Preserve existing logic**: Keep task ID addition and validation

## Current Focus
Implementing the markdown stripping logic before the existing branch name pattern matching in the `generateBranchName` method around lines 245-257.

## Next Steps
1. Update the parsing logic in `git-helpers.ts`
2. Test with various LLM response formats
3. Verify existing functionality remains intact
4. Document the change if needed

**Started**: 2025-09-22 18:06

<!-- github_issue: 120 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/120 -->
<!-- issue_branch: 120-task_089-fix-markdown-parsing-issue-in-branch-name-generation -->