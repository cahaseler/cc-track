# Feature Specification: Git-Based Deviation Detection System

**Feature ID**: `003`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Implement automatic git commits at every Stop hook to create clean checkpoints of actual changes, enabling easy deviation detection and recovery

## Requirements

- [x] Create Stop Hook for Auto-commits
  - [x] Detect if in git repository (initialize if not)
  - [x] Stage all changes
  - [x] Commit with structured message including task ID
  - [x] Include timestamp and change summary
- [x] Add Deviation Detection
  - [x] Read current active task requirements
  - [x] Diff recent changes against last user interaction
  - [x] Use Claude CLI to evaluate if changes align with task
  - [x] Generate warning if deviation detected
- [x] Create Pre-push Migration Guide
  - [x] Document how to move pre-commit hooks to pre-push
  - [x] Provide script to automate the migration
  - [x] Maintain quality gates while allowing dirty commits
- [x] Add Git Utilities
  - [x] Create reset utility to revert to last commit before current work session (shows command only)
  - [x] Create squash utility to combine all commits since last user message
  - [x] Create show utility to display diff with task alignment analysis
- [x] Update Settings Template
  - [x] Add Stop hook configuration
  - [x] Make it opt-in initially with clear documentation
  - [x] Include examples for different validation levels
- [x] Integrate with Task System
  - [x] Tag commits with active task ID
  - [x] Link commits to progress_log.md entries
  - [x] Auto-update task status based on completion detection

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
