# Feature Specification: Integrate Claude Code TypeScript SDK into cc-track

**Feature ID**: `039`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Replace CLI-based Claude interactions with the official TypeScript SDK to improve performance, reliability, and enable advanced features like controlled agents

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
- [x] **CRITICAL: Mock all SDK calls in test files to prevent real API calls**

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
