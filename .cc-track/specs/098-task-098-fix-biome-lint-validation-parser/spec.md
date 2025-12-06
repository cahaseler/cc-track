# Feature Specification: TASK_098: Fix Biome Lint Validation Parser

**Feature ID**: `098`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Migrated from old task structure

## Requirements

- [ ] Fix BiomeParser.parseOutput() method to handle verbose format correctly
- [ ] Extract error messages from lines starting with `×`, `✖`, or `!` instead of box decoration lines
- [ ] Update regex pattern to capture actual error content
- [ ] Add test case for Biome verbose output format in `src/lib/lint-parsers.test.ts`
- [ ] Verify fix works with real Biome output in cc-pars and webhook-router projects
- [ ] Ensure backward compatibility with existing Biome output formats

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
