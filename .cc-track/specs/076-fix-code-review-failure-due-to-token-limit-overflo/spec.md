# Feature Specification: Fix Code Review Failure Due to Token Limit Overflow

**Feature ID**: `076`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Prevent Claude code review failures when git diffs exceed token limits by implementing smart diff truncation and better error handling.

## Requirements

- [ ] Add diff size checking before passing to Claude code review
- [ ] Implement smart truncation that preserves file boundaries (not mid-file cuts)
- [ ] Add configurable `code_review.max_diff_size` setting to track.config.json
- [ ] Provide clear summary of what was omitted when truncating
- [ ] Improve error handling to detect "success but no output" cases
- [ ] Add descriptive error messages for token limit issues
- [ ] Add logging to help diagnose future token overflow problems

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
