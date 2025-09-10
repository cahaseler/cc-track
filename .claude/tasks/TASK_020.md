# PostToolUse Hook for Edit Validation

**Purpose:** Create a PostToolUse hook that automatically runs TypeScript and Biome checks on files after they're edited via Edit, Write, or MultiEdit tools, providing immediate feedback to Claude on any errors found.

**Status:** planning
**Started:** 2025-09-10 15:11
**Task ID:** 020

## Requirements

- [ ] Create `.claude/hooks/edit_validation.ts` hook implementation
- [ ] Update `.claude/cc-pars.config.json` with edit_validation configuration section
- [ ] Update `.claude/settings.json` to register PostToolUse hook for Edit|Write|MultiEdit
- [ ] Update `.claude/lib/config.ts` with type definitions for new config structure
- [ ] Update `.claude/commands/config-cc-pars.md` with documentation for new config options
- [ ] Hook triggers only on PostToolUse for Edit, Write, and MultiEdit tools
- [ ] Extract file path from tool_input for all three tool types
- [ ] Skip non-TypeScript files (.ts/.tsx extension check)
- [ ] Run configurable TypeScript (`bunx tsc --noEmit`) and Biome (`bunx biome check`) checks
- [ ] Run checks in parallel for optimal performance
- [ ] Format errors concisely for Claude's context using hookSpecificOutput.additionalContext
- [ ] Return silently (continue: true) when no errors found
- [ ] Make hook highly configurable (enable/disable entire hook, individual tools, custom commands)
- [ ] Default to disabled for opt-in behavior
- [ ] Include 5-second timeout for hook execution

## Success Criteria

- [ ] Hook successfully detects and reports TypeScript errors after file edits
- [ ] Hook successfully detects and reports Biome issues after file edits
- [ ] Hook performs within acceptable time limits (<2 seconds total)
- [ ] Hook can be enabled/disabled via configuration
- [ ] Individual TypeScript and Biome checks can be toggled independently
- [ ] Hook works correctly with all three edit tool types (Edit, Write, MultiEdit)
- [ ] Non-TypeScript files are properly skipped
- [ ] Error messages are formatted clearly for Claude's understanding
- [ ] Configuration is properly documented
- [ ] Hook fails gracefully when tools are not available

## Technical Approach

Implement a PostToolUse hook that:
1. Checks if edit_validation is enabled in cc-pars config
2. Parses tool_input to extract file paths from Edit/Write/MultiEdit operations
3. Validates file extensions to only process TypeScript files
4. Runs TypeScript and Biome checks in parallel for speed
5. Formats any errors found and returns them via hookSpecificOutput.additionalContext
6. Returns continue: true to allow normal operation flow

Performance targets based on testing:
- TypeScript check: ~1.3-1.4 seconds
- Biome check: ~60-160ms
- Total execution: <2 seconds

## Current Focus

Start with creating the core hook implementation in `.claude/hooks/edit_validation.ts`, focusing on:
1. Tool input parsing for all three edit tool types
2. File path extraction and TypeScript file filtering
3. Basic TypeScript and Biome command execution
4. Error output parsing and formatting

## Open Questions & Blockers

- Need to verify exact structure of tool_input for MultiEdit vs Edit/Write tools
- Confirm optimal error message formatting for Claude's context understanding
- Determine if additional file types beyond .ts/.tsx should be supported
- Validate timeout value is appropriate for various project sizes

## Next Steps

1. Create basic hook file structure and tool input parsing
2. Implement TypeScript and Biome command execution
3. Add error parsing and formatting logic
4. Update configuration files with new schema
5. Test with various file types and error scenarios
6. Add comprehensive documentation