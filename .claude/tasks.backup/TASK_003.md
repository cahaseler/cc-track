# Git-Based Deviation Detection System

**Purpose:** Implement automatic git commits at every Stop hook to create clean checkpoints of actual changes, enabling easy deviation detection and recovery

**Status:** completed
**Started:** 2025-09-10 20:35
**Completed:** 2025-09-10 02:10
**Task ID:** 003

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

## Success Criteria
- Automatic git commits occur at configured Stop events without blocking workflow
- Deviations from task requirements are detected and reported accurately
- Pre-commit hooks can be migrated to pre-push without losing validation
- Git utilities provide easy recovery from deviations
- System integrates seamlessly with existing task tracking
- Configuration allows flexible control over commit frequency and validation levels

## Technical Approach
Build a Stop hook that automatically commits changes to git, creating checkpoints for deviation detection. Use git diff and Claude CLI to analyze whether changes align with active task requirements. Provide utilities for managing the git history created by frequent commits. Make the system configurable and opt-in to avoid disrupting existing workflows.

## Current Focus
Task completed on 2025-09-10

## Completion Summary

### What Was Delivered
- **stop_review.ts**: Fully functional Stop hook that auto-commits changes and reviews them against task requirements
- **git-session.ts**: Git utilities for managing WIP commits (squash, diff, show-revert-command)
- **git-hooks-migration.md**: Comprehensive guide for moving pre-commit hooks to pre-push
- **Settings integration**: Updated templates and project settings with Stop hook configuration
- **Claude CLI fixes**: Updated all hooks to run from /tmp to avoid infinite recursion

### Key Implementation Details
- Hook detects four review states: on_track, deviation, needs_verification, critical_failure
- Uses extremely explicit prompting to get JSON from Claude CLI (which ignores --output-format flag)
- Implements early exit when no changes detected for performance
- Git reset commands require explicit user approval (only shows command, doesn't execute)
- All Claude CLI invocations run from /tmp to prevent recursive hook triggering

### Critical Bug Fixes
1. **Infinite Recursion**: Running Claude CLI from project directory triggered own Stop hook
   - Solution: Set cwd to '/tmp' for all CLI calls
2. **JSON Parsing**: Claude CLI wraps responses and ignores JSON format flag
   - Solution: Explicit prompting + regex extraction of JSON from text
3. **Timeout Issues**: Initial 15s timeout too short for complex reviews
   - Solution: Increased to 2 minutes

### Lessons Learned
- External command execution in hooked directories creates recursion risks
- Claude CLI requires extremely explicit instructions for structured output
- Git commits as checkpoints provide excellent recovery mechanism
- Token usage can spike dramatically with recursive bugs ($75/hr observed!)

### Deviations from Original Requirements
- Reset utility only displays command rather than executing (safety improvement)
- Review happens via Claude CLI instead of simple diff analysis (better intelligence)