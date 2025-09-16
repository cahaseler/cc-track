# TASK_063: Add Configurable Code Review Tool Support

## Purpose
Make the code review tool configurable in cc-track, initially supporting "claude" (current implementation) and "coderabbit" as options to provide users with flexibility between comprehensive agent-based reviews and fast focused analysis.

## Status
in_progress

## Requirements
- [x] Update configuration structure to support tool selection
- [x] Create CodeRabbit review implementation with structured output parsing
- [x] Extract Claude review logic into separate module
- [x] Create review abstraction layer with common interface
- [x] Update prepare-completion command to use abstracted review
- [x] Update init command with tool selection prompt
- [x] Add comprehensive tests for new functionality
- [x] Update documentation and decision logs

## Success Criteria
- Users can configure `code_review.tool` as 'claude' or 'coderabbit'
- Both tools write compatible markdown output to `code-reviews/` directory
- Backward compatibility maintained (existing configs default to Claude)
- CodeRabbit integration handles missing installation gracefully
- Tool failures don't block task completion (warning only)
- Init command explains differences between tools

## Technical Approach

### Configuration Changes
- Extend `HookConfig` with `CodeReviewConfig` interface
- Add `tool: 'claude' | 'coderabbit'` property (default: 'claude')
- Update configuration parsing and validation functions

### Review Implementation Architecture
```
src/lib/code-review/
├── index.ts          # Abstraction layer and tool routing
├── types.ts          # Shared interfaces and types
├── claude.ts         # Claude review implementation
└── coderabbit.ts     # CodeRabbit review implementation
```

### CodeRabbit Integration
- Command: `coderabbit --plain --base <merge-base>`
- Timeout: 15 minutes (900000ms)
- Parse structured output format (file/line/type/comment/prompt sections)
- Handle missing installation with graceful degradation

### Claude Integration
- Extract existing logic from `ClaudeSDK.performCodeReview()`
- Maintain 10-minute timeout (600000ms)
- Keep current implementation behavior unchanged

## Recent Progress
- Merged latest changes from GitHub including TASK_062 completion and v1.25.0 release
- Successfully installed CodeRabbit CLI using official install script
- Created clean abstraction layer in `src/lib/code-review/` with shared types and interfaces
- Implemented CodeRabbit integration with sophisticated output parsing and markdown formatting
- Extracted Claude review logic from claude-sdk.ts into separate module
- Updated configuration structure with `CodeReviewConfig` interface extending `HookConfig`
- Modified prepare-completion command to use new abstraction layer
- Enhanced init command with tool selection prompt and explanations
- Added comprehensive test coverage (295 tests all passing) with proper DI patterns
- Fixed all TypeScript and Biome linting issues
- Built and tested final binary with all features working

## Implementation Highlights
- **Clean Architecture:** Strategy pattern for tool routing with proper separation of concerns
- **Robust Error Handling:** Graceful degradation when tools unavailable, comprehensive timeout management
- **Backward Compatibility:** Existing configs work unchanged, new format for new installations
- **Security:** Claude restricted to code-reviews/ directory, proper path resolution
- **Testing:** Full coverage with mocked dependencies following established DI patterns
- **User Experience:** Clear messaging about tool differences, actionable error messages

## Code Review Results
Received EXCELLENT assessment with zero blocking issues:
- All 8 requirements fully implemented and tested
- Clean architecture praised for following SOLID principles
- Security considerations properly addressed
- Comprehensive error handling at all levels
- Test coverage deemed exemplary
- Ready for completion with no changes required

<!-- github_issue: 71 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/71 -->
<!-- issue_branch: 71-task_063-add-configurable-code-review-tool-support -->