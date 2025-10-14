# Feature Specification: Handle Second Runs of complete-task Command

**Feature ID**: `059`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Modify the complete-task command to detect if it's being run a second time (PR already exists) and adjust its behavior accordingly, preventing unnecessary squashing and ensuring smooth workflow for PR review iterations.

## Requirements

- [x] Move PR existence check to happen BEFORE git squashing operations (before line 186)
- [x] Store PR existence state in a variable for use throughout the function
- [x] Make commit squashing conditional: only squash if no PR exists for the branch
- [x] Ensure push operations always happen regardless of PR status (for new commits)
- [x] Update user messaging to distinguish between first run (PR created) and subsequent runs (PR updated)
- [x] Maintain all existing functionality for non-GitHub workflows
- [x] Ensure branch switching back to default branch always happens
- [x] Preserve error handling and validation logic throughout

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
