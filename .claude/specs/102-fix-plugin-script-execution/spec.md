# Feature Specification: Fix Plugin Script Execution

**Feature ID**: `102`
**Branch**: `102-fix-plugin-script-execution`
**Created**: 2025-10-15
**Status**: Postponed

---

## 🚧 Implementation Status

**POSTPONED** - This specification describes a SessionStart hook approach that was investigated but postponed due to a Claude Code bug.

**Root Cause:** Environment variables set by hooks do not persist to slash command bash execution context (using `!` prefix in command markdown files). This makes the SessionStart hook approach non-viable until Anthropic resolves the upstream bug.

**Temporary Solution Implemented:** Slash commands have been updated to use natural language instructions instead of `!` bash script execution. Claude now receives instructions to run CLI commands directly, which:
- Works immediately without environment variable support
- Provides more flexibility for different project setups
- Offers better UX for some operations (e.g., generating PR descriptions from spec files)

**Future Consideration:** This specification may be revisited if/when Claude Code fixes the environment variable persistence bug. The SessionStart hook approach described below remains a valid solution design for that scenario.

**Reference:** See decision log entry [2025-10-16] for full context on the temporary natural language solution.

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers
- 🔍 Use [NEEDS CLARIFICATION: specific question] for any ambiguity

---

## User Scenarios & Testing

### Primary User Story
As a cc-track plugin user, when I run slash commands like `/cc-track:migrate` or `/cc-track:complete-task`, the commands must successfully execute their associated TypeScript scripts so that I can use the full functionality of the plugin without errors.

Currently, these commands fail because the plugin's scripts cannot be located when executed via the `!` prefix in slash command markdown files.

### Acceptance Scenarios
1. **Given** a fresh Claude Code session starts, **When** the SessionStart hook runs, **Then** all plugin scripts are copied to a known location and `CC_TRACK_SCRIPTS_ROOT` environment variable is set
2. **Given** the plugin has been updated to a new version, **When** a new session starts, **Then** the hook detects the version change and re-copies all scripts
3. **Given** scripts are successfully installed, **When** a user runs any of the 8 slash commands, **Then** the command executes its script successfully without path errors
4. **Given** script installation fails (permissions, disk space), **When** the session starts, **Then** the user sees a warning message but the session continues
5. **Given** scripts are installed on Linux, **When** checking the installation path, **Then** scripts are in `~/.local/share/cc-track/scripts/`
6. **Given** scripts are installed on Windows, **When** checking the installation path, **Then** scripts are in `%LOCALAPPDATA%\cc-track\scripts\`

### Edge Cases
- What happens when the plugin directory structure changes between versions?
- How does the system handle partial script copy failures (some succeed, some fail)?
- What occurs when `CC_TRACK_SCRIPTS_ROOT` is set but the directory doesn't exist?
- What happens if a user manually deletes the scripts directory while Claude Code is running?
- How does the hook behave when `.claude-plugin/plugin.json` is missing or malformed?

---

## Requirements

### Functional Requirements
- **FR-001**: System MUST copy all TypeScript scripts from the plugin's `commands/scripts/` directory to a platform-specific installation directory on session start
- **FR-002**: System MUST set environment variable `CC_TRACK_SCRIPTS_ROOT` pointing to the script installation directory
- **FR-003**: System MUST detect plugin version changes by comparing current version in `.claude-plugin/plugin.json` with stored version in installation directory
- **FR-004**: System MUST only re-copy scripts when plugin version has changed (optimization to avoid unnecessary file operations)
- **FR-005**: System MUST use platform-specific paths for script installation:
  - Linux: `~/.local/share/cc-track/scripts/`
  - Windows: `%LOCALAPPDATA%\cc-track\scripts\`
- **FR-006**: System MUST update all 8 slash commands to reference `${CC_TRACK_SCRIPTS_ROOT}` instead of `${CLAUDE_PLUGIN_ROOT}`
- **FR-007**: System MUST trigger on all session start types: startup, resume, clear, compact
- **FR-008**: System MUST continue session startup even if script installation fails, but MUST warn the user
- **FR-009**: System MUST store current plugin version in installation directory (`.version` file) for future comparison
- **FR-010**: SessionStart hook MUST output JSON with `hookSpecificOutput.additionalContext` field to inject context into Claude's session, confirming script installation location

### Non-Functional Requirements
- **NFR-001**: Performance - Script copying operation MUST complete within 5 seconds on typical systems
- **NFR-002**: Reliability - Hook MUST not cause session startup to fail under any circumstances
- **NFR-003**: Maintainability - Hook script MUST be unit testable with mocked filesystem operations
- **NFR-004**: Compatibility - Solution MUST work with Claude Code's global plugin installation system

### Key Entities
- **SessionStart Hook**: Bash script that executes on session start events, responsible for script installation
- **Script Installation Directory**: Platform-specific directory containing copies of all plugin scripts
- **Version Tracking File**: `.version` file in installation directory storing current plugin version
- **Environment Variable**: `CC_TRACK_SCRIPTS_ROOT` set during session to point to installation directory
- **Slash Commands**: 8 markdown files that execute scripts via `!` prefix and need path updates

### Slash Commands Requiring Updates
1. `commands/migrate.md`
2. `commands/complete-task.md`
3. `commands/prepare-completion.md`
4. `commands/add-to-backlog.md`
5. `commands/specify.md`
6. `commands/clarify.md`
7. `commands/plan.md`
8. `commands/tasks.md`

---

## Success Criteria
- [ ] SessionStart hook runs without errors on both Linux and Windows
- [ ] All scripts are copied to correct platform-specific location
- [ ] `CC_TRACK_SCRIPTS_ROOT` environment variable is set correctly
- [ ] All 8 slash commands execute successfully in test project on Linux
- [ ] Version detection correctly identifies when plugin has been updated
- [ ] Hook includes unit tests with mocked filesystem operations
- [ ] Warning message displays when script installation fails
- [ ] Documentation updated with troubleshooting guide

---

## Scope & Boundaries

### In Scope
- Creating SessionStart hook bash script
- Registering hook in plugin configuration
- Updating all 8 slash commands to use new environment variable
- Platform-specific path handling for Linux and Windows
- Version detection and conditional re-copying
- Error handling with user warnings
- Unit tests for hook logic
- Manual testing verification on Linux

### Out of Scope
- macOS support (not required by user)
- Windows testing (will be delegated to colleague)
- Backward compatibility with old script execution method (current approach doesn't work, so no compatibility needed)
- Automatic script cleanup on plugin uninstall
- Hook configuration UI or runtime configurability
- Migration of existing installations (fresh install only)

---

## Scope & Boundaries

### Dependencies & Assumptions
- Claude Code plugin system loads environment variables set by hooks into command execution context
- Plugin is always installed globally via Claude Code's plugin system (no local/npm installations)
- `jq` command is available for JSON parsing in bash scripts
- User has write permissions to platform-specific installation directories
- `.claude-plugin/plugin.json` contains valid version string
- Commands/scripts directory structure remains stable

---

## Open Questions
- None remaining

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All sections completed or marked N/A

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified
- [x] Edge cases documented
