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

```bash
# Navigate to your project
cd your-project

# Initialize cc-track
npx cc-track init
```

This creates a single `/setup-cc-track` Claude Code command inside your project. Start up Claude Code, run this command, and Claude will walk you through the installation and configuration. The command itself checks some things like your git status, and creates some template files, but will still require your permission and approval before enabling any features or doing anything that might be destructive.

### Optional: Pin a specific version
If you want to ensure consistency across your team, you can install cc-track as a dev dependency:

```bash
npm install --save-dev cc-track
# or
bun add -d cc-track
```

But this is entirely optional - the hooks will use `npx` which works with or without local installation.

## How It Works

### 1. Smart Setup Process
When you run `cc-track init`, it creates a single slash command (`/setup-cc-track`) that Claude uses to:
- Analyze your project structure
- Configure features based on your needs
- Set up git/GitHub integration if desired
- Create context files tailored to your project

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

## Configuration

After setup, cc-track uses two configuration files:

### `.claude/track.config.json`
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

### Slash Commands (in Claude Code)
- `/setup-cc-track` - Initial setup wizard
- `/prepare-completion` - Check if task is ready for completion
- `/complete-task` - Complete the current task
- `/add-to-backlog` - Add items to backlog without disruption
- `/config-track` - Modify configuration

### CLI Commands
- `cc-track init` - Initialize in a new project
- `cc-track setup-templates` - Install context templates
- `cc-track setup-commands` - Install slash commands
- `cc-track statusline` - Generate status line (point Claude Code's configuration to this command)
- `cc-track hook` - Hook dispatcher (point Claude Code's configuration to this command)

## Project Structure

After initialization, cc-track creates:
```
your-project/
├── .claude/
│   ├── commands/          # Slash commands
│   ├── tasks/             # Task files (TASK_001.md, etc.) - structured files generated from plans
│   ├── plans/             # Captured plans - raw outputs from planning mode
│   ├── track.config.json  # Feature configuration
│   ├── product_context.md # Project vision
│   ├── system_patterns.md # Technical patterns
│   ├── decision_log.md    # Architectural decisions
│   ├── code_index.md      # Codebase map
│   └── user_context.md    # User preferences
└── CLAUDE.md              # Main context file with imports
```

## Requirements

- [Claude Code](https://claude.ai/code) subscription
- Node.js 18+ for npm installation
- Git (for task management features)
- GitHub CLI (optional, for GitHub integration)

## Philosophy

cc-track is designed to be:
- **Non-invasive** - Start with everything disabled, enable what you need
- **Transparent** - You see exactly what's being configured
- **Flexible** - Works with any language or framework
- **Intelligent** - Adapts to your project's needs

## Development

To contribute or run from source:

```bash
# Clone the repository
git clone https://github.com/cahaseler/cc-track.git
cd cc-track

# Install dependencies
bun install

# Build the project
bun run build

# Run tests
bun test
```

## License

MIT

## Support

- **Issues**: [GitHub Issues](https://github.com/cahaseler/cc-track/issues)
- **Documentation**: [Claude Code Docs](https://docs.anthropic.com/en/docs/claude-code)