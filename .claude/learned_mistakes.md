# Learned Mistakes

**Purpose:** Document errors encountered and their correct resolutions to avoid repeating mistakes

**Instructions:**
- This file is automatically updated by the pre_compact hook
- Each entry shows an error pattern and the correct solution
- Review these before attempting similar operations

---

## Error Patterns

*(Entries will be added here by the pre_compact hook)*

### Core Patterns
- **File Editing**: Always Read a file before Edit operations. "File has not been read yet" errors require reading first.
- **Interactive Commands**: Commands like `git rebase -i` fail in automated contexts - use non-interactive alternatives.
- **Hook Debugging**: When hooks aren't firing, verify the path in settings.json matches the actual file location.
- **Type Annotations**: TypeScript 'any' errors require explicit type annotations or type assertions.
- **Multi-line Git Messages**: Use heredoc syntax or single-line messages to avoid quote escaping issues.

### Claude CLI Integration
- Claude CLI ignores --output-format json flag - explicitly request JSON in prompt with examples
- Expect wrapper format {"type":"result","result":"actual content"} and extract inner content
- Set generous timeouts (2+ minutes) for complex prompts
- Run from neutral directory like /tmp to avoid triggering recursive hooks
