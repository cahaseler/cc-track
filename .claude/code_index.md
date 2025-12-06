# Code Index

**Purpose:** Maps codebase structure, key files, functions, classes, and dependencies. Provides quick reference for navigation and understanding.

**Instructions:**
- Update when significant files added/removed
- Track key functionality per file, especially utility functions that might be reused

---

## Directory Structure

```
/home/ubuntu/projects/cc-track/
├── .claude/           # Project context and state
│   ├── commands/      # Slash commands for Claude Code
│   ├── plans/         # Captured plans from planning mode
│   ├── specs/         # Feature specifications (new workflow)
│   └── *.md           # Context files (imported by CLAUDE.md)
├── hooks/             # Claude Code hook implementations
├── scripts/           # Utility scripts (statusline, etc.)
├── skills/            # Claude Code skills (plugin)
│   └── cc-track-tools/  # Main skill with shared libraries
│       ├── lib/       # Shared libraries (single source of truth)
│       └── scripts/   # Executable TypeScript scripts
├── commands/          # Plugin slash commands
├── agents/            # Subagent definitions
├── test-utils/        # Test utilities
├── templates/         # Templates for initialization
└── docs/              # Research and documentation
```

## Key Files & Purpose

### Hooks (hooks/)
| File | Purpose |
|------|---------|
| hooks/edit-validation.ts | Real-time TypeScript and Biome validation on edits |
| hooks/pre-tool-validation.ts | Branch protection and task file validation |
| hooks/session-start.ts | Session initialization |

### Scripts (scripts/)
| File | Purpose |
|------|---------|
| scripts/statusline.ts | Generate status line for Claude Code |

### Slash Commands (.claude/commands/)
| File | Purpose |
|------|---------|
| .claude/commands/init-track.md | Slash command to initialize cc-track |
| .claude/commands/complete-task.md | Mark active task as complete |
| .claude/commands/config-track.md | Configure cc-track hooks and features |
| .claude/commands/add-to-backlog.md | Quickly add items to backlog without disruption |
| .claude/commands/view-logs.md | View centralized logs for debugging |
| .claude/commands/test-args.md | Test command for debugging arguments |

### Templates
| File | Purpose |
|------|---------|
| templates/CLAUDE.md | Main context file with @ imports |
| templates/settings.json | Claude Code hooks configuration |
| templates/settings_with_stop.json | Settings with Stop hook enabled |
| src/commands/statusline.ts | Custom status line command |

### Context Files (.claude/)
| File | Purpose |
|------|---------|
| .claude/product_context.md | Project vision and goals |
| .claude/system_patterns.md | Technical patterns and conventions |
| .claude/decision_log.md | Immutable record of decisions |
| .claude/progress_log.md | Task status tracking |
| .claude/learned_mistakes.md | Auto-generated error patterns |
| .claude/user_context.md | User preferences and working style |
| .claude/track.config.json | Configuration for enabling/disabling hooks |
| .claude/backlog.md | List of future ideas and improvements |

### Shared Libraries (skills/cc-track-tools/lib/)
All shared code lives in the skill's lib directory. Hooks and scripts import from here.

| File | Purpose |
|------|---------|
| lib/config.ts | Configuration management helpers |
| lib/git-helpers.ts | Git operations for branch management |
| lib/github-helpers.ts | GitHub CLI wrapper functions |
| lib/logger.ts | Centralized logging system with rotation |
| lib/log-parser.ts | JSONL log parser with filtering and formatting |
| lib/validation.ts | Validation checks for task completion |
| lib/claude-sdk.ts | Claude AI SDK wrapper |
| lib/spec-helpers.ts | Spec directory and metadata helpers |

### Skill Scripts (skills/cc-track-tools/scripts/)
| File | Purpose |
|------|---------|
| scripts/prepare-completion.ts | Validation suite runner |
| scripts/complete-task.ts | Task completion automation |
| scripts/backlog.ts | Backlog management |
| scripts/git-session.ts | Git session utilities |
| scripts/context.ts | Context gathering utilities |

---

## Update Log

[2025-09-10 03:05] - Complete restructure with accurate project layout
[2025-09-10 09:00] - Added backlog system files
[2025-09-10 21:00] - Updated paths to reflect actual .claude/ structure, added missing files
[2025-09-11 19:30] - Migrated all code to src/ directory, removed legacy .claude script locations
[2025-09-12 21:30] - Added log parser library and parse-logs command
[2025-12-06] - Added skills/ directory for cc-track-tools skill with utility scripts
[2025-12-06] - Consolidated lib/ into skills/cc-track-tools/lib/ as single source of truth