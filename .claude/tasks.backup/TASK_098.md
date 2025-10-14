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

## Recent Progress

**2025-10-06 18:05** - Task completed successfully
- Fixed BiomeParser to handle Biome's verbose output format
- Implemented lookahead parsing for error messages on separate lines
- Added cross-platform path handling using `path.basename()` with separator normalization
- Fixed filename collision issue by using exact basename comparison instead of substring matching
- Added comprehensive tests for verbose format, Windows paths, and filename collisions
- All 406 tests pass including 2 new tests for edge cases
- Verified fix works end-to-end with real Biome output
- Addressed Codex code review findings:
  - Windows path separator issue (used path normalization)
  - Filename collision issue (changed from substring to exact match)

**Root causes identified:**
1. Parser regex captured box decoration line instead of actual error message
2. Error messages in verbose format appear on subsequent lines starting with `×`, `✖`, or `!`
3. File path matching was too loose (substring) causing false positives
4. Windows backslash paths weren't normalized causing no matches on Windows

**Files modified:**
- `src/lib/lint-parsers.ts` - BiomeParser.parseOutput() completely rewritten
- `src/lib/lint-parsers.test.ts` - Added 2 new test cases
- `src/hooks/edit-validation.ts` - Enhanced output capture and debug logging

<!-- github_issue: 140 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/140 -->
<!-- issue_branch: 140-task_098-fix-biome-lint-validation-parser -->

## Current Focus

Task completed on 2025-10-06
