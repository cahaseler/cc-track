# cc-track

**Task Review And Context Keeper - Keep your vibe coding on track**

cc-track is a spec-driven development workflow system for [Claude Code](https://claude.ai/code). It solves the fundamental problem of unclear requirements and context loss in AI-assisted development through structured specification, intelligent validation, and persistent memory across sessions.

## Why cc-track?

When working with Claude Code on complex features, you face several challenges:
- **Unclear requirements** - Jumping into code before fully understanding what's needed
- **Context loss during compaction** - Important details get lost when conversations are compressed
- **"Close enough" syndrome** - AI declares tasks complete when they're not quite right
- **Pattern drift** - AI forgets your project's conventions and patterns
- **No task continuity** - Losing track of what you were working on between sessions

cc-track solves these problems through a **spec-driven workflow**:
- **Force clarity first** - Socratic questioning resolves all ambiguities before writing code
- **Separate concerns** - Requirements (spec), design (plan), and implementation (tasks) stay distinct
- **Constitution checks** - Validate designs against your project's guardrails and constraints
- **Real-time validation** - TypeScript and lint checking on every edit
- **Autoflow mode** - Autonomous operation for unattended task completion
- **Context preservation** - Maintain critical information across compaction cycles
- **Cost visibility** - Custom status line showing usage, limits, and current task

## Installation

cc-track is distributed as a Claude Code plugin. Installation is a one-time setup that makes cc-track available to all your projects.

### Quick Start

```bash
# 1. Add the cc-track marketplace
/plugin marketplace add cahaseler/cc-track-marketplace

# 2. Install the plugin
/plugin install cc-track@cc-track-marketplace

# 3. Install plugin dependencies
# Navigate to your Claude Code plugins directory and install:
#   macOS/Linux: cd ~/.claude/plugins/cc-track && bun install
#   Windows: cd %USERPROFILE%\.claude\plugins\cc-track && bun install

# 4. Navigate to your project and run setup
cd /path/to/your-project
/cc-track:setup-cc-track
```

The `/cc-track:setup-cc-track` command guides you through configuration:
- Verifies Bun runtime and plugin dependencies
- Analyzes your project structure
- Configures features based on your needs
- Sets up git/GitHub integration if desired
- Creates context files tailored to your project

### Prerequisites

- **Claude Code** with plugin support
- **Bun runtime** - Install from https://bun.sh:
  - **Windows (PowerShell):** `powershell -c "irm bun.sh/install.ps1 | iex"`
  - **macOS/Linux:** `curl -fsSL https://bun.sh/install | bash`
- **Git** (for task management features)
- **GitHub CLI** (optional, for GitHub integration)

### Migrating from npm Version

If you previously used the npm-distributed version (v2.x), see [MIGRATION.md](MIGRATION.md) for step-by-step instructions.

## How It Works

### Spec-Driven Development Workflow

cc-track uses an explicit, command-driven workflow that separates requirements from implementation:

```
/cc-track:specify → /cc-track:plan → /cc-track:tasks → Implementation → /cc-track:prepare-completion → /cc-track:complete-task
```

Each phase produces distinct artifacts:
- **spec.md** - User-facing requirements (what/why) - persists across implementations
- **plan.md** - Technical design (how) - validated against constitution
- **tasks.md** - Implementation breakdown - specific to current implementation
- **progress.md** - What was actually built - living record of development

### The Workflow in Practice

1. **`/cc-track:specify`** - Claude asks clarifying questions about your feature through Socratic dialogue. For complex features, spawns Explore agents to research your codebase first. Creates a complete specification with no ambiguities.

2. **`/cc-track:plan`** - Generates technical design from the spec. Validates against your project constitution (if defined). For complex features, presents 2-3 alternative approaches for your approval.

3. **`/cc-track:tasks`** - Creates actionable task breakdown following TDD order. Marks parallelizable tasks. Numbers tasks sequentially.

4. **Implementation** - Work through tasks with real-time validation:
   - Edit validation catches TypeScript and lint errors immediately
   - Branch protection prevents accidental commits to main/master
   - Progress tracked automatically

5. **`/cc-track:prepare-completion`** - Runs validation suite (TypeScript, lint, tests, dead code detection) and code review. Routes to `/cc-track:fix-issues` if multiple issues found.

6. **`/cc-track:complete-task`** - Squashes commits, creates PR, switches back to main branch.

### Context Preservation

cc-track maintains context files that Claude automatically references:
- **Product Context** - Project vision, goals, and features
- **System Patterns** - Technical patterns and conventions
- **Decision Log** - Architectural decisions and rationale
- **Code Index** - Codebase structure and key files
- **User Context** - Your preferences and working style
- **Progress Log** - Task completion history
- **Backlog** - Future ideas captured without disruption
- **Constitution** - Project guardrails and constraints

## Features

### Core Features

#### Spec-Driven Workflow
The primary workflow uses explicit commands that force clarity before implementation:
- Socratic questioning resolves all ambiguities
- Complexity-aware: simple features proceed quickly, complex ones get thorough analysis
- Constitution checks validate designs against project guardrails

#### Real-Time Validation
- **Edit Validation** - TypeScript type checking and Biome linting on every file edit
- **Branch Protection** - Prevents edits on main/master branches, guides to feature branch workflow
- **Task Validation** - Prevents manual task status manipulation

#### Context Management
- Persistent context files survive compaction cycles
- Automatic task progress tracking
- Decision logging for architectural choices

### Advanced Features

#### Autoflow Mode
Autonomous operation for unattended task completion:
- **Per-message activation** - Include "autoflow" in your message to activate
- **Smart continuation** - Claude auto-continues when work remains
- **Permission denial** - Requests denied with "find safe alternative" guidance
- **Throttle detection** - Exits after 3 auto-continues in 5 minutes (prevents runaway sessions)
- **Automatic deactivation** - When task complete, throttle hit, or next message without "autoflow"

Enable in config:
```json
{
  "hooks": {
    "autoflow": {
      "enabled": true,
      "throttle_limit": 3,
      "window_duration_minutes": 5
    }
  }
}
```

#### Code Review Integration
Multi-agent code review with specialized reviewers:
- `/cc-track:code-review` - Standalone review for any code changes
- `/cc-track:prepare-completion` - Spec-focused review during task completion
- Parallel agent analysis (spec/plan/task compliance, bug scanner, guidelines, duplication, dead code, altitude, comments)
- Scoring and deduplication of issues
- `/cc-track:fix-issues` - Structured triage with Fix/Defer/Dismiss/Discuss options

#### Git & GitHub Integration
- **Automatic branching** - Feature branches created from task specs
- **GitHub issues** - Auto-create issues linked to tasks
- **PR automation** - Squash commits and create PRs on completion
- **Branch cleanup** - Task branches preserved for reference

#### Custom Status Line
Two-line display showing:
- Line 1: Model, cost tier, rate limits, token usage
- Line 2: Current branch, active task

Configurable API timer display (hide/show/sonnet-only).

### Optional Features

#### WebSearch Year Validation
Prevents Claude from searching outdated years:
- Blocks: `"TypeScript best practices 2024"` → Suggests 2025
- Allows: Historical references, intentional comparisons

#### Windows PowerShell Guidance
For Windows users:
- Auto-converts simple Linux commands to PowerShell
- Path normalization (fixes Claude Code bug #7918)
- Clear guidance for complex commands

## Commands

All cc-track commands use the `/cc-track:` prefix:

### Workflow Commands
| Command | Description |
|---------|-------------|
| `/cc-track:specify` | Create feature specification through Socratic questioning |
| `/cc-track:plan` | Generate technical implementation plan with constitution checks |
| `/cc-track:tasks` | Generate phase-based task breakdown |
| `/cc-track:prepare-completion` | Validate task readiness (tests, lint, review) |
| `/cc-track:complete-task` | Complete task, squash commits, create PR |
| `/cc-track:fix-issues` | Triage review issues one-by-one (Fix/Defer/Dismiss/Discuss) |

### Review Commands
| Command | Description |
|---------|-------------|
| `/cc-track:code-review` | Standalone multi-agent code review |
| `/cc-track:spotless` | Scoped dead code analysis with parallel investigation |

### Utility Commands
| Command | Description |
|---------|-------------|
| `/cc-track:setup-cc-track` | Initial setup wizard |
| `/cc-track:config-track` | Modify feature configuration |
| `/cc-track:constitution` | Create or update project guardrails |
| `/cc-track:add-to-backlog` | Add items to backlog without disruption |
| `/cc-track:context-maintenance` | Clean up and reduce bloat in context files |
| `/cc-track:migrate` | Migrate from old task structure to spec-driven workflow |

## Configuration

After setup, cc-track uses `.cc-track/track.config.json`:

```json
{
  "hooks": {
    "edit_validation": {
      "enabled": true,
      "typecheck": { "enabled": true },
      "lint": { "enabled": true }
    },
    "pre_tool_validation": {
      "enabled": true
    },
    "autoflow": {
      "enabled": false,
      "throttle_limit": 3,
      "window_duration_minutes": 5
    }
  },
  "features": {
    "statusline": { "enabled": true },
    "git_branching": { "enabled": true },
    "branch_protection": {
      "enabled": true,
      "protected_branches": ["main", "master"],
      "allow_gitignored": true
    },
    "api_timer": { "display": "sonnet-only" },
    "github_integration": {
      "enabled": true,
      "auto_create_issues": true,
      "auto_create_prs": true
    },
    "code_review": {
      "enabled": true,
      "tool": "claude"
    }
  },
  "logging": {
    "enabled": true,
    "level": "info",
    "retentionDays": 7
  }
}
```

Use `/cc-track:config-track` to modify settings interactively.

## Project Structure

After initialization, cc-track creates:
```
your-project/
├── .cc-track/
│   ├── specs/                # Feature specifications
│   │   └── 001-feature-name/
│   │       ├── .metadata.json
│   │       ├── spec.md       # Requirements (what/why)
│   │       ├── plan.md       # Technical design (how)
│   │       ├── tasks.md      # Implementation breakdown
│   │       └── progress.md   # Development record
│   ├── track.config.json     # Feature configuration
│   ├── product_context.md    # Project vision
│   ├── system_patterns.md    # Technical patterns
│   ├── decision_log.md       # Architectural decisions
│   ├── code_index.md         # Codebase map
│   ├── user_context.md       # User preferences
│   ├── backlog.md            # Future ideas
│   ├── progress_log.md       # Task history
│   └── constitution.md       # Project guardrails (optional)
├── .claude/
│   └── settings.json         # Claude Code settings
└── CLAUDE.md                 # Main context file with imports
```

## Philosophy

cc-track is designed around these principles:

- **Clarity before code** - Socratic questioning forces understanding requirements before implementation
- **Separation of concerns** - Requirements, design, and implementation stay distinct and traceable
- **Constitution-aware** - Designs validated against project guardrails catch violations early
- **Complexity-adaptive** - Simple features proceed quickly; complex ones get thorough analysis
- **Safe autonomy** - Autoflow mode enables unattended work with intelligent safety limits
- **Non-invasive** - Start with features disabled, enable what you need
- **Transparent** - You see exactly what's being configured and validated

## Requirements

- [Claude Code](https://claude.ai/code) with plugin support
- [Bun runtime](https://bun.sh) 1.0.0+ for TypeScript execution
- Git (for task management features)
- GitHub CLI (optional, for GitHub integration)

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
