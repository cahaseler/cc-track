# Feature Specification: Improve /complete-task Command with Smart Script

**Feature ID**: `021`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Create a comprehensive TypeScript script that handles all programmatic aspects of task completion safely, with intelligent error handling and clear reporting to Claude for decision-making on edge cases.

## Requirements

- [ ] Create `.claude/scripts/complete-task.ts` script with core operations
- [ ] Implement prerequisite validation (active task check, file existence)
- [ ] Add task status update functionality (in_progress → completed)
- [ ] Implement CLAUDE.md update (replace active task with no_active_task.md)
- [ ] Update no_active_task.md with completed task entry
- [ ] Add validation checks (TypeScript and Biome)
- [ ] Implement safe git operations (WIP commit squashing when appropriate)
- [ ] Add branching support for git_branching workflows
- [ ] Design comprehensive JSON output format for reporting
- [ ] Implement safety features (no force operations, graceful error handling)
- [ ] Update `.claude/commands/complete-task.md` to use the new script
- [ ] Remove addressed item from `.claude/backlog.md`

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
