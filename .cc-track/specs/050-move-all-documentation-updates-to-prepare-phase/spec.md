# Feature Specification: Move All Documentation Updates to Prepare Phase

**Feature ID**: `050`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Consolidate all documentation updates (progress log, backlog clearing) into the prepare-completion phase to prevent issues when completing tasks on feature branches, where documentation prompts occur after switching back to main.

## Requirements

- [x] Update `prepare-completion.ts` to include progress log update prompts
- [x] Update `prepare-completion.ts` to include backlog item clearing prompts
- [x] Remove documentation update prompts from `complete-task.ts` (lines ~494-500)
- [x] Keep existing prepare-completion prompts for task file, decision log, and system patterns
- [x] Keep PR enhancement prompts in complete-task.ts
- [x] Ensure clean separation: prepare = validation + docs, complete = git operations + PR
- [x] Update backlog to mark this item as addressed

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
