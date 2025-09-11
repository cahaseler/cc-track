# Headless CLI Research Findings

## Core Headless Mode

### Basic Syntax
```bash
claude -p "prompt"           # Headless mode
claude --print "prompt"      # Same as -p
```

### Key Characteristics
- Non-interactive mode
- Outputs result directly to terminal
- Does NOT persist between sessions
- Returns to shell after completion

## Command-Line Flags

### Output Control
```bash
--output-format json         # JSON output for scripting
--output-format stream-json  # Streaming JSON (requires -p)
--verbose                    # Detailed debugging info
--mcp-debug                  # MCP-specific debugging
```

### Permission Management
```bash
--dangerously-skip-permissions     # Skip all permission prompts
--permission-mode acceptEdits      # Auto-accept edits
--allowedTools "Bash,Read,Write"   # Specify allowed tools
--disallowedTools "WebSearch"      # Block specific tools
```

### Session Management
```bash
-c, --continue              # Continue last conversation
-r, --resume                # Show list of sessions to resume
--resume <session-id>       # Resume specific session
```

### Context Control
```bash
--cwd /path/to/project      # Set working directory
--add-dir ../shared-libs    # Include additional directories
--max-tokens 8192           # Set token limit
--max-turns 5               # Limit conversation turns
```

### System Prompt
```bash
--system-prompt "instructions"        # Replace system prompt
--append-system-prompt "additions"    # Add to system prompt
```

### Model Selection
```bash
--model claude-3-5-sonnet-20241022   # Specify model
```

## Input Methods

### Direct Command
```bash
claude -p "Explain this code"
```

### Piping
```bash
echo "Explain this" | claude -p
cat file.txt | claude -p "Summarize this"
```

### JSONL Format
```bash
# Each line is complete JSON object
echo '{"role":"user","content":"Hello"}' | claude -p --output-format stream-json
```

## Practical Examples

### Automation Script
```bash
#!/bin/bash
result=$(claude -p "Analyze this code" --output-format json)
echo $result | jq '.response'
```

### Git Commit Helper
```bash
claude -p "Stage changes and write commits" \
  --allowedTools "Bash(git add:*),Bash(git commit:*)" \
  --permission-mode acceptEdits
```

### Resume with Context
```bash
session_id=$(claude -p "Start task" --output-format json | jq -r '.session_id')
claude -p --resume "$session_id" "Continue task"
```

### WSL-Specific Setup
```bash
claude -p "Fix error" \
  --append-system-prompt "Working in WSL2. Use 'service' not 'systemctl'" \
  --cwd /mnt/c/projects
```

## Performance Tips

### For Production
- Turn off `--verbose` for cleaner output
- Use `--output-format json` for parsing
- Set `--max-tokens` to control costs
- Use `--permission-mode` to avoid prompts

### For Development
- Use `--verbose` for debugging
- Enable `--mcp-debug` for MCP issues
- Keep sessions with `--resume`

## Limitations

### Session Persistence
- Headless mode doesn't persist automatically
- Must use `--resume` to continue
- Each invocation is isolated

### Interactive Features
- No access to slash commands in headless
- Can't enter plan mode via CLI flag
- No interactive permission prompts

### Output Handling
- Large outputs may be truncated
- Streaming requires specific format
- JSON parsing needed for automation