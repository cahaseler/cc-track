# System Patterns

**Purpose:** Records established technical patterns, architectural decisions, coding standards, and recurring workflows. Ensures consistency and maintainability.

**Instructions:**
- Document significant, recurring patterns and standards
- Explain rationale behind chosen patterns
- Update when new patterns adopted or existing modified
- Append updates with: `[YYYY-MM-DD HH:MM] - [Description of Pattern/Change]`

---

## Architectural Patterns

### Hook-Based Architecture
- Event-driven system using Claude Code's hook system
- Hooks respond to specific events (PreToolUse, PostToolUse, Stop, etc.)
- Stateless hooks communicate via file system
- JSON input via stdin, output controls flow

### File-Based State Management
- All state stored in `.claude/` directory
- Markdown files for human-readable context
- JSON/JSONL for machine-readable data
- File imports via CLAUDE.md for automatic context inclusion

### Template-Based Initialization
- Templates stored in `templates/` directory
- Safe copying (no overwrites of existing content)
- Backup existing files before modification

## Design Patterns

### Command Pattern
- Slash commands in `.claude/commands/*.md`
- YAML frontmatter for metadata
- Markdown body contains instructions for Claude
- Bash execution via `!` prefix

### Observer Pattern
- Hooks observe Claude Code events
- Multiple hooks can respond to same event
- Exit codes control flow (0=success, 2=block)

## Coding Standards & Conventions

### Naming Conventions
- Functions: camelCase (e.g., `captureplan`, `extractContext`)
- Variables: camelCase for locals, UPPER_SNAKE for constants
- Classes: PascalCase (not used much)
- Files: kebab-case for scripts, snake_case for context files

### Code Style
- Indentation: 2 spaces for TypeScript/JSON
- Line length: Not strictly enforced
- Comments: Minimal in code, extensive in markdown docs

### Git Conventions
- Branch naming: feature/description-taskid, bug/description-taskid
- Commit messages: Conventional commits format (feat:, fix:, docs:, chore:, etc.)
- Automated releases: Semantic-release with GitHub Actions
- PR process: GitHub integration with automated workflows

## Testing Patterns

- Test framework: None currently (would use Bun test)
- Coverage target: Not set
- Test organization: Would be in `/tests`
- Mocking strategy: File system mocking for hooks

## Workflow Patterns

### Development Workflow
1. Research and document in `/docs`
2. Create templates in `/templates`
3. Implement scripts in `/scripts`
4. Create commands in `/commands`
5. Test with actual Claude Code session

### Hook Implementation Pattern
1. Read JSON from stdin
2. Process based on event type
3. Output JSON for control flow
4. Exit with appropriate code

### Context Update Pattern
1. Hooks append to logs (don't modify)
2. Templates provide structure
3. Claude updates during sessions
4. PreCompact extracts and preserves

## Tool Preferences

- **Runtime:** Bun over Node.js (faster, built-in TypeScript)
- **File operations:** Claude Code tools (Read/Write) over fs operations
- **Search:** Grep tool over bash grep
- **Package management:** Bun's built-in over npm/yarn
- **Shell scripts:** Bash for simple, TypeScript for complex
- **JSON parsing:** jq in bash, native in TypeScript

## Implementation Guidelines

### Safety First
- Never overwrite files with content
- Always create backups before modifications
- Check existence before operations
- Graceful handling of missing dependencies

### Performance Considerations
- Hooks have timeout limits (60s default)
- Batch operations when possible
- Cache expensive operations (like ccusage)
- Minimize blocking operations

### User Experience
- Clear, actionable error messages
- Progress indicators for long operations
- Warnings before destructive actions
- Non-intrusive by default

---

## Release Management

### Semantic Release Process
- Automated versioning based on conventional commit messages
- GitHub Actions workflow builds cross-platform binaries (Linux x64, Windows x64)
- Releases triggered on push to master branch
- Binary assets automatically attached to GitHub releases
- Changelog generation from commit history
- Version bumps: feat (minor), fix (patch), BREAKING CHANGE (major)

### Commit Message Generation
- All automated commits use conventional format
- GitHelpers.generateCommitMessage() generates conventional commits via Claude CLI
- Stop-review hook: `wip:` for work in progress, `docs:` for documentation
- Complete-task command: `feat:` for task completion, `docs:` for final updates
- Backward compatibility: Code recognizes both `[wip]` and `wip:` formats

## Logging Configuration

### Log Directory Location
- Logs are written to system-appropriate directories outside the project to avoid VS Code file notifications
- Configurable via `logging.directory` in track.config.json
- Default locations follow platform conventions:
  - **Linux/WSL**: `~/.local/share/cc-track/logs/` (XDG Base Directory spec)
  - **macOS**: `~/Library/Logs/cc-track/`
  - **Windows**: `%LOCALAPPDATA%\cc-track\logs\`
- Supports tilde expansion and environment variables in configured paths
- Log retention is automatically managed (default 7 days)

## Update Log

[2025-01-09 16:35] - Initial patterns documented based on codebase analysis

[2025-09-09 17:45] - Detected patterns: microservice

[2025-09-11 16:00] - Added semantic release process and conventional commit patterns

[2025-09-12] - Added configurable log directory pattern to keep logs outside project directory