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
│   ├── plans/         # Captured plans from planning mode
│   ├── tasks/         # Active and completed tasks
│   └── *.md           # Context files (imported by CLAUDE.md)
├── commands/          # Slash commands for Claude Code
├── docs/              # Research and documentation
├── hooks/             # Claude Code event hooks
├── scripts/           # Utility scripts
├── templates/         # Templates for initialization
└── old_roopars_documents/  # Legacy documentation
```

## Key Files & Purpose

### Hooks (Event Handlers)
| File | Purpose |
|------|---------|
| hooks/capture_plan.ts | Captures plans from ExitPlanMode, creates task files |
| hooks/pre_compact.ts | Extracts error patterns before compaction |
| hooks/post_compact.ts | Restores context after compaction via SessionStart |
| hooks/stop_review.ts | Reviews changes at Stop event, auto-commits with [wip] |

### Scripts & Utilities
| File | Purpose |
|------|---------|
| scripts/init-templates.ts | Initializes cc-track in a project |
| scripts/git-session.ts | Git utilities for managing WIP commits |
| scripts/add-to-backlog.ts | Appends items to backlog with date stamps |

### Commands
| File | Purpose |
|------|---------|
| commands/init-track.md | Slash command to initialize cc-track |
| commands/complete-task.md | Mark active task as complete |
| commands/config-track.md | Configure cc-track hooks and features |
| commands/add-to-backlog.md | Quickly add items to backlog without disruption |

### Templates
| File | Purpose |
|------|---------|
| templates/CLAUDE.md | Main context file with @ imports |
| templates/settings.json | Claude Code hooks configuration |
| templates/settings_with_stop.json | Settings with Stop hook enabled |
| templates/statusline.sh | Custom status line script |

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

### Libraries (.claude/lib/)
| File | Purpose |
|------|---------|
| lib/config.ts | Configuration management helpers |
| lib/git-helpers.ts | Git operations for branch management |

---

## Update Log

[2025-09-10 03:05] - Complete restructure with accurate project layout
[2025-09-10 09:00] - Added backlog system files