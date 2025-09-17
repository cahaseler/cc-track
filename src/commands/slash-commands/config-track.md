---
shortname: config-track
---

# Config cc-track Command

Update the configuration file at `.claude/track.config.json` based on the user's request.

If called without parameters, show the current configuration and ask what they'd like to adjust.

## Configuration Options

**Hooks:**
- `capture_plan` - Creates task files from planning mode
- `pre_compact` - Updates task documentation before compaction
- `post_compact` - Restores context after compaction
- `stop_review` - Reviews changes and auto-commits with [wip]
- `edit_validation` - Runs TypeScript/lint checks on edited files
  - Configure the lint tool with:
    ```json
    "lint": {
      "enabled": true,
      "tool": "biome",  // or "eslint" or "custom"
      "command": "bunx biome check",
      "autoFixCommand": "bunx biome check --write"
    }
    ```

**Features:**
- `statusline` - Custom status line with costs and task info
- `git_branching` - Create/merge feature branches for tasks
- `api_timer` - Show API rate limit timer (display: hide/show/sonnet-only)
- `github_integration` - GitHub issues and PR workflow
  - `auto_create_issues` - Create issues for new tasks
  - `use_issue_branches` - Use gh issue develop for branches
  - `auto_create_prs` - Open PRs instead of merging
  - `repository_url` - GitHub repo URL
- `private_journal` - Use private journal MCP for enhanced context preservation