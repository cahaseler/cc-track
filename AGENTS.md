# cc-track Agent Guide (Programming Agent)

This repository implements cc-track — a Task Review And Context Keeper that helps AI coding agents work fast while staying aligned with project requirements. Use this guide if you are a general programming agent (Codex CLI / GPT‑5 class), not only a code reviewer.

## Roles & Modes

You may be asked to operate in one or more of these modes:

- Builder: Implement features, refactors, bug fixes, and tests according to `.claude/specs/[spec-id]/` specifications.
- Reviewer: Perform detached code reviews and produce timestamped artifacts under `code-reviews/`.
- Maintainer: Improve docs, hooks, and test pipelines; align behavior with the workflow defined in `.claude/*`.

Across all modes, treat `.claude/specs/[spec-id]/spec.md` as the source of truth for acceptance criteria and current scope. Keep user‑visible behavior stable unless a spec explicitly requests a change.

## Project Overview

- Name: cc-track (Task Review And Context Keeper)
- Purpose: Claude Code plugin providing lightweight guardrails and workflow for AI‑assisted development with automatic validation, task lifecycle management, and optional GitHub PR flow.
- Language/Tooling: TypeScript (strict), Bun runtime, Biome (lint/format), Bun test.
- Distribution: Plugin via Claude Code marketplace (npm package deprecated).

### Repository Landmarks

**Plugin Structure** (distributed to users):
- `commands/*.md` – Slash commands that execute TypeScript via ${CLAUDE_PLUGIN_ROOT}.
- `commands/scripts/*.ts` – Command implementations: `complete-task`, `prepare-completion`, `backlog`, `hook`, `parse-logs`, `git-session`, `migrate`.
- `hooks/*.ts` – Hook implementations: `edit-validation` (PostToolUse), `pre-tool-validation` (PreToolUse).
- `hooks/hooks.json` – Hook registration file for Claude Code.
- `lib/*.ts` – Shared utilities (config, git/github helpers, validation, logger, claude-md helpers, spec-helpers).
- `scripts/*.ts` – Statusline and other non-hook scripts.
- `templates/*.md` – Reference template files (not copied, used via ${CLAUDE_PLUGIN_ROOT}).
- `.claude-plugin/plugin.json` – Plugin metadata (version, description, author).
- `package.json` – Dependencies (@anthropic-ai/claude-agent-sdk, ccusage).

**Tests** (not distributed):
- `tests/commands/*.test.ts` – Command implementation tests.
- `tests/hooks/*.test.ts` – Hook tests.
- `lib/*.test.ts` – Library unit tests.
- `test-utils/*.ts` – Test helpers and mocks.

**Project Context** (our development setup, not distributed):
- `.claude/*` – This project's own cc-track configuration:
  - `specs/[id]-feature-name/` – Feature specifications (spec.md, plan.md, tasks.md, progress.md).
  - `track.config.json` – Hook and feature configuration for this project.
  - `cc-track-workflow.md` – End‑to‑end workflow from /specify → PR.
  - `decision_log.md`, `system_patterns.md`, `progress_log.md`, `user_context.md`, `product_context.md` – Context/state docs.
  - `commands/*.md` – Our own slash commands (dogfooding the plugin).

**Documentation**:
- `code-reviews/` – Storage for review artifacts when operating in Reviewer mode.
- `docs/` – Reference docs and testing guidance.
- `MIGRATION.md` – npm-to-plugin migration guide.
- `README.md` – Plugin installation and quickstart.

**NOT distributed**:
- `tests/` – Test files (428 tests, all must pass).
- `.claude/` – Our development project configuration.
- `dist/`, `src/`, `build scripts` – Removed in plugin migration (no longer compile to binary).

## Development Repo & Self‑Hosting

- This repository is the development repo for cc-track and it self‑hosts cc-track to manage its own work.
- cc-track runs as a native Claude Code plugin executed via Bun runtime.
- Codex CLI does not provide equivalent first‑class hooks; manual simulation acceptable but hooks are designed for Claude Code event-driven execution.

### Plugin Execution Model

Commands are executed via slash commands in Claude Code:
- `/complete-task` → executes `bun run ${CLAUDE_PLUGIN_ROOT}/commands/scripts/complete-task.ts`
- `/prepare-completion` → executes `bun run ${CLAUDE_PLUGIN_ROOT}/commands/scripts/prepare-completion.ts`
- `/add-to-backlog "item"` → executes `bun run ${CLAUDE_PLUGIN_ROOT}/commands/scripts/backlog.ts`

Hooks are registered in `hooks/hooks.json` and execute automatically:
- PostToolUse (Edit, Write, MultiEdit) → `hooks/edit-validation.ts`
- PreToolUse (Edit, Write, etc.) → `hooks/pre-tool-validation.ts`

### Manual Testing for Codex

When testing without Claude Code:
```bash
# Run commands directly
bun run commands/scripts/complete-task.ts
bun run commands/scripts/prepare-completion.ts

# Simulate hook execution (test individual hooks directly)
echo '{"hook_event_name":"PostToolUse","tool_name":"Edit","tool_input":{"file_path":"lib/config.ts"}}' | bun run hooks/edit-validation.ts
echo '{"hook_event_name":"PreToolUse","tool_name":"Edit","tool_input":{"file_path":"lib/config.ts"}}' | bun run hooks/pre-tool-validation.ts
```

## Core Workflows

High‑level lifecycle: /specify → /plan → /tasks → Development → /prepare-completion → /complete-task → PR → Merge.

Key responsibilities for agents:

- Plan and scope work from `.claude/specs/[id]-feature-name/spec.md` and plan.md.
- Implement minimal, surgical changes that satisfy the spec; add or update tests near changed code.
- Use validation routinely: `bun run check` and `bun test`. For task completion, run `/prepare-completion` and then `/complete-task` (invoked by user via slash command).
- Keep docs current: `progress.md`, `decision_log.md`, `system_patterns.md`, and `progress_log.md` where applicable.
- Respect `.claude/track.config.json` (validation commands, GitHub settings, logging).

## Build, Test, Validate

- Install deps: `bun install`
- Typecheck: `bun run typecheck`
- Lint: `bun run lint`
- Format (write): `bun run format`
- Fix (lint + write): `bun run fix`
- Combined checks: `bun run check`
- Tests: `bun test` (428 tests in tests/ directory)

Notes:
- Tests live in `tests/` directory, separate from implementation.
- Test files use `../../` imports to reference implementation in `commands/scripts/`, `hooks/`, and `lib/`.
- Biome is the source of truth for lint/format. Keep code style consistent.
- **No binary compilation** - plugin distributes TypeScript source executed by Bun.

## Plugin Architecture

### Directory Structure (What Gets Distributed)

```
cc-track/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata
├── commands/
│   ├── *.md                 # Slash command definitions
│   └── scripts/*.ts         # Command implementations
├── hooks/
│   ├── *.ts                 # Hook implementations
│   └── hooks.json           # Hook registration
├── lib/*.ts                 # Shared libraries
├── scripts/*.ts             # Statusline and utilities
├── templates/*.md           # Reference templates
├── package.json             # Dependencies
└── README.md               # Installation guide
```

### What Doesn't Get Distributed

```
tests/                       # Test suite (428 tests)
.claude/                     # Our development config
docs/                        # Internal documentation
code-reviews/                # Review artifacts
```

## Commands Overview (in commands/scripts/)

TypeScript implementations executed by slash commands:

- `complete-task.ts` – Finalize the active task: update docs, squash WIP, create PR.
- `prepare-completion.ts` – Run validation, code review, generate fix instructions.
- `backlog.ts` – Manage backlog entries.
- `parse-logs.ts` – Parse and filter Claude Code logs.
- `git-session.ts` – Utilities for WIP squashing, diffing, push preparation.
- `migrate.ts` – Migrate old task structure to new spec format.
- `context.ts` – Shared context and dependency injection for commands.

In Claude Code, these are invoked via `.claude/commands/*.md` files that use `${CLAUDE_PLUGIN_ROOT}`.

## Hooks Overview

Hook enablement comes from `.claude/track.config.json`:

- `edit_validation` (PostToolUse) – Runs TypeScript/Biome checks on edited files. **Blocks** if errors found.
  - Configurable: `typecheck.enabled`, `lint.enabled`
- `pre_tool_validation` (PreToolUse) – Multiple validations before tool execution:
  - Branch protection: Blocks edits on main/master branches
  - Task file validation: Prevents manual status changes
  - Plugin dependency checks: Ensures Bun and node_modules present
  - npm conflict detection: Blocks if npm version installed

These hooks are implemented in `hooks/*.ts` and registered in `hooks/hooks.json`.

## Spec Alignment & Sources of Truth

- Primary spec: `.claude/specs/[id]-feature-name/spec.md` - WHAT and WHY (tech-agnostic requirements).
- Technical design: `.claude/specs/[id]-feature-name/plan.md` - HOW (implementation approach).
- Task breakdown: `.claude/specs/[id]-feature-name/tasks.md` - Sequential implementation steps.
- Progress tracking: `.claude/specs/[id]-feature-name/progress.md` - What actually happened.
- Build to the acceptance criteria in spec.md, not incidental existing behavior.
- `CLAUDE.md` imports establish the active context; do not silently remove required imports.

## Coding Standards

- TypeScript strict mode; no implicit any; explicit, intention‑revealing names.
- Keep changes minimal and scoped; avoid unrelated refactors.
- Prefer composition over deep inheritance; avoid accidental public APIs.
- Log with `lib/logger.ts` and honor `.claude/track.config.json` logging settings.
- Do not add new external dependencies without a task/justification.
- Tests in `tests/` directory, separate from implementation.
- Use dependency injection for testability (see test-utils/command-mocks.ts).

## Reviewer Mode (When Requested)

When explicitly asked to review instead of implement:

- Write a timestamped review file per substantial change under `code-reviews/`.
- Filename: `code-reviews/TASK_XXX_YYYY-MM-DD_HHMM-UTC.md` (e.g., `TASK_101_2025-10-15_1740-UTC.md`).
- Include: Summary, Spec Alignment (link to `.claude/specs/[id]-feature-name/spec.md`), Behavioral Diffs, Tests & Coverage, Risks, Required Fixes, Optional Improvements, Verified Commands.
- Default review scope is the diff between main and the current branch.
- Each new task should be on its own branch; compare that branch to main.
- **CRITICAL**: Review the ACTUAL codebase structure (hooks/, commands/scripts/, lib/), NOT the old src/ structure.

## Task Completion Flow (for Agents + Users)

Typical endgame for a task:

1) Run `/prepare-completion` and ensure checks pass (or fix issues per instructions).
2) Update docs: `progress.md` in spec folder, `decision_log.md`, `system_patterns.md`.
3) Ask the user to run `/complete-task` (slash command). This will:
   - Perform a final validation (unless skipped).
   - Update task metadata + `CLAUDE.md`, append to `no_active_task.md`.
   - Squash WIP commits when safe; handle push/PR depending on config.
   - Optionally create PR via GitHub CLI.

Notes:
- GitHub workflows depend on `.claude/track.config.json.features.github_integration.*`.
- Default branch is usually `main`.

## Known Integrations

- `ccusage` – Used by `scripts/statusline.ts` to show session cost/context and 5‑hour billing block info. Optional, auto‑detected.
- GitHub CLI (`gh`) – Used by `commands/scripts/complete-task.ts` for PR creation when enabled.
- Bun runtime – Required for executing TypeScript directly (no compilation step).
- Claude Code plugin system – Native integration via hooks and slash commands.

## Verified Commands (Quick Reference)

- Quality gates: `bun run check`, `bun test`
- Run commands: `bun run commands/scripts/complete-task.ts`
- Run hooks: `echo '{"hook_event_name":"PostToolUse","tool_name":"Edit","tool_input":{"file_path":"test.ts"}}' | bun run hooks/edit-validation.ts`
- All 428 tests must pass before completion

## Do / Don't

- Do: Be precise, cite ACTUAL file paths (commands/scripts/, hooks/, lib/), keep action items prioritized and testable, and keep user‑visible behavior stable unless spec says otherwise.
- Don't: Reference old src/ paths, assume binary compilation, gold‑plate, re‑architect, or mix unrelated refactors with scoped work.
- **CRITICAL**: Review the actual plugin structure, not the old npm/binary structure.

---

If anything in this guide conflicts with an explicit user instruction for a given task, follow the user instruction and call out the variance in your notes or review artifact.
