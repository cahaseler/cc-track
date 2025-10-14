# Feature Specification: Fix Missing Codex Review Option in Installation Instructions

**Feature ID**: `097`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Update the setup instructions in `src/commands/init.ts` to include Codex CLI as a third code review option, ensuring users are aware of all available tools during setup.

## Requirements

- [x] Add Codex CLI description to the code review section in setup template (line ~186-187)
- [x] Update configuration instruction to include 'codex' as valid tool option (line ~187)
- [x] Ensure the new instructions match the existing pattern and style
- [x] Verify that all three tools (claude, coderabbit, codex) are clearly differentiated in descriptions

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
