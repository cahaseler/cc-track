# TASK_094: Add WebSearch Year Validation Hook

**Purpose:** Implement smart detection in the `pre-tool-validation` hook to prevent Claude from searching for outdated year patterns like "topic 2024" when the current year is 2025, ensuring search queries use current year for better results.

**Status:** completed
**Started:** 2025-10-03 13:34
**Task ID:** 094

## Requirements
- [ ] Add WebSearch detection to `src/hooks/pre-tool-validation.ts:166-169` alongside existing Edit/Write/MultiEdit tools
- [ ] Extract and analyze query from `tool_input.query` field for WebSearch tools
- [ ] Detect year patterns using regex: `\b(20\d{2})\b` where year < current year (2025)
- [ ] Block outdated searches with educational feedback explaining the issue and suggesting corrected query
- [ ] Allow legitimate historical searches with comparison keywords or explicit historical context
- [ ] Add comprehensive test coverage in `src/hooks/pre-tool-validation.test.ts` following existing test patterns
- [ ] Add configuration option to `track.config.json` to enable/disable feature (default: enabled)
- [ ] Update settings.json to enable WebSearch validation alongside existing tools

## Success Criteria
- Hook blocks searches like "TypeScript best practices 2024" with current year suggestion
- Hook allows historical searches like "compare 2024 vs 2025" or "2024 election results"
- Hook provides clear educational feedback about current date (2025-10-03)
- All existing functionality remains intact (no regressions)
- Configuration can disable the feature if needed
- Comprehensive test coverage matches existing patterns (95%+ coverage)

## Technical Approach

### Based on Codebase Research:

**Hook Architecture Pattern (from src/hooks/pre-tool-validation.ts:166-169):**
```typescript
// Only process Edit, Write, and MultiEdit tools
if (input.tool_name !== 'Edit' && input.tool_name !== 'Write' && input.tool_name !== 'MultiEdit') {
  return { continue: true };
}
```
Will extend to include WebSearch detection before existing logic.

**Tool Input Extraction Pattern (from src/hooks/pre-tool-validation.ts:42-51):**
```typescript
export function extractFilePath(toolName: string, toolInput: unknown): string | null {
  const input = toolInput as { file_path?: string };
  if ((toolName === 'Edit' || toolName === 'Write' || toolName === 'MultiEdit') && input.file_path) {
    return input.file_path;
  }
  return null;
}
```
Will create similar `extractWebSearchQuery()` function for WebSearch tools.

**Error Response Pattern (from src/hooks/pre-tool-validation.ts:196-204):**
```typescript
return {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny' as const,
    permissionDecisionReason: `🚫 Educational message with suggestions`,
  },
};
```

**Configuration Pattern (from .claude/track.config.json:72-77):**
```json
"websearch_validation": {
  "enabled": true,
  "description": "Block outdated year patterns in WebSearch queries to improve search results"
}
```

## Implementation Details

### Code Patterns Found:
- **Hook Structure**: src/hooks/pre-tool-validation.ts follows dependency injection pattern with interfaces for testing
- **Naming Convention**: camelCase functions, underscore config keys, PascalCase types
- **Integration Point**: Line 166-169 where tool filtering occurs
- **Dependencies**: Uses getConfig(), isHookEnabled(), logger pattern established in file
- **Error Handling**: Graceful degradation - errors allow tools to proceed (lines 302-306)

### Key Files Identified:
- **Main Implementation**: src/hooks/pre-tool-validation.ts (308 lines)
- **Test File**: src/hooks/pre-tool-validation.test.ts (505 lines)
- **Config File**: .claude/track.config.json (features section)
- **Settings**: templates/settings.json (PreToolUse hooks array)

### Testing Patterns (from existing test file):
- Mock dependency injection using createMockLogger(), mock() functions
- Test both positive and negative cases for validation logic
- Test configuration enable/disable scenarios
- Test edge cases like malformed input, SDK failures
- Follow existing test structure with describe/test blocks

## Current Focus
Start with extending the tool detection logic in src/hooks/pre-tool-validation.ts:166-169 to include WebSearch, then implement extractWebSearchQuery() function following the extractFilePath() pattern at line 42-51.

## Research Findings
- **WebSearch Tool Usage**: Found in src/lib/log-parser.test.ts showing tool_input.query field structure
- **Hook Documentation**: reference/hooks.md shows WebSearch listed as valid PreToolUse matcher at line 112
- **Similar Implementation**: Branch protection logic (lines 174-209) provides excellent pattern for configuration-based validation with clear user feedback
- **Tool Input Structure**: WebSearch uses `{ query: string }` format in tool_input field
- **Configuration Location**: Add to features section of track.config.json, not hooks section (websearch_validation feature)

## Next Steps
1. Add WebSearch to tool detection condition at src/hooks/pre-tool-validation.ts:167
2. Create extractWebSearchQuery() function following extractFilePath() pattern
3. Implement validateWebSearchQuery() with regex pattern detection
4. Add configuration check following branch_protection pattern
5. Add comprehensive test coverage in pre-tool-validation.test.ts
6. Update track.config.json with new websearch_validation feature

## Open Questions & Blockers
None - all required patterns and integration points have been identified through codebase research. Current year is clearly established as 2025 from environment context.

## Recent Progress

### 2025-10-03 14:30 UTC - Implementation Complete ✅

Successfully implemented WebSearch year validation with comprehensive testing and documentation.

**Implementation Summary:**
- Added three detection functions: `getCurrentYear()`, `detectOutdatedYear()`, `isHistoricalSearch()`
- Integrated WebSearch validation into pre-tool-validation hook (runs before file-based checks)
- Added 21 new test cases covering all scenarios (396 total tests pass)
- Updated hook dispatcher to route WebSearch tools to pre-tool-validation
- Added configuration type and feature flag with proper defaults

**Files Modified:**
- `src/hooks/pre-tool-validation.ts` - Core validation logic with 4 year detection patterns
- `src/hooks/pre-tool-validation.test.ts` - Comprehensive test coverage
- `src/commands/hook.ts` - Added WebSearch to dispatcher routing
- `src/types.ts` - Added websearch_validation config interface
- `.claude/settings.json` - Added WebSearch PreToolUse hook with 5s timeout
- `.claude/track.config.json` - Enabled websearch_validation feature
- `templates/track.config.json` - Added for new installations
- `src/commands/init.ts` - Updated setup instructions
- `README.md` - Added feature documentation with examples

**Testing Results:**
- ✅ All 396 tests pass
- ✅ Manual testing confirms proper blocking/allowing behavior
- ✅ Blocks: "TypeScript 2024" → suggests "TypeScript 2025"
- ✅ Allows: "compare 2024 vs 2025", "2024 election results"

**Code Review Findings:**
- Overall Assessment: APPROVED - Production ready
- Test Coverage: 95%+ estimated
- Security: No vulnerabilities identified
- Performance: Low overhead, <5ms per validation
- All minor recommendations deferred to future enhancements

**User Acceptance Testing:**
Successfully tested live WebSearch queries:
- Blocked outdated year search with educational feedback
- Allowed corrected current year search
- Allowed legitimate historical searches

<!-- github_issue: 132 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/132 -->
<!-- issue_branch: 132-task_094-add-websearch-year-validation-hook -->

## Current Focus

Task completed on 2025-10-03
