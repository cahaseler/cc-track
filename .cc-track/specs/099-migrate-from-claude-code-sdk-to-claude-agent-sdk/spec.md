# Feature Specification: Migrate from Claude Code SDK to Claude Agent SDK

**Feature ID**: `099`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Upgrade from `@anthropic-ai/claude-code` to `@anthropic-ai/claude-agent-sdk` following the official migration guide. This is primarily a package rename with one critical breaking change: we must explicitly set the Claude Code system prompt to maintain existing behavior.

## Requirements

- [x] Update package.json dependency from `@anthropic-ai/claude-code: ^1.0.112` to `@anthropic-ai/claude-agent-sdk: ^1.0.0`
- [x] Update 9 import statements across 5 TypeScript files from `'@anthropic-ai/claude-code'` to `'@anthropic-ai/claude-agent-sdk'`
- [x] Update 2 CLI path references from `claude-code/cli.js` to `claude-agent-sdk/cli.js`
- [x] Add explicit Claude Code system prompt configuration to all 6 query() calls to prevent behavioral changes
- [x] Verify compilation with TypeScript (`bun run typecheck`)
- [x] Run all tests to ensure compatibility (`bun test`)
- [x] Build CLI and perform basic smoke tests

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
