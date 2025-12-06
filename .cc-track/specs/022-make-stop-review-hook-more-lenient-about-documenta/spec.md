# Feature Specification: Make Stop Review Hook More Lenient About Documentation Updates

**Feature ID**: `022`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Modify the stop_review hook to filter out .md file changes from git diff before sending to Claude for review, preventing false deviation detections and saving tokens on documentation updates.

## Requirements

- [x] Create `getFilteredGitDiff()` method that separates .md changes from code changes
- [x] Update `review()` method to use filtered diff for deviation detection
- [x] Auto-approve documentation-only changes without sending to Claude
- [x] Update `buildReviewPrompt()` to clarify that .md files are excluded
- [x] Generate appropriate commit messages for documentation-only changes (e.g., "docs: update progress log")
- [x] Preserve full diff for commit message generation when mixed changes exist
- [x] Handle mixed changes (code + docs) by reviewing only code portions
- [x] Add proper parsing logic to detect file boundaries in git diff output
- [x] Update backlog.md to remove the addressed deviation detection item

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
