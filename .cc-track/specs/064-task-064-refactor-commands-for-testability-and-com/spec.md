# Feature Specification: TASK_064: Refactor Commands for Testability and Comprehensive Unit Tests

**Feature ID**: `064`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Migrated from old task structure

## Requirements

- [x] Introduce a shared command dependency context module that exposes default adapters and injectable interfaces for console, process, filesystem, git, GitHub, child process, logging, and time utilities
- [x] Refactor simple commands (`init`, `setup-commands`, `setup-templates`, `backlog`, `parse-logs`) to use the new context and return structured results instead of calling globals
- [x] Refactor mid-complexity commands (`statusline`, `prepare-completion`, `hook`, `git-session`) to follow the same pattern with extracted pure action functions
- [x] Refactor complex commands (`create-task-from-issue`) into smaller injectable units that cover filesystem updates, git workflow, and GitHub integration without direct `process.exit`
- [x] Refactor `complete-task` into injectable components that emulate the legacy behaviour (validation → docs → git → GitHub) while returning structured results
- [x] Update CLI registration to instantiate commands via new factory functions and ensure Commander wiring remains intact
- [x] Add comprehensive unit test suites for each converted command action covering happy paths, validation errors, and dependency failures using stubbed dependencies
- [x] Add light smoke tests for the Commander wrappers to confirm option/argument wiring and result-to-exit-code translation
- [x] Run repository lint, typecheck, and test commands to verify the refactor passes existing quality gates (done incrementally for converted commands; final run pending once `complete-task` is migrated)

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
