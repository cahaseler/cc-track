# Feature Specification: Make Log Directory Configurable and Move Outside Project

**Feature ID**: `032`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Make the log directory configurable via track.config.json and default to a system-appropriate location outside the project directory to eliminate VS Code file change notifications that waste tokens.

## Requirements

- [ ] Add `logging.directory` field to track.config.json configuration
- [ ] Update InternalConfig interface in config.ts to include logging configuration
- [ ] Add LoggingConfig interface with all logging settings including directory
- [ ] Update DEFAULT_CONFIG to include sensible logging defaults
- [ ] Implement platform-appropriate default log directories following XDG Base Directory spec
- [ ] Modify Logger constructor to accept log directory from config
- [ ] Update findLogDir() to check configured directory first, then fall back to system defaults
- [ ] Add method to expand environment variables and tilde in paths
- [ ] Ensure directory creation handles absolute paths correctly
- [ ] Add tests for configurable log directory functionality
- [ ] Test environment variable expansion
- [ ] Test platform-specific default selection
- [ ] Ensure backward compatibility for explicit logDir parameter
- [ ] Add one-time migration check to move existing logs from .claude/logs/
- [ ] Update .gitignore to exclude .claude/logs/ if it still exists
- [ ] Document the change in system_patterns.md

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
