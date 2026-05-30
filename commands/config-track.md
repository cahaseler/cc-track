---
shortname: config-track
---

# Config cc-track Command

Update the configuration file at `.cc-track/track.config.json` based on the user's request.

If called without parameters, show the current configuration and ask what they'd like to adjust.

## Configuration Structure

The config file has three main sections: `hooks`, `features`, and `logging`.

### Hooks Section

**Development Workflow Hooks:**

- `edit_validation` - Real-time TypeScript and lint checking on file edits
  - Blocks edits if errors found (prevents context poisoning)
  - Sub-options:
    - `typecheck.enabled` - Run TypeScript type checking
    - `lint.enabled` - Run Biome linting
  - Example:
    ```json
    "edit_validation": {
      "enabled": true,
      "typecheck": { "enabled": true },
      "lint": { "enabled": true }
    }
    ```

- `pre_tool_validation` - Task file integrity and branch protection checks before tool use
  - Prevents manual task status changes
  - Blocks edits on protected branches (main/master)
  - Example:
    ```json
    "pre_tool_validation": {
      "enabled": true
    }
    ```

### Features Section

**Autonomous Operation:**

- `autoflow` - Autonomous operation mode for unattended task completion
  - **Disabled by default** - must be explicitly enabled
  - Per-message opt-in: include "autoflow" in your message to activate for that task
  - Permission requests denied with "find safe alternative" guidance
  - Throttle detection prevents runaway sessions
  - Sub-options:
    - `throttle_limit` - Max auto-continues before exit (default: 3)
    - `window_duration_minutes` - Throttle detection window (default: 5)
  - Example:
    ```json
    "autoflow": {
      "enabled": true,
      "throttle_limit": 3,
      "window_duration_minutes": 5
    }
    ```

**Git & GitHub Integration:**

- `git_branching` - Automatic feature branch creation from tasks
  - Keeps work isolated, enforces clean git workflow
  - Example: `"git_branching": { "enabled": true }`

- `github_integration` - Issue and PR automation (requires gh CLI)
  - Sub-options:
    - `auto_create_issues` - Create GitHub issue for each task
    - `use_issue_branches` - Use `gh issue develop` for branches
    - `auto_create_prs` - Create PR on task completion
  - Example:
    ```json
    "github_integration": {
      "enabled": true,
      "auto_create_issues": true,
      "use_issue_branches": false,
      "auto_create_prs": true
    }
    ```

**Display & Monitoring:**

- `statusline` - Custom status line with task, costs, API limits
  - Shows model/cost tier/rate/tokens (line 1), branch/task (line 2)
  - Requires Claude Code restart after enabling
  - Example: `"statusline": { "enabled": true }`

- `api_timer` - API rate limit timer display in statusline
  - Options: `"hide"`, `"show"`, `"sonnet-only"` (default)
  - Example: `"api_timer": { "display": "sonnet-only" }`

**Branch Protection:**

- `branch_protection` - Prevent edits on protected branches
  - Enforces feature branch workflow
  - Configurable branches list and gitignored file exemption
  - Example:
    ```json
    "branch_protection": {
      "enabled": true,
      "protected_branches": ["main", "master"],
      "allow_gitignored": true
    }
    ```

**Code Quality:**

- `code_review` - Multi-agent code review before task completion (run via `/cc-track:prepare-completion`)
  - Example:
    ```json
    "code_review": {
      "enabled": true
    }
    ```

**Advanced:**

- `private_journal` - Use private journal MCP for context preservation
  - Requires mcp-private-journal MCP server installed
  - Example: `"private_journal": { "enabled": false }`

- `websearch_validation` - Validate WebSearch tool usage
  - Ensures web searches are relevant before execution
  - Example: `"websearch_validation": { "enabled": false }`

### Logging Section

- `enabled` - Enable centralized logging (default: true)
- `level` - Log level: "debug", "info", "warn", "error" (default: "info")
- `retentionDays` - Days to keep logs (default: 7)

Example:
```json
"logging": {
  "enabled": true,
  "level": "info",
  "retentionDays": 7
}
```

## Usage

Read current config, update based on user request, write back to `.cc-track/track.config.json`.

Always explain what changes were made and what the new settings mean.