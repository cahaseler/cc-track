# Feature Specification: Fix code_index.md File Structure

**Feature ID**: `004`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Clean up duplicate and useless entries in code_index.md that were leftover artifacts from TASK_002's pivoted implementation

## Requirements

- [x] Remove all duplicate "Directory Structure" sections from lines 46-136 in code_index.md
- [x] Remove all duplicate "Key Files" sections from lines 46-136 in code_index.md
- [x] Keep only the clean structure already added (lines 1-71)
- [x] Verify no automation currently writes to code_index.md
- [x] Confirm pre_compact hook only updates learned_mistakes.md
- [x] Confirm post_compact hook only injects instructions without modifying files
- [x] Document that code_index.md is for manual updates during sessions
- [x] Document that code_index.md tracks significant structural changes, not every file modification

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
