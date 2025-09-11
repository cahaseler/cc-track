# Refactor cc-track to CLI Tool Architecture with Tests

**Purpose:** Transform cc-track from a collection of stdin/stdout scripts into a professional CLI tool with comprehensive test coverage using Commander.js and Bun's testing framework.

**Status:** planning
**Started:** 2025-09-11 23:02
**Task ID:** 026

## Requirements
- [ ] Create /src folder structure with organized directories (cli, commands, hooks, lib)
- [ ] Add commander dependency for CLI framework
- [ ] Transform hooks from stdin/stdout scripts to pure functions
- [ ] Create hook dispatcher in commands/hook.ts to handle stdin/stdout once
- [ ] Implement CLI entry point with Commander.js structure
- [ ] Write comprehensive tests for all hook functions using Bun test
- [ ] Write tests for library functions (config, logger, git-helpers, github-helpers)
- [ ] Create init command for project initialization
- [ ] Create backlog command for adding items
- [ ] Create complete-task command for task completion
- [ ] Build compiled binary with bun build --compile
- [ ] Update settings.json to use compiled binary instead of bun run
- [ ] Maintain backwards compatibility with existing JSON interface
- [ ] Preserve all existing functionality during refactor

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

## Current Focus
Phase 1: Create /src folder structure and copy existing lib files as pure functions with initial tests

## Open Questions & Blockers
- Need to verify all current hook dependencies and external command usage
- Should validate that bun build --compile works correctly with all dependencies
- Need to ensure compiled binary has proper permissions and PATH setup
- May need to handle different JSON input structures across hooks consistently

## Next Steps
1. Create /src directory structure with all required folders
2. Add commander dependency: `bun add commander`
3. Copy and refactor lib files (config, logger, git-helpers, github-helpers) to /src/lib
4. Write initial tests for lib functions to ensure behavior preservation
5. Begin hook transformation starting with capture-plan.ts

<!-- branch: feature/cli-tool-refactor-with-tests-026 -->