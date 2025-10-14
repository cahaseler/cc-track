# Feature Specification: PostToolUse Hook for Edit Validation

**Feature ID**: `020`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Create a PostToolUse hook that automatically runs TypeScript and Biome checks on files after they're edited via Edit, Write, or MultiEdit tools, providing immediate feedback to Claude on any errors found.

## Requirements

- [x] Create `.claude/hooks/edit_validation.ts` hook implementation
- [x] Update `.claude/lib/config.ts` with type definitions for new config structure
- [x] Update `.claude/cc-pars.config.json` with edit_validation configuration section
- [x] Update `.claude/settings.json` to register PostToolUse hook for Edit|Write|MultiEdit
- [x] Update `.claude/commands/config-cc-pars.md` with documentation for new config options
- [x] Hook triggers only on PostToolUse for Edit, Write, and MultiEdit tools
- [x] Extract file path from tool_input for all three tool types
- [x] Skip non-TypeScript files (.ts/.tsx extension check)
- [x] Run configurable TypeScript (`bunx tsc --noEmit`) and Biome (`bunx biome check`) checks
- [x] Run checks in parallel for optimal performance
- [x] Format errors concisely for Claude's context using hookSpecificOutput.additionalContext
- [x] Return silently (continue: true) when no errors found
- [x] Make hook highly configurable (enable/disable entire hook, individual tools, custom commands)
- [x] Default to disabled for opt-in behavior
- [x] Include 5-second timeout for hook execution

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
