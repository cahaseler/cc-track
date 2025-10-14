# Make Log Directory Configurable and Move Outside Project

**Purpose:** Make the log directory configurable via track.config.json and default to a system-appropriate location outside the project directory to eliminate VS Code file change notifications that waste tokens.

**Status:** completed
**Started:** 2025-09-12 07:29
**Task ID:** 032

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

## Success Criteria
- Logs are written to system-appropriate directories outside project by default
- Log directory is configurable via track.config.json
- No more VS Code file change notifications from log writes
- Existing logs are migrated to new location
- All tests pass with new configuration system
- Platform detection works correctly for Linux/WSL, macOS, and Windows

## Technical Approach
1. **Configuration Updates**: Extend track.config.json with logging.directory field and update config interfaces
2. **Platform Detection**: Implement XDG Base Directory spec for Linux, Library/Logs for macOS, LOCALAPPDATA for Windows
3. **Logger Refactoring**: Update Logger class to use configured directory with system defaults as fallback
4. **Migration Strategy**: One-time check to move logs from old .claude/logs/ location
5. **Path Handling**: Support environment variable expansion and tilde resolution

## Current Focus

Task completed on 2025-09-12

## Open Questions & Blockers
- Should we preserve log history during migration or start fresh?
- How to handle permission issues when writing to system directories?
- Should we add a command to reset log location to defaults?

## Next Steps
1. Update config.ts with LoggingConfig interface and DEFAULT_CONFIG
2. Implement platform-specific default directory detection
3. Modify Logger class to use configurable directory
4. Add comprehensive tests for new functionality
5. Implement migration logic for existing logs

<!-- branch: feature/configurable-log-directory-032 -->