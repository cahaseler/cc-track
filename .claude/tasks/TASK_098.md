# TASK_098: Fix Biome Lint Validation Parser

## Purpose
Fix the BiomeParser in `src/lib/lint-parsers.ts` that incorrectly extracts decorative box characters instead of actual error messages from Biome's verbose output format.

## Status
- **Current:** in_progress
- **Started:** 2025-10-06 12:39
- **Assignee:** Claude

## Requirements
- [ ] Fix BiomeParser.parseOutput() method to handle verbose format correctly
- [ ] Extract error messages from lines starting with `×`, `✖`, or `!` instead of box decoration lines
- [ ] Update regex pattern to capture actual error content
- [ ] Add test case for Biome verbose output format in `src/lib/lint-parsers.test.ts`
- [ ] Verify fix works with real Biome output in cc-pars and webhook-router projects
- [ ] Ensure backward compatibility with existing Biome output formats

## Success Criteria
- Parser correctly extracts `"Line 1: Use let or const instead of var."` instead of `"Line 1:  FIXABLE  ━━━━━━━━━━━━..."`
- Test case passes for verbose format output
- No regression in existing Biome parsing functionality
- Integration tests pass in target projects

## Technical Approach
1. **Root Cause Analysis:** Current regex `:(\d+):\d+ \S+ (.+)` on line 48 captures box decoration line instead of error message
2. **Solution Strategy:** 
   - Detect verbose format by presence of box characters
   - Parse subsequent lines for actual error messages
   - Look for lines starting with error indicators (`×`, `✖`, `!`)
3. **Implementation:** Update parseOutput() method logic and regex patterns

## Current Focus
Analyzing current BiomeParser implementation in `src/lib/lint-parsers.ts` to understand the parsing logic and identify the exact fix needed.

## Next Steps
1. Examine current BiomeParser.parseOutput() method
2. Implement fix for verbose format handling
3. Add comprehensive test case
4. Validate fix with real Biome output
5. Test integration in target projects

<!-- github_issue: 140 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/140 -->
<!-- issue_branch: 140-task_098-fix-biome-lint-validation-parser -->