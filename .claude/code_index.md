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
| .claude/hooks/capture_plan.ts | Captures plans from ExitPlanMode, creates task files |
| .claude/hooks/pre_compact.ts | Extracts error patterns before compaction |
| .claude/hooks/post_compact.ts | Restores context after compaction via SessionStart |
| .claude/hooks/stop_review.ts | Reviews changes at Stop event, auto-commits with [wip] |
| .claude/hooks/edit_validation.ts | Real-time TypeScript and Biome validation on edits |

### Scripts & Utilities
| File | Purpose |
|------|---------|
| .claude/scripts/init-templates.ts | Initializes cc-track in a project |
| .claude/scripts/git-session.ts | Git utilities for managing WIP commits |
| .claude/scripts/add-to-backlog.ts | Appends items to backlog with date stamps |
| .claude/scripts/complete-task.ts | Automated task completion with git squashing |

### Commands
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
| .claude/lib/config.ts | Configuration management helpers |
| .claude/lib/git-helpers.ts | Git operations for branch management |
| .claude/lib/logger.ts | Centralized logging system with rotation |

---

## Update Log

[2025-09-10 03:05] - Complete restructure with accurate project layout
[2025-09-10 09:00] - Added backlog system files
[2025-09-10 21:00] - Updated paths to reflect actual .claude/ structure, added missing files (edit_validation.ts, complete-task.ts, logger.ts, view-logs.md)