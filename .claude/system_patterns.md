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
- Branch naming: Not specified (not a git repo currently)
- Commit messages: Would follow conventional commits
- PR process: N/A

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

## Update Log

[2025-01-09 16:35] - Initial patterns documented based on codebase analysis

[2025-09-09 17:45] - Detected patterns: microservice