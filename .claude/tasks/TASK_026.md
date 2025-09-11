# Refactor cc-track to CLI Tool Architecture with Tests

**Purpose:** Transform cc-track from a collection of stdin/stdout scripts into a professional CLI tool with comprehensive test coverage using Commander.js and Bun's testing framework.

**Status:** in-progress
**Started:** 2025-09-11 23:02
**Task ID:** 026

## Requirements
- [x] Create /src folder structure with organized directories (cli, commands, hooks, lib)
- [x] Add commander dependency for CLI framework
- [x] Transform hooks from stdin/stdout scripts to pure functions
- [ ] Create hook dispatcher in commands/hook.ts to handle stdin/stdout once
- [ ] Implement CLI entry point with Commander.js structure
- [ ] Write comprehensive tests for all hook functions using Bun test
- [x] Write tests for library functions (config, logger, git-helpers, github-helpers)
- [ ] Create init command for project initialization
- [ ] Create backlog command for adding items
- [ ] Create complete-task command for task completion
- [ ] Build compiled binary with bun build --compile
- [ ] Update settings.json to use compiled binary instead of bun run
- [x] Maintain backwards compatibility with existing JSON interface
- [x] Preserve all existing functionality during refactor

## Success Criteria
- All hooks converted to pure functions with comprehensive test coverage
- CLI tool works identically to current stdin/stdout implementation
- All tests pass with >90% coverage
- Compiled binary executes all hook types successfully
- settings.json updated and working with new binary
- No breaking changes to existing Claude Code integration
- Clean, maintainable code structure following modern CLI patterns

## Technical Approach
- Use Commander.js for professional CLI structure with help, version, error handling
- Implement single stdin/stdout handler in commands/hook.ts that dispatches to pure hook functions
- Convert each hook script to pure function (input parameter → output return)
- Use Bun's built-in testing framework for fast, reliable tests
- Mock file system operations and external commands in tests
- Maintain identical JSON input/output interface for Claude Code compatibility
- Keep original .claude/ files untouched during development for safety

## Recent Progress
- Successfully created /src directory structure 
- Added commander.js dependency after discussing tradeoffs with Craig
- Refactored all lib modules with dependency injection pattern:
  - config.ts (9 tests passing)
  - logger.ts (10 tests passing)
  - git-helpers.ts (22 tests passing)
  - github-helpers.ts (23 tests passing)
- Refactored hooks as pure functions:
  - edit-validation.ts (16 tests passing)
  - pre-compact.ts (preserved ALL complex functionality including ErrorPatternExtractor)
- Total: 80 tests passing across lib and hooks modules

## Current Focus
Writing comprehensive tests for the pre-compact hook to verify all complex functionality works correctly

## Open Questions & Blockers
- ✅ Resolved: Commander.js chosen over minimal approach for better QoL features
- ✅ Resolved: Dependency injection pattern adopted for testability
- ✅ Resolved: Must preserve ALL hook functionality (not simplify) during refactor
- Still need to validate bun build --compile with all dependencies
- Need to ensure compiled binary has proper permissions and PATH setup

## Next Steps
1. Complete tests for pre-compact hook
2. Refactor remaining hooks (capture-plan, post-compact, stop-review)
3. Write tests for remaining hooks  
4. Implement CLI entry point with commander
5. Build and test compiled binary

<!-- branch: feature/cli-tool-refactor-with-tests-026 -->