# Feature Specification: Fix prepare-completion Command Path Issue

**Feature ID**: `073`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Fix mismatch between embedded command templates and npm package requirements by updating all command templates to use `npx cc-track` prefix for proper external project compatibility.

## Requirements

- [ ] Update prepare-completion.md template to use `npx cc-track prepare-completion`
- [ ] Update complete-task.md template to use `npx cc-track complete-task`
- [ ] Update add-to-backlog.md template to use `npx cc-track backlog`
- [ ] Update task-from-issue.md template to use `npx cc-track task-from-issue`
- [ ] Update allowed-tools patterns to use `npx cc-track` prefix
- [ ] Rebuild binary to include updated embedded resources
- [ ] Test that embedded templates work correctly in external projects

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
