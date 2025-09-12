# Integrate Claude Code TypeScript SDK into cc-track

**Purpose:** Replace CLI-based Claude interactions with the official TypeScript SDK to improve performance, reliability, and enable advanced features like controlled agents

**Status:** in_progress
**Started:** 2025-09-12 14:28
**Task ID:** 039

## Requirements
- [x] Install `@anthropic-ai/claude-code` SDK dependency
- [x] Create proof-of-concept test script to validate Pro subscription works
- [x] Verify SDK works without API key using existing Pro subscription
- [x] Create SDK wrapper class with methods for current use cases
- [x] Implement `generateCommitMessage()` method
- [x] Implement `generateBranchName()` method  
- [x] Implement `reviewCode()` method
- [x] Implement `enrichTask()` method (for capture-plan hook)
- [x] Implement `extractPatterns()` method
- [x] Migrate existing CLI calls in GitHelpers to SDK calls
- [x] Update stop-review hook to use new SDK wrapper
- [x] Update capture-plan hook to use new SDK wrapper
- [x] Update pre-compact hook to use new SDK wrapper
- [x] Ensure all functionality works identically to CLI version
- [ ] **CRITICAL: Mock all SDK calls in test files to prevent real API calls**

## Success Criteria
- SDK installed successfully without errors
- Test script runs and receives responses using Pro subscription
- No authentication errors or API key requirements
- All existing Claude functionality works through SDK
- Performance improvement over CLI calls
- No regression in existing features

## Technical Approach
Three-phase approach starting with proof-of-concept validation:
1. **Phase 1:** Install SDK and create minimal test to validate Pro subscription works
2. **Phase 2:** Build clean wrapper abstraction and migrate existing CLI calls  
3. **Phase 3:** Explore advanced capabilities like controlled agents (future work)

## Current Focus
Migrating existing CLI calls to use the SDK wrapper. GitHelpers migration complete, now working on hooks.

## Questions Resolved
- ✅ SDK automatically uses existing Pro subscription (apiKeySource: 'none' confirmed)
- ✅ Performance is similar but cleaner (no temp files, no subprocess overhead)
- ✅ SDK provides structured responses, better error handling, and tool restrictions

## Progress Log
- ✅ Successfully installed SDK and validated Pro subscription works (apiKeySource: 'none')
- ✅ Created comprehensive SDK wrapper class with all needed methods
- ✅ Migrated GitHelpers to use SDK instead of CLI
- ✅ Migrated all hooks (stop-review, capture-plan, pre-compact) to use SDK
- ✅ Fixed TypeScript and linting issues
- ❌ **FAILED: Tests hang because SDK is not mocked - making real API calls!**
- 🔴 **BLOCKER: Must mock ClaudeSDK in all test files before task can be completed**

## CRITICAL ISSUE DISCOVERED

### Tests are hanging because they're making real SDK calls!
- The `bun test` command hangs at 96% CPU because test files are trying to call the real Claude SDK
- This is the SAME issue we had with the CLI - tests MUST mock all external calls
- Task is NOT complete until all SDK usage is properly mocked in test files

## Current Status

### What Was Accomplished
- Successfully migrated all Claude CLI calls to the TypeScript SDK
- Eliminated the need for `/tmp` hack to avoid hook recursion
- Removed all temporary file creation and cleanup code
- Maintained Pro subscription authentication (no API key needed)
- Improved error handling with structured responses
- Added type safety for all Claude interactions

### Key Benefits Achieved
1. **No more /tmp hack**: SDK runs in-process, doesn't trigger hooks
2. **Cleaner code**: No temp files, better error handling
3. **Type safety**: Full TypeScript types for all Claude interactions
4. **Better performance**: No subprocess overhead
5. **Foundation for future**: Can now build advanced validation agents with controlled permissions

### Files Modified
- `package.json`: Added @anthropic-ai/claude-code dependency
- `src/lib/claude-sdk.ts`: New SDK wrapper class
- `src/lib/git-helpers.ts`: Migrated to use SDK
- `src/hooks/stop-review.ts`: Migrated to use SDK
- `src/hooks/capture-plan.ts`: Migrated to use SDK
- `src/hooks/pre-compact.ts`: Migrated to use SDK

<!-- github_issue: 18 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/18 -->
<!-- issue_branch: 18-integrate-claude-code-typescript-sdk-into-cc-track -->