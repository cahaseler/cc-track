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
│   ├── tasks/         # Active and completed tasks
│   └── *.md           # Context files (imported by CLAUDE.md)
├── src/               # Source code for CLI
│   ├── cli/           # CLI entry point
│   ├── commands/      # Command implementations
│   ├── hooks/         # Hook implementations
│   └── lib/           # Shared libraries
├── dist/              # Compiled CLI binary
├── templates/         # Templates for initialization
├── docs/              # Research and documentation
└── old_roopars_documents/  # Legacy documentation
```

## Key Files & Purpose

### CLI Implementation (src/)
| File | Purpose |
|------|---------|
| src/cli/index.ts | Main CLI entry point with Commander setup |
| src/hooks/capture-plan.ts | Captures plans from ExitPlanMode, creates task files |
| src/hooks/pre-compact.ts | Updates task files with progress before compaction |
| src/hooks/stop-review.ts | Reviews changes at Stop event, auto-commits |
| src/hooks/edit-validation.ts | Real-time TypeScript and Biome validation on edits |

### CLI Commands (src/commands/)
| File | Purpose |
|------|---------|
| src/commands/init.ts | Initializes cc-track in a project |
| src/commands/git-session.ts | Git utilities for managing WIP commits |
| src/commands/backlog.ts | Appends items to backlog with date stamps |
| src/commands/complete-task.ts | Automated task completion with git squashing |
| src/commands/hook.ts | Unified hook dispatcher for all events |
| src/commands/statusline.ts | Generate status line for Claude Code |
| src/commands/parse-logs.ts | Parse and filter Claude Code JSONL logs |

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

### Libraries (src/lib/)
| File | Purpose |
|------|---------|
| src/lib/config.ts | Configuration management helpers |
| src/lib/git-helpers.ts | Git operations for branch management |
| src/lib/github-helpers.ts | GitHub CLI wrapper functions |
| src/lib/logger.ts | Centralized logging system with rotation |
| src/lib/log-parser.ts | JSONL log parser with filtering and formatting |

---

## Update Log

[2025-09-10 03:05] - Complete restructure with accurate project layout
[2025-09-10 09:00] - Added backlog system files
[2025-09-10 21:00] - Updated paths to reflect actual .claude/ structure, added missing files
[2025-09-11 19:30] - Migrated all code to src/ directory, removed legacy .claude script locations
[2025-09-12 21:30] - Added log parser library and parse-logs command