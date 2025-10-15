# Plugin Script Execution Workaround

## The Problem

Plugin slash commands cannot execute scripts from the plugin directory using `!` prefix bash execution.

### Why This Doesn't Work

```markdown
---
allowed-tools: Bash(bun run ${CLAUDE_PLUGIN_ROOT}/commands/scripts/migrate.ts)
---

!`bun run ${CLAUDE_PLUGIN_ROOT}/commands/scripts/migrate.ts`
```

**Issue**: The `!` prefix executes bash in the user's current working directory with no special environment variables set. `${CLAUDE_PLUGIN_ROOT}` is only available when **Claude Code spawns processes** (hooks, MCP servers), not in user's bash shell.

### What We Learned

From Claude Code documentation:
- `${CLAUDE_PLUGIN_ROOT}` works in: **hooks, MCP servers, and scripts**
- **NOT** in slash command `!` execution (runs in user's bash without plugin context)

From investigating [obra/superpowers](https://github.com/obra/superpowers):
- Jesse Vincent encountered the same limitation
- His workaround: SessionStart hook copies/clones scripts to known location (`~/.config/superpowers/skills`)
- Sets custom environment variable (`SUPERPOWERS_SKILLS_ROOT`) pointing to that location
- Commands reference the custom env var, which works because env vars ARE available in command markdown

## The Solution

We need to implement a SessionStart hook that:

1. **Copies/installs scripts to a known location** (e.g., `~/.local/share/cc-track/scripts/`)
2. **Sets a custom environment variable** (e.g., `CC_TRACK_SCRIPTS_ROOT`) pointing to that location
3. **Injects information into Claude's context** about available commands/tools
4. **Handles updates** - check if plugin version changed, re-copy scripts if needed

Then our slash commands can use:
```markdown
!`bun run ${CC_TRACK_SCRIPTS_ROOT}/migrate.ts`
```

## Implementation Plan

### 1. Create SessionStart Hook

**File**: `hooks/session-start.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

# Determine scripts installation directory
CC_TRACK_SCRIPTS_ROOT="${HOME}/.local/share/cc-track/scripts"
export CC_TRACK_SCRIPTS_ROOT

# Get plugin root (this script runs from hooks/ subdirectory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Create scripts directory if needed
mkdir -p "${CC_TRACK_SCRIPTS_ROOT}"

# Copy/sync scripts from plugin to known location
# Compare versions, only copy if plugin updated
PLUGIN_VERSION=$(jq -r '.version' "${PLUGIN_ROOT}/.claude-plugin/plugin.json")
INSTALLED_VERSION=""
if [ -f "${CC_TRACK_SCRIPTS_ROOT}/.version" ]; then
  INSTALLED_VERSION=$(cat "${CC_TRACK_SCRIPTS_ROOT}/.version")
fi

if [ "$PLUGIN_VERSION" != "$INSTALLED_VERSION" ]; then
  # Copy scripts
  cp -r "${PLUGIN_ROOT}/commands/scripts/"* "${CC_TRACK_SCRIPTS_ROOT}/"
  echo "$PLUGIN_VERSION" > "${CC_TRACK_SCRIPTS_ROOT}/.version"
fi

# Inject context for Claude
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "cc-track scripts are available at: ${CC_TRACK_SCRIPTS_ROOT}\nEnvironment variable CC_TRACK_SCRIPTS_ROOT is set for command execution."
  }
}
EOF

exit 0
```

### 2. Register Hook

**File**: `hooks/hooks.json` (or in `.claude-plugin/plugin.json`)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh"
          }
        ]
      }
    ]
  }
}
```

### 3. Update All Slash Commands

Change from:
```markdown
!`bun run ${CLAUDE_PLUGIN_ROOT}/commands/scripts/migrate.ts`
```

To:
```markdown
!`bun run ${CC_TRACK_SCRIPTS_ROOT}/migrate.ts`
```

All commands that execute scripts need this change:
- `commands/migrate.md`
- `commands/complete-task.md`
- `commands/prepare-completion.md`
- `commands/add-to-backlog.md`
- `commands/specify.md`
- `commands/clarify.md`
- `commands/plan.md`
- `commands/tasks.md`

### 4. Keep allowed-tools Correct

The `allowed-tools` line can still reference `${CLAUDE_PLUGIN_ROOT}` since it's just for permission checking:

```markdown
---
allowed-tools: Bash(bun run ${CC_TRACK_SCRIPTS_ROOT}/migrate.ts)
---
```

Actually, we should use `CC_TRACK_SCRIPTS_ROOT` here too for consistency.

## Pros and Cons

### Pros
- ✅ Scripts actually execute from slash commands
- ✅ Works across all repos where plugin is installed
- ✅ Only copies scripts on version changes (efficient)
- ✅ Standard pattern used by successful plugins like superpowers

### Cons
- ❌ Scripts live outside plugin directory (`~/.local/share/cc-track/`)
- ❌ Adds complexity with SessionStart hook
- ❌ Scripts are duplicated (plugin + local copy)
- ❌ Requires restart after plugin update to sync scripts
- ❌ User doesn't see scripts in plugin directory

## Alternative Considered and Rejected

**Don't use `!` execution, just give Claude instructions**:
- Won't work - Claude doesn't know where scripts are either
- Commands would be slow (Claude has to figure out what to do)
- Loses deterministic script execution

## References

- [obra/superpowers SessionStart hook](https://github.com/obra/superpowers/blob/main/hooks/session-start.sh)
- [obra/superpowers hooks.json](https://github.com/obra/superpowers/blob/main/hooks/hooks.json)
- [Claude Code Hooks Documentation](https://docs.claude.com/en/docs/claude-code/hooks)
- [Claude Code Plugins Reference](https://docs.claude.com/en/docs/claude-code/plugins-reference)
