# Make Stop Review Hook More Lenient About Documentation Updates

**Purpose:** Modify the stop_review hook to filter out .md file changes from git diff before sending to Claude for review, preventing false deviation detections and saving tokens on documentation updates.

**Status:** planning
**Started:** 2025-09-10 17:07
**Task ID:** 022

## Requirements
- [ ] Create `getFilteredGitDiff()` method that separates .md changes from code changes
- [ ] Update `review()` method to use filtered diff for deviation detection
- [ ] Auto-approve documentation-only changes without sending to Claude
- [ ] Update `buildReviewPrompt()` to clarify that .md files are excluded
- [ ] Generate appropriate commit messages for documentation-only changes (e.g., "docs: update progress log")
- [ ] Preserve full diff for commit message generation when mixed changes exist
- [ ] Handle mixed changes (code + docs) by reviewing only code portions
- [ ] Add proper parsing logic to detect file boundaries in git diff output
- [ ] Update backlog.md to remove the addressed deviation detection item

## Success Criteria
- Documentation-only changes auto-approve without Claude review
- Code changes still get proper review with filtered diff
- Mixed changes review only the code portions
- Commit messages are appropriate for documentation vs code changes
- Token usage reduced by excluding large markdown files from review
- No false positive deviation warnings for documentation updates

## Technical Approach
1. **Diff Filtering:** Parse git diff output to identify file boundaries and filter out .md files
2. **Smart Review Logic:** Use filtered diff for review but preserve full diff for commit messages
3. **Auto-approval:** Skip Claude review entirely for documentation-only changes
4. **Enhanced Prompting:** Update review prompt to clarify exclusion of documentation files

## Current Focus
Start with implementing the `getFilteredGitDiff()` method to properly parse and filter git diff output.

## Open Questions & Blockers
- Need to verify git diff format consistency across different change types
- Should test with various markdown file extensions (.md, .markdown, .rst, etc.)
- Need to handle edge cases like renamed .md files

## Next Steps
1. Read and analyze current `.claude/hooks/stop_review.ts` implementation
2. Implement `getFilteredGitDiff()` method with proper diff parsing
3. Update `review()` method to use filtered diff logic
4. Test with different change scenarios (code-only, docs-only, mixed)
5. Update prompts and commit message generation