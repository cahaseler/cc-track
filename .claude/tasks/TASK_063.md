# TASK_063: Add Configurable Code Review Tool Support

## Purpose
Make the code review tool configurable in cc-track, initially supporting "claude" (current implementation) and "coderabbit" as options to provide users with flexibility between comprehensive agent-based reviews and fast focused analysis.

## Status
in_progress

## Requirements
- [ ] Update configuration structure to support tool selection
- [ ] Create CodeRabbit review implementation with structured output parsing
- [ ] Extract Claude review logic into separate module
- [ ] Create review abstraction layer with common interface
- [ ] Update prepare-completion command to use abstracted review
- [ ] Update init command with tool selection prompt
- [ ] Add comprehensive tests for new functionality
- [ ] Update documentation and decision logs

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

## Current Focus
Setting up the foundational configuration changes and creating the abstraction layer structure to support multiple code review tools.

## Next Steps
1. Update `src/lib/config.ts` with new configuration structure
2. Create the code review module structure and types
3. Implement CodeRabbit integration with output parsing
4. Extract and modularize Claude review logic
5. Update commands to use new abstraction layer
6. Add comprehensive testing coverage