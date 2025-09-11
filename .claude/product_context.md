# Product Context

**Purpose:** High-level overview of the project's goals, target audience, core features, and vision. Stable reference for understanding the "why" behind the project.

**Instructions:**
- Maintain concise summary of project purpose and scope
- Define primary users and their needs
- List key features and functionalities
- Update only when significant shifts in direction
- Append updates with: `[YYYY-MM-DD HH:MM] - [Summary of Change]`

---

## Project Vision & Goals

**cc-track (Task Review And Context Keeper)** is a comprehensive context management and workflow optimization system for Claude Code that keeps your vibe coding on track.

### Vision
Solve the fundamental problem of context loss in Claude Code sessions through intelligent preservation, task tracking, and quality assurance.

### Goals
- Preserve critical context through compaction cycles
- Enforce completion of tasks rather than "close enough" declarations
- Provide continuous awareness of task status and context usage
- Guide development through planning and validation

## Target Audience

**Primary Users:** Software developers using Claude Code for:
- Complex multi-file projects
- Long-running development sessions
- Projects requiring consistent patterns and conventions
- Teams needing reproducible AI-assisted workflows

**User Needs:**
- Avoid re-explaining project context after compaction
- Track multiple tasks and their status
- Ensure AI follows established patterns
- Validate work meets requirements before declaring complete

## Core Features & Functionality

### Context Management
- Dynamic CLAUDE.md with file imports
- Automatic context extraction before compaction
- Persistent storage of project patterns and decisions
- Smart categorization (persistent/cached/dynamic)

### Task Tracking
- Plan capture from planning mode
- Active task management with requirements
- Progress logging and decision tracking
- Task status visibility in status line

### Quality Assurance
- Real-time edit validation for TypeScript files (PostToolUse hook)
- Automated review of changes at stop points
- Error pattern learning and documentation
- Task completion validation with smart automation

### Developer Experience
- Custom two-line status line with cost tiers and API timer
- Train-themed visual feedback (🚅 🛤️) and cost emojis (🪙→🤑)
- Configurable features via track.config.json
- One-command initialization (`/init-track`)
- Safe file handling with backups and validation

## Non-Goals / Out of Scope

- Strict TDD enforcement (offers guidance, not enforcement)
- Replacing Claude Code's native features
- Managing multiple Claude Code instances
- Primary version control operations (supports optional git branching)
- External API integrations (except ccusage)

## Technical Stack

- **Language:** TypeScript
- **Runtime:** Bun
- **Dependencies:** ccusage (for token tracking)
- **Integration:** Claude Code hooks system
- **File Format:** Markdown for context, JSON for config
- **Shell:** Bash for status line and simple hooks

---

## Update Log

[2025-01-09 16:30] - Initial product context documented based on project analysis
[2025-01-10] - Renamed project from cc-pars to cc-track with new branding
[2025-09-10] - Updated features to reflect actual implementation: real-time validation, two-line statusline, train theming, configurable API timer