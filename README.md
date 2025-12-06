# cc-track 🚅

**Task Review And Context Keeper - Keep your vibe coding on track**

cc-track is a comprehensive context management and workflow optimization system for [Claude Code](https://claude.ai/code). It solves the fundamental problem of context loss in AI-assisted development by providing intelligent task tracking, automatic validation, and persistent memory across sessions.

## Why cc-track?

When working with Claude Code, you face several challenges:
- **Context loss during compaction** - Important details get lost when conversations are compressed
- **"Close enough" syndrome** - AI declares tasks complete when they're not quite right
- **Pattern drift** - AI forgets your project's conventions and patterns
- **No task continuity** - Losing track of what you were working on between sessions

cc-track solves these problems by:
- 📝 **Capturing plans** from Claude's planning mode and turning them into tracked tasks
- ✅ **Validating changes** against task requirements in real-time
- 🧠 **Preserving context** through compaction cycles
- 🚀 **Automating workflow** with git commits, GitHub issues, and PR management
- 📊 **Tracking costs** with a custom status line showing usage and limits

## Installation

cc-track is distributed as a Claude Code plugin. Installation is a one-time setup that makes cc-track available to all your projects.

### Quick Start

```bash
# 1. Add the cc-track marketplace
/plugin marketplace add cahaseler/cc-track-marketplace

# 2. Install the plugin
/plugin install cc-track@cc-track-marketplace

# 3. Install plugin dependencies
cd $(dirname $(which claude-code))/../plugins/cc-track
bun install

# 4. Navigate to your project and run setup
cd /path/to/your-project
/setup-cc-track
```

The `/setup-cc-track` command guides you through configuration:
- Analyzes your project structure
- Configures features based on your needs
- Sets up git/GitHub integration if desired
- Creates context files tailored to your project

### Prerequisites

- **Claude Code** with plugin support (October 2025+)
- **Bun runtime** - Install via `curl -fsSL https://bun.sh/install | bash`
- **Git** (for task management features)
- **GitHub CLI** (optional, for GitHub integration)

Verify Bun installation:
```bash
bun --version  # Should show 1.0.0+
```

### Migrating from npm Version

If you previously used the npm-distributed version (v2.x), see [MIGRATION.md](MIGRATION.md) for step-by-step instructions.

**Quick migration**:
```bash
# Uninstall npm version
npm uninstall -g cc-track

# Install plugin (follow Quick Start above)

# Your .cc-track/ project files work unchanged!
```

## How It Works

### 1. Smart Setup Process
When you run `/setup-cc-track`, Claude guides you through setup:
- Verifies plugin dependencies are installed
- Analyzes your project structure
- Configures features based on your needs
- Sets up git/GitHub integration if desired
- Creates context files tailored to your project

### 2. Core Task Management Workflow

1. **Plan Capture**: When you exit planning mode, cc-track automatically creates a task file with requirements, generates a new branch, and creates a github issue (if configured)
2. **Change Validation**: The stop-review hook validates every change against the active task
3. **Automatic Commits**: Creates WIP commits that get squashed when tasks complete, which can be very helpful to revert bad changes
4. **Task Completion**: Smart completion process that validates all requirements are met and handles PR creation and git branch operations.

### 3. Context Preservation

cc-track maintains several context files that Claude automatically references:
- **Product Context** - Project vision, goals, and features
- **System Patterns** - Technical patterns and conventions
- **Decision Log** - Architectural decisions and rationale
- **Code Index** - Codebase structure and key files
- **User Context** - Your preferences and working style

## Features

### Core Features
- **Task Management** - Capture plans, validate changes, track progress
- **Git Integration** - Automatic WIP commits and branch management
- **Context Preservation** - Maintain critical information across sessions

### Optional Features
- **GitHub Integration** - Automatic issue creation and PR management
- **Edit Validation** - Real-time TypeScript/linting feedback
- **Custom Status Line** - Shows current task, costs, and API limits
- **API Timer Display** - Configurable rate limit visibility
- **WebSearch Year Validation** - Prevents outdated year searches (e.g., searching "TypeScript 2024" when it's 2025)

### WebSearch Year Validation

Claude's training data can make it default to searching for outdated years. The WebSearch validation hook catches this and helps you get current information:

**What it blocks:**
- `"TypeScript best practices 2024"` → Suggests `"TypeScript best practices 2025"`
- `"2024 web development trends"` → Suggests `"2025 web development trends"`
- `"latest 2024 React features"` → Suggests `"latest 2025 React features"`

**What it allows:**
- `"compare 2024 vs 2025 features"` (intentional comparison)
- `"2024 election results"` (historical event)
- `"bugs fixed in 2024"` (temporal reference)

When blocked, you receive clear feedback with:
- Explanation of why the search was blocked
- The suggested corrected query
- Current date context
- Tips for historical searches

Enable in `.cc-track/track.config.json`:
```json
{
  "features": {
    "websearch_validation": {
      "enabled": true
    }
  }
}
```

## Configuration

After setup, cc-track uses two configuration files:

### `.cc-track/track.config.json`
Controls which features are enabled:
```json
{
  "capture_plan": true,
  "stop_review": true,
  "edit_validation": false,
  "statusline": true,
  "git_branching": true,
  "github_integration": {
    "enabled": true,
    "auto_create_issues": true,
    "use_issue_branches": true,
    "auto_create_prs": true
  }
}
```

### `.claude/settings.json`
Claude Code's hook configuration (managed by cc-track based on your config)

## Commands

All cc-track functionality is accessed through slash commands in Claude Code:

- `/setup-cc-track` - Initial setup wizard (verifies dependencies, configures features)
- `/specify` - Create new feature specification through Socratic questioning (resolves all ambiguities)
- `/plan` - Generate technical implementation plan
- `/tasks` - Create task breakdown from plan
- `/prepare-completion` - Validate task readiness (tests, lint, code review)
- `/complete-task` - Complete task and create PR
- `/add-to-backlog` - Add items to backlog without disrupting current work
- `/constitution` - Create or update project guardrails
- `/config-track` - Modify feature configuration

## Project Structure

After initialization, cc-track creates:
```
your-project/
├── .cc-track/
│   ├── specs/             # Feature specifications
│   ├── track.config.json  # Feature configuration
│   ├── product_context.md # Project vision
│   ├── system_patterns.md # Technical patterns
│   ├── decision_log.md    # Architectural decisions
│   ├── code_index.md      # Codebase map
│   ├── backlog.md         # Future ideas and improvements
│   └── user_context.md    # User preferences
├── .claude/
│   ├── commands/          # Slash commands (Claude Code)
│   ├── hooks/             # Claude Code hooks
│   └── settings.json      # Claude Code settings
└── CLAUDE.md              # Main context file with imports
```

## Requirements

- [Claude Code](https://claude.ai/code) with plugin support (October 2025+)
- [Bun runtime](https://bun.sh) 1.0.0+ for TypeScript execution
- Git (for task management features)
- GitHub CLI (optional, for GitHub integration)

## Philosophy

cc-track is designed to be:
- **Non-invasive** - Start with everything disabled, enable what you need
- **Transparent** - You see exactly what's being configured
- **Flexible** - Works with any language or framework
- **Intelligent** - Adapts to your project's needs

## Plugin Architecture

cc-track uses Claude Code's plugin system for distribution and execution.

### ${CLAUDE_PLUGIN_ROOT} Pattern

All slash commands reference the plugin directory using the `${CLAUDE_PLUGIN_ROOT}` environment variable:

```markdown
# Example command in commands/complete-task.md
!bun run ${CLAUDE_PLUGIN_ROOT}/commands/complete-task.ts
```

This ensures commands work regardless of where the plugin is installed. The variable is automatically provided by Claude Code.

### TypeScript Execution

The plugin runs TypeScript directly via Bun (no compilation needed):
- **Hooks**: Registered in `hooks/hooks.json`, executed by Claude Code's hook system
- **Commands**: Invoked via slash commands, executed by Bun
- **Scripts**: Called by Claude Code UI (e.g., statusline)

### Plugin Structure

```
cc-track-plugin/
├── .claude-plugin/        # Plugin metadata
│   └── plugin.json
├── commands/              # Slash command markdown + TypeScript implementations
├── hooks/                 # Hook TypeScript files + registration config
├── lib/                   # Shared libraries
├── scripts/               # Statusline and other scripts
└── templates/             # Reference templates (not copied to projects)
```

## Development

To contribute or run from source:

```bash
# Clone the repository
git clone https://github.com/cahaseler/cc-track.git
cd cc-track

# Install dependencies
bun install

# Run tests
bun test
```

**Note**: There's no build step - TypeScript is executed directly via Bun.

## License

MIT

## Support

- **Issues**: [GitHub Issues](https://github.com/cahaseler/cc-track/issues)
- **Documentation**: [Claude Code Docs](https://docs.anthropic.com/en/docs/claude-code)