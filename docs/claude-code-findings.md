# Claude Code Technical Findings

## Hook System

### Available Hook Events
1. **UserPromptSubmit** - Fires when user submits a prompt, before Claude processes it
   - Can block prompts with exit code 2
   - Can inject additional context via stdout or JSON
   - Receives: session_id, transcript_path, cwd, prompt

2. **PreToolUse** - Before any tool execution
   - Can block tool calls with exit code 2  
   - Can auto-approve with JSON decision field
   - Receives: tool_name, tool_input
   - Matcher supports regex patterns

3. **PostToolUse** - After tool execution
   - Cannot block (tool already ran)
   - Can provide feedback to Claude
   - Receives: tool_name, tool_input, tool_response

4. **SessionStart** - When session begins/resumes
   - Can inject context via additionalContext field
   - Receives: source (startup/resume/clear/compact)

5. **SessionEnd** - When session ends
   - Receives: reason (clear/logout/exit/other)

6. **PreCompact** - Before context compaction
   - Cannot block compaction
   - Receives: trigger (manual/auto), custom_instructions

7. **Stop/SubagentStop** - When Claude finishes responding
   - Can block stopping with exit code 2 (forces continuation)

8. **Notification** - When Claude sends notifications

### Hook Configuration
- Stored in: `~/.claude/settings.json` (global) or `.claude/settings.json` (project)
- Structure:
```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",  // Optional, regex supported
        "hooks": [
          {
            "type": "command",
            "command": "script.sh",
            "timeout": 60000  // Optional, default 60s
          }
        ]
      }
    ]
  }
}
```

### Hook Execution
- Input: JSON via stdin
- Output control via exit codes:
  - 0: Success
  - 1: Non-blocking error
  - 2: Blocking error (shows stderr to Claude/user)
- Parallel execution for multiple matching hooks
- Environment variable: `CLAUDE_PROJECT_DIR` available

### Special Output Fields
- `decision`: "block"/"approve"/"deny"/"ask"
- `reason`: Explanation shown to Claude/user
- `suppressOutput`: Hide from transcript
- `systemMessage`: Warning for user
- `hookSpecificOutput.additionalContext`: Add context

## Context Management

### Token Limits
- Automatic compaction at 160k tokens
- Manual compaction via `/compact` command
- Can provide custom instructions to `/compact`

### Context Preservation Issues
- Compaction loses details like:
  - Data types and database structures
  - Specific utility functions
  - Tool preferences (e.g., "use MCP not psql")
  - Project-specific conventions

### CLAUDE.md
- Loaded automatically at session start
- Can be project-specific or global
- **CAN import other files using @path/to/import syntax!**
  - Supports relative and absolute paths
  - Can import from home dir (e.g., @~/.claude/instructions.md)
  - Recursive imports allowed (max 5 levels)
  - Not evaluated in code spans/blocks
  - View loaded files with `/memory` command
- Used for project memory and instructions

## CLI Features

### Session Management
- `claude` - Interactive mode
- `claude -p "prompt"` - One-time task
- `claude -c` - Continue last conversation
- `claude -r` - Resume specific session
- `--resume <session-id>` - Resume by ID

### Model Configuration
- `/model` command to switch models
- `[1m]` suffix for 1M token context
- Can specify model in slash command frontmatter

### Slash Commands
- Custom commands in `.claude/commands/`
- Support YAML frontmatter for metadata:
  - `allowed-tools`
  - `argument-hint`
  - `description`
  - `model`
- Can execute bash with `!` prefix in commands

### Subagents
- `/agents` command for management
- Configured via markdown files with frontmatter
- Can specify tools, model, color
- Issues: API errors, context loss

## MCP (Model Context Protocol)
- Add servers: `claude mcp add`
- Tool naming: `mcp__<server>__<tool>`
- Can be configured in settings or via CLI

## Settings Hierarchy
1. Managed policy settings (enterprise)
2. User settings (`~/.claude/settings.json`)
3. Project settings (`.claude/settings.json`)
4. Local project settings (`.claude/settings.local.json`)
5. Environment variables

## Performance Considerations
- Hook timeout: 60s default
- Headless CLI calls add 3-4s overhead
- Hooks run in parallel for same event
- Context compaction is lossy

## Key Limitations Discovered
1. ~~CLAUDE.md cannot programmatically include other files~~ **SOLVED: Use @path/to/import syntax**
2. Compaction algorithm is not customizable
3. No way to mark content as "never compact"
4. Subagents lose context from parent session
5. Hooks cannot modify prompts, only block or add context

## Opportunities for cc-pars
1. **Smart Context Management**
   - Pre-research critical context before tasks
   - Build "context index" of key facts via imported files
   - Use CLAUDE.md imports to dynamically load task context
   - Hooks can modify imported files to update context
   - Use journal strategically for persistence

2. **Enhanced Task Tracking**
   - File-based tasks that persist across sessions
   - Automatic task generation from triggers
   - Map tasks to git branches/PRs

3. **Validation Hooks**
   - Detect when Claude claims completion
   - Run verification subagent
   - Block premature stopping

4. **Optimized Workflows**
   - Batch validations vs per-edit hooks
   - Use prompts for rules, hooks for enforcement
   - Compiled Bun executables for speed