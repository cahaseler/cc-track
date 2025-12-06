# Feature Specification: TASK_096: Integrate Clank Code Review Reception Guidance

**Feature ID**: `096`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Update prepare-completion command to use clank's receiving-code-review skill principles when instructing Claude how to analyze code review feedback from Codex/CodeRabbit/Claude SDK, ensuring technical rigor over performative agreement.

## Requirements

- [x] Replace current instruction list at `src/commands/prepare-completion.ts:189-210` with clank-based principles
- [x] Add YAGNI violation checking (reject implementing unused features)
- [x] Require verify-first approach (check against codebase reality before implementing suggestions)
- [x] Prevent performative agreement ("You're absolutely right!" banned per CLAUDE.md)
- [x] Remove gratitude expressions (actions > words)
- [x] Check for breaking changes before accepting suggestions
- [x] Maintain existing code structure and integration patterns
- [x] Preserve the "Do not proceed with fixes" instruction at the end
- [x] Test that updated instructions display correctly when prepare-completion runs with code review enabled

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
