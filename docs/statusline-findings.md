# Status Line Configuration Research

## Overview
Custom status line displays at bottom of Claude Code interface, similar to terminal PS1 prompts.

## Configuration

### Setup Methods
1. Run `/statusline` command for interactive setup
2. Add to `.claude/settings.json`:
```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 0  // Optional: 0 lets it go to edge
  }
}
```

## Update Mechanism
- Updates when conversation messages update
- Rate limited to every 300ms max
- First line of stdout becomes status text
- ANSI color codes supported

## JSON Input Structure
Status line script receives via stdin:
```json
{
  "hook_event_name": "Status",
  "session_id": "abc123...",
  "transcript_path": "/path/to/transcript.json",
  "cwd": "/current/working/directory",
  "model": {
    "id": "claude-opus-4-1",
    "display_name": "Opus"
  },
  "workspace": {
    "current_dir": "/current/working/directory",
    "project_dir": "/original/project/directory"
  },
  "version": "1.0.80",
  "output_style": {
    "name": "default"
  },
  "cost": {
    "total_cost_usd": 0.01234,
    "total_duration_ms": 45000,
    "total_api_duration_ms": 2300,
    "total_lines_added": 156,
    "total_lines_removed": 23
  }
}
```

## Key Fields for cc-pars

### Available Data
- **session_id**: Track current session
- **transcript_path**: Access to full conversation
- **model**: Current model being used
- **workspace**: Current and project directories
- **cost**: Track spending and changes

### cc-pars Status Line Ideas
```bash
[Task: implement-auth] [Context: 45%] [Plan: active] [Git: feature/auth] [$0.12]
```

Could display:
- Current task from task files
- Context usage percentage (via `ccusage statusline`)
- Planning mode status
- Git branch
- Session cost

## Implementation Approaches

### Helper Functions Pattern
```bash
#!/bin/bash
input=$(cat)

# Extraction helpers
get_model_name() { echo "$input" | jq -r '.model.display_name'; }
get_session_id() { echo "$input" | jq -r '.session_id'; }
get_transcript() { echo "$input" | jq -r '.transcript_path'; }
get_cost() { echo "$input" | jq -r '.cost.total_cost_usd'; }

# Custom cc-pars helpers
get_current_task() {
    # Read from .claude/current_task.md
    if [ -f ".claude/current_task.md" ]; then
        head -n1 .claude/current_task.md | sed 's/# //'
    else
        echo "No task"
    fi
}

get_context_usage() {
    # Use ccusage to get token info
    usage=$(ccusage statusline 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "$usage"
    else
        echo "N/A"
    fi
}

# Build status line
TASK=$(get_current_task)
CONTEXT=$(get_context_usage)
MODEL=$(get_model_name)
COST=$(get_cost)

echo "[$MODEL] Task: $TASK | Context: $CONTEXT | \$$COST"
```

### Advanced Features
1. **Parse transcript for context percentage**
   - Count tokens in transcript JSON
   - Calculate % of 160k limit
   - Warn when approaching limit

2. **Track active plan**
   - Check if ExitPlanMode was called
   - Show plan status

3. **Monitor hooks**
   - Show which hooks are active
   - Display last hook trigger

4. **Task tracking**
   - Read current task from file
   - Show task progress/status

## Integration with cc-pars

### Task File Integration
```bash
# .claude/current_task.md
# Implement user authentication
Status: in_progress
Branch: feature/auth
Started: 2025-01-09
```

### Context Index Integration
```bash
# .claude/context_index.md
Database: PostgreSQL
Framework: Next.js
Dependencies: 42 packages
Files: 234
```

### Status Line Updates
- PreCompact hook updates context status
- UserPromptSubmit updates task if needed
- PostToolUse tracks changes made

## Tips for cc-pars Status Line
1. Keep under 80 chars for terminal width
2. Use colors to highlight warnings (red for >80% context)
3. Cache expensive operations (git status, file reads)
4. Update task status from hooks
5. Show critical project context (DB type, framework)

## Testing
```bash
# Test with mock data
echo '{"model":{"display_name":"Opus"},"session_id":"test","workspace":{"current_dir":"/test"}}' | ./statusline.sh
```

## Potential cc-pars Status Line
```bash
[Opus] 📋 auth-task | 📊 45% | 🌿 feature/auth | 💰 $0.12 | ⚡ 234 files
```

Components:
- Model name
- Current task
- Context usage
- Git branch  
- Session cost
- Project metrics