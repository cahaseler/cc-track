# Feature Specification: Split Task Completion into Two-Phase Workflow

**Feature ID**: `033`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Create `/prepare-completion` and enhanced `/complete-task` commands that separate validation/preparation from mechanical completion, leveraging existing automation and improving task workflow efficiency.

## Requirements

### Phase 1: `/prepare-completion` Command
- [x] Create `src/commands/validation-checks.ts` that returns structured JSON
- [x] Implement validation checks (TypeScript, Biome, tests, Knip)
- [x] Add git status reporting (uncommitted changes, modified files, WIP commits, branch check)
- [x] Add task verification (active task exists, status is in_progress, extract ID/title)
- [x] Return structured JSON report with all issues
- [x] Create `src/commands/prepare-completion.ts` wrapper that generates dynamic instructions
- [x] Create `.claude/commands/prepare-completion.md` Claude command
- [x] Add documentation update instructions (shown regardless of validation status)
- [x] Add journal reflection reminders
- [x] Leverage stop-review hook for automatic commits

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
