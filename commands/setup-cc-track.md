---
shortname: setup-cc-track
---

# Setup cc-track Command

Guide the user through setting up cc-track in their project. This is the primary entry point for new users after installing the plugin.

## Important Pre-Checks

Before proceeding with setup, verify:

### 1. Bun Runtime Verification

Check if Bun is installed:
```bash
bun --version
```

If this fails:
- **Stop immediately** and show the Bun installation error message
- Guide user to install Bun: `curl -fsSL https://bun.sh/install | bash`
- Ask them to restart their terminal and try `/setup-cc-track` again

### 2. Plugin Dependencies Verification

Check if plugin dependencies are installed:
```bash
ls -la ${CLAUDE_PLUGIN_ROOT}/node_modules/@anthropic-ai/claude-agent-sdk
ls -la ${CLAUDE_PLUGIN_ROOT}/node_modules/ccusage
```

If either directory doesn't exist:
- **Stop immediately** and show the missing dependencies error message
- Guide user to run:
  ```bash
  cd ${CLAUDE_PLUGIN_ROOT}
  bun install
  ```
- Ask them to try `/setup-cc-track` again after installation completes

### 3. npm/Plugin Conflict Detection

Check if the old npm version of cc-track is still installed:
```bash
which cc-track
```

If this returns a path (meaning npm version is installed):
- **Stop immediately** and show the npm/plugin conflict error message
- Explain that both versions cannot coexist in the same project
- Guide user to uninstall npm version:
  ```bash
  npm uninstall -g cc-track
  ```
- Verify removal: `which cc-track` should show "not found"
- Ask them to try `/setup-cc-track` again

**All three checks must pass before proceeding with setup.**

---

## Setup Workflow

Once pre-checks pass, guide the user through:

### 1. Project Analysis

Ask about their project:
- What type of project? (web app, library, CLI tool, etc.)
- What languages/frameworks? (TypeScript, React, Next.js, etc.)
- Do they use GitHub? (for GitHub integration)
- Do they have existing `.claude/` files? (migration vs new setup)

### 2. Git Status Check

Run `git status` to verify:
- Is this a git repository?
- Are there uncommitted changes?

If uncommitted changes exist:
- Suggest committing them first: "I see uncommitted changes. Would you like to commit them before setup?"
- If yes, help create a commit
- If no, warn that setup will create files and suggest being careful

If not a git repo:
- Offer to initialize: "This isn't a git repository yet. Would you like to initialize one?"
- If yes, run `git init`
- If no, warn that some features (git branching, GitHub integration) won't work

### 3. Feature Selection

Present feature options and let user choose what to enable:

**Always Enabled (Core Functionality):**
- Task management via `/specify`, `/clarify`, `/plan`, `/tasks` workflow
- Context preservation (CLAUDE.md with imports)
- Basic project structure in `.claude/`

**Optional Features:**

**Development Workflow:**
- `edit_validation` - Real-time TypeScript and lint checking on file edits
  - ✅ Pros: Immediate feedback, catches errors early, enforces code quality
  - ⚠️ Cons: Blocks edits if errors found (by design - prevents context poisoning)
  - Ask: "Would you like real-time validation? (recommended for TypeScript projects)"

- `pre_tool_validation` - Task file integrity checks before tool use
  - ✅ Pros: Prevents manual task status changes, enforces proper workflow
  - ⚠️ Cons: Blocks any attempt to manually edit task metadata
  - Ask: "Would you like task file validation?"

- `branch_protection` - Prevent edits on protected branches (main/master)
  - ✅ Pros: Prevents accidental commits to main, enforces feature branch workflow
  - ⚠️ Cons: Must use `/plan` or `/specify` to create feature branches first
  - Configurable: Which branches to protect, allow edits to gitignored files
  - Ask: "Would you like branch protection? (recommended for teams)"
  - If yes, ask: "Which branches should be protected?" (default: main, master)

**Git & GitHub Integration:**
- `git_branching` - Automatic feature branch creation from tasks
  - ✅ Pros: Keeps work isolated, enforces clean git workflow, automatic naming
  - ⚠️ Cons: Creates branches you need to manage/clean up later
  - Ask: "Create feature branches automatically for each task?"

- `github_integration` - Issue and PR automation
  - ✅ Pros: Full GitHub workflow automation, links tasks to issues/PRs, team visibility
  - ⚠️ Cons: Requires GitHub CLI installed and authenticated
  - Requires: GitHub CLI (`gh`) installed and authenticated
  - Sub-options:
    - `auto_create_issues` - Create GitHub issue for each task (recommended for teams)
    - `use_issue_branches` - Use `gh issue develop` for issue-linked branches
    - `auto_create_prs` - Create PR on task completion rather than auto-merge
  - Ask: "Enable GitHub integration? (requires gh CLI)"
  - If yes, verify `gh` is installed: `gh --version`
  - If yes, ask which sub-options to enable

**Display & Monitoring:**
- `statusline` - Custom status line with task, costs, API limits
  - ✅ Pros: Always-visible context (current task, cost tier, rate limits, branch)
  - ⚠️ Cons: Takes up 2 lines in Claude Code UI, requires restart to activate
  - Shows: Model/cost tier/rate/tokens (line 1), branch/task (line 2)
  - Ask: "Enable custom status line in Claude Code UI?"
  - Note: Requires Claude Code restart after setup

- `api_timer` - API rate limit timer display in statusline
  - ✅ Pros: Helps avoid hitting rate limits by showing countdown timer
  - ⚠️ Cons: Can clutter statusline if you rarely hit limits
  - Options:
    - `"sonnet-only"` (default) - Show timer only for Claude Sonnet (most common limit)
    - `"show"` - Always show timer for all models
    - `"hide"` - Never show timer
  - Ask: "How should API rate limit timer display?" (default: sonnet-only)

**Code Quality:**
- `code_review` - Automated code review integration
  - ✅ Pros: Get AI-powered code review feedback before task completion, catch issues early
  - ⚠️ Cons: Reviews can take several minutes, requires additional tools installed
  - Options:
    - `claude` - Uses Claude Code SDK for fast, context-aware reviews (10min timeout)
    - `codex` - Uses Codex CLI for systematic, thorough reviews (30min timeout)
    - `coderabbit` - Uses CodeRabbit CLI to analyze code changes (30min timeout)
  - Ask: "Enable automated code review? Choose: 'claude', 'codex', 'coderabbit', or 'skip' to disable"
  - If enabled, verify tool is installed and explain timeout expectations

**Advanced:**
- `private_journal` - Use private journal MCP for context preservation
  - ✅ Pros: Claude can record learnings and reflections privately for future reference
  - ⚠️ Cons: Requires mcp-private-journal MCP server installed
  - Ask: "Enable private journal MCP? (requires mcp-private-journal installed)"

- `websearch_validation` - Validate WebSearch tool usage
  - ✅ Pros: Ensures web searches are relevant and necessary before execution
  - ⚠️ Cons: Adds validation overhead to every web search operation
  - Ask: "Enable web search validation? (helps prevent unnecessary searches)"

### 4. Configuration File Creation

Based on user selections, create `.claude/track.config.json`:

Read the template from `${CLAUDE_PLUGIN_ROOT}/templates/track.config.json` and customize based on user's feature selections.

**Example structure:**
```json
{
  "hooks": {
    "edit_validation": {
      "enabled": true/false,
      "typecheck": {
        "enabled": true/false
      },
      "lint": {
        "enabled": true/false
      }
    },
    "pre_tool_validation": {
      "enabled": true/false
    }
  },
  "features": {
    "statusline": {
      "enabled": true/false
    },
    "git_branching": {
      "enabled": true/false
    },
    "private_journal": {
      "enabled": true/false
    },
    "branch_protection": {
      "enabled": true/false,
      "protected_branches": ["main", "master"],
      "allow_gitignored": true
    },
    "api_timer": {
      "display": "hide"|"show"|"sonnet-only"
    },
    "github_integration": {
      "enabled": true/false,
      "auto_create_issues": true/false,
      "use_issue_branches": true/false,
      "auto_create_prs": true/false
    },
    "code_review": {
      "enabled": true/false,
      "tool": "claude"|"codex"|"coderabbit"
    },
    "websearch_validation": {
      "enabled": true/false
    }
  },
  "logging": {
    "enabled": true,
    "level": "info",
    "retentionDays": 7
  }
}
```

**Set enabled flags based on user's choices from step 3.**

### 5. Create Customized Project Files

**CRITICAL: Only create files that don't already exist. Never overwrite existing files without explicit user permission.**

First, create the `.claude/` directory structure:

```bash
mkdir -p .claude/specs
```

Then create customized project files in `.claude/` **ONLY if they don't exist**:

For each file:
1. **Check if it exists first** - If it exists, skip it and inform the user
2. **Read the corresponding template** from `${CLAUDE_PLUGIN_ROOT}/templates/`
3. **Customize the content** based on user's project information (gathered in step 1)
4. **Write the customized file** to the project's `.claude/` directory

Files to create (read templates, customize, write):

1. **CLAUDE.md** (project root)
   - Read: `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.md`
   - Customize: Replace "[Project Name]" with actual project name, adjust @ imports for project structure
   - Write: `CLAUDE.md`

2. **.claude/no_active_task.md**
   - Read: `${CLAUDE_PLUGIN_ROOT}/templates/no_active_task.md`
   - Customize: Minimal (just use template content)
   - Write: `.claude/no_active_task.md`

3. **.claude/product_context.md**
   - Read: `${CLAUDE_PLUGIN_ROOT}/templates/product_context.md`
   - Customize: Fill in project purpose, audience, features based on user's answers from step 1
   - Write: `.claude/product_context.md`

4. **.claude/system_patterns.md**
   - Read: `${CLAUDE_PLUGIN_ROOT}/templates/system_patterns.md`
   - Customize: Add detected framework/language patterns based on project type
   - Write: `.claude/system_patterns.md`

5. **.claude/decision_log.md**
   - Read: `${CLAUDE_PLUGIN_ROOT}/templates/decision_log.md`
   - Customize: Add initial setup decisions (features enabled, etc.)
   - Write: `.claude/decision_log.md`

6. **.claude/code_index.md**
   - Read: `${CLAUDE_PLUGIN_ROOT}/templates/code_index.md`
   - Customize: Scan project directory structure and populate with actual directories
   - Write: `.claude/code_index.md`

7. **.claude/user_context.md**
   - Read: `${CLAUDE_PLUGIN_ROOT}/templates/user_context.md`
   - Customize: Minimal (template provides structure for future updates)
   - Write: `.claude/user_context.md`

8. **.claude/backlog.md**
   - Read: `${CLAUDE_PLUGIN_ROOT}/templates/backlog.md`
   - Customize: Minimal (empty list, ready for future items)
   - Write: `.claude/backlog.md`

**After creating files, inform the user:**
- "Created X new customized files"
- "Skipped Y existing files (not overwritten)"
- "Files are ready for your project - you can further customize them anytime"

### 7. Hooks Configuration

Based on enabled features, configure hooks in Claude Code settings.

Show user what hooks will be enabled:
- `edit_validation` → PostToolUse hook
- `pre_tool_validation` → PreToolUse hook

Explain:
- Hooks execute TypeScript files from `${CLAUDE_PLUGIN_ROOT}/hooks/`
- User can disable individual hooks via `/config-track` later

### 8. Configure Claude Code Settings (if statusline enabled)

If the user enabled the statusline feature, configure it automatically:

**Read the Claude Code settings file:**
```bash
# Typical location (may vary by platform):
cat ~/.config/claude-code/config.json
```

**Update the settings to add statusline command:**

Add or update the `statusLine` configuration:
```json
{
  "statusLine": {
    "command": "bun run ${CLAUDE_PLUGIN_ROOT}/scripts/statusline.ts"
  }
}
```

**Write the updated settings back:**
```bash
# Write to Claude Code config file
```

**Inform the user:**
- "✓ Configured Claude Code statusline"
- "⚠️ You'll need to restart Claude Code for the statusline to appear"

**If you can't modify the settings automatically** (permissions issue or file not found):
- Tell user: "I couldn't automatically configure the statusline. Please add this to your Claude Code settings manually:"
- Show them:
  ```json
  {
    "statusLine": {
      "command": "bun run ${CLAUDE_PLUGIN_ROOT}/scripts/statusline.ts"
    }
  }
  ```

### 9. Final Steps

After setup completes:

1. **Verify installation**:
   - Check `.claude/track.config.json` exists
   - Check customized files created
   - Check CLAUDE.md has proper @ imports

2. **Next steps guidance**:
   - "Setup complete! 🚅"
   - "Try creating your first spec: `/specify \"your feature idea\"`"
   - "Configure anytime with: `/config-track`"
   - If statusline configured: "⚠️ Restart Claude Code to see the custom statusline"

3. **GitHub setup (if enabled)**:
   - "To use GitHub integration:"
   - "1. Install GitHub CLI: https://cli.github.com"
   - "2. Authenticate: `gh auth login`"
   - "3. Run `/specify` to create your first task with auto-issue creation"

---

## Error Messages

Use these pre-formatted messages for common issues:

### Bun Not Installed

```
⚠️ Bun runtime not found

cc-track plugin requires Bun runtime to execute TypeScript directly.

To install Bun:
```bash
curl -fsSL https://bun.sh/install | bash
```

Or visit https://bun.sh for installation instructions.

After installing Bun, restart your terminal and try `/setup-cc-track` again.
```

### Plugin Dependencies Missing

```
⚠️ Plugin dependencies not installed

cc-track plugin dependencies are not installed. You need to run `bun install` in the plugin directory.

To install dependencies:
```bash
cd ${CLAUDE_PLUGIN_ROOT}
bun install
```

After installing, try `/setup-cc-track` again.
```

### npm/Plugin Conflict

```
⚠️ npm/plugin conflict detected

You have both the npm package and plugin versions of cc-track installed.
This will cause conflicts. Please uninstall the npm version first.

To uninstall the npm version:
```bash
npm uninstall -g cc-track
```

Verify removal:
```bash
which cc-track  # Should show: not found
```

After uninstalling, try `/setup-cc-track` again.
```

---

## Important Notes

- **Never run git commands without user permission** (except read-only like `git status`)
- **Never overwrite existing files without asking** (check existence first)
- **Always explain what each feature does** before enabling
- **Provide undo instructions** for any destructive actions
- **Be explicit about dependencies** (gh CLI, Bun, etc.)
- **Show next steps clearly** after successful setup

This is the user's first experience with cc-track - make it smooth and transparent! 🚅
