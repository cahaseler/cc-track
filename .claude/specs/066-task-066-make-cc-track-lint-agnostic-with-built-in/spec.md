# Feature Specification: TASK_066: Make cc-track Lint-Agnostic with Built-in Support for Biome and ESLint

**Feature ID**: `066`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Migrated from old task structure

## Requirements

- [x] Create lint parser abstraction with BiomeParser, ESLintParser, and GenericParser
- [x] Update configuration structure to support tool detection and auto-fix commands
- [x] Refactor `src/lib/validation.ts` - rename `runBiomeCheck` to `runLintCheck` and remove hardcoded assumptions
- [x] Refactor `src/hooks/edit-validation.ts` - rename function and replace Biome-specific parsing
- [x] Update ValidationResult interface from `biome?` to `lint?` across all files
- [x] Update user-facing messages in `src/commands/prepare-completion.ts` to be tool-agnostic
- [x] ~~Implement backward compatibility for existing configurations~~ Not needed - no existing users
- [x] Update default configurations and templates
- [x] Add comprehensive tests for all parsers and tool configurations
- [x] Update documentation with examples for Biome, ESLint, and custom tools

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
