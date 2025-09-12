# cc-track Agent Guide (Programming Agent)

This repository implements cc-track — a Task Review And Context Keeper that helps AI coding agents work fast while staying aligned with project requirements. Use this guide if you are a general programming agent (Codex CLI / GPT‑5 class), not only a code reviewer.

## Roles & Modes

You may be asked to operate in one or more of these modes:

- Builder: Implement features, refactors, bug fixes, and tests according to `.claude/tasks/TASK_###.md` specs.
- Reviewer: Perform detached code reviews and produce timestamped artifacts under `code-reviews/`.
- Maintainer: Improve docs, hooks, and build/test pipelines; align behavior with the workflow defined in `.claude/*`.

Across all modes, treat `.claude/tasks/TASK_###.md` as the source of truth for acceptance criteria and current scope. Keep user‑visible behavior stable unless a spec explicitly requests a change.

## Project Overview

- Name: cc-track (Task Review And Context Keeper)
- Purpose: Lightweight guardrails and workflow for AI‑assisted development (Claude Code compatible) with automatic validation, task lifecycle management, and optional GitHub PR flow.
- Language/Tooling: TypeScript (strict), Bun, Commander CLI, Biome (lint/format), Bun test.
- Binary: Built via `bun build` into `dist/cc-track` (plus OS‑specific variants).

### Repository Landmarks

- `src/cli/index.ts` – CLI entrypoint that registers commands.
- `src/commands/*` – CLI commands: `init`, `prepare-completion`, `complete-task`, `hook`, `backlog`, `statusline`, `git-session`.
- `src/hooks/*` – Claude Code hooks (capture-plan, edit-validation, pre/post-compact, stop-review).
- `src/lib/*` – Shared utilities (config, git/github helpers, validation, logger, claude-md helpers) and tests.
- `.claude/*` – Project context, workflow, tasks, and settings:
  - `tasks/TASK_###.md` – Task specs and lifecycle.
  - `track.config.json` – Hook and feature configuration (validation commands, GitHub integration, statusline, logging, default branch).
  - `cc-track-workflow.md` – End‑to‑end workflow from plan → PR.
  - `decision_log.md`, `system_patterns.md`, `progress_log.md`, `user_context.md`, `product_context.md` – Context/state docs.
  - `commands/*.md` – Claude Code “slash command” wrappers that call built artifacts.
- `reference/*` – Background research and docs for commands, hooks, SDKs, and integration.
- `code-reviews/` – Storage for review artifacts when operating in Reviewer mode.
- `dist/` – Compiled binaries for the CLI and hooks.

## Core Workflows

High‑level lifecycle: Plan → Task Created → Development → Validation → Documentation → Completion → PR → Merge.

Key responsibilities for agents:

- Plan and scope work from `.claude/tasks/TASK_###.md` and `CLAUDE.md` imports.
- Implement minimal, surgical changes that satisfy the spec; add or update tests near changed code.
- Use validation routinely: `bun run check` and `bun test`. For task completion, run `prepare-completion` and then `complete-task` (usually invoked by the user; see below).
- Keep docs current: task file “Recent Progress”, `decision_log.md`, `system_patterns.md`, and `progress_log.md` where applicable.
- Respect `.claude/track.config.json` (validation commands, default branch, GitHub settings, logging).

## Build, Test, Validate

- Install deps: `bun install`
- Typecheck: `bun run typecheck`
- Lint: `bun run lint`
- Format (write): `bun run format`
- Fix (lint + write): `bun run fix`
- Combined checks: `bun run check`
- Tests: `bun test`
- Build CLI (default): `bun run build` → `dist/cc-track`
- Cross‑platform builds: `bun run build:cross-platform`
- Build hooks: `bun run build:hooks`

Notes:
- Tests live alongside implementation in `src/**.test.ts`. Prefer focused unit tests that assert observable behavior; avoid re‑implementing logic in tests.
- Biome is the source of truth for lint/format. Keep code style consistent; don’t introduce new linters/formatters.

## CLI Commands (Summary)

The CLI exposes several commands via `dist/cc-track`:

- `init` – Initialize cc-track in the current project (sets up `.claude` assets, templates, and imports in `CLAUDE.md`).
- `prepare-completion` – Run validation and generate dynamic fix instructions.
- `complete-task` – Finalize the active task: update docs, squash WIP, push/PR or merge per config.
- `hook` – Dispatch entrypoint for Claude Code hook events.
- `backlog` – Manage backlog entries.
- `statusline` – Output status line (integrates with `ccusage` if present).
- `git-session` – Utilities for WIP squashing, diffing, and push preparation.

In Claude Code, many of these are wrapped by `.claude/commands/*.md` files. Prefer relative commands (e.g., `dist/cc-track ...`) when running locally rather than absolute paths.

## Hooks Overview

Hook enablement and commands come from `.claude/track.config.json`:

- `capture_plan` – Creates `.claude/tasks/TASK_###.md` when leaving planning mode and sets the active task in `CLAUDE.md`.
- `edit_validation` – Runs TypeScript/Biome checks on edited files. Skips TS checks for test files to reduce noise.
- `pre_compact` / `post_compact` – Preserve and restore context around compaction; guides doc updates from imported context.
- `stop_review` – Periodic WIP reviews and auto‑commits. Treat its findings as strong signals to realign with the task spec.

These hooks are re‑implemented in `src/hooks/*` and exercised via the `hook` command for headless/CLI use.

## Spec Alignment & Sources of Truth

- Primary spec: `.claude/tasks/TASK_###.md`. Build to the acceptance criteria, not incidental existing behavior.
- Behavioral parity: When touching hook behavior or CLI commands, verify parity (or explicitly documented deltas) between any original `.claude/hooks/*` scripts and refactored `src/**` modules.
- `CLAUDE.md` imports establish the active context; do not silently remove required imports without updating the workflow docs.

## Coding Standards

- TypeScript strict mode; no implicit any; explicit, intention‑revealing names.
- Keep changes minimal and scoped; avoid unrelated refactors.
- Prefer composition over deep inheritance; avoid accidental public APIs.
- Log with `src/lib/logger.ts` and honor `.claude/track.config.json` logging settings.
- Do not add new external dependencies without a task/justification.

## Reviewer Mode (When Requested)

When explicitly asked to review instead of implement:

- Write a timestamped review file per substantial change under `code-reviews/`.
- Filename: `code-reviews/TASK_XXX_YYYY-MM-DD_HHMM-UTC.md` (e.g., `TASK_026_2025-09-11_1045-UTC.md`).
- Include: Summary, Spec Alignment (link to `.claude/tasks/TASK_###.md`), Behavioral Diffs, Tests & Coverage, Risks, Required Fixes, Optional Improvements, Verified Commands.
- Default review scope is the diff between the default branch (see `git.defaultBranch` in `track.config.json`) and the current branch.
- Each new `TASK_###` should be on its own branch; compare that branch to the default branch.
- If functional behavior changes, update relevant docs (`reference/*` or project docs) to reflect approved deltas.

## Task Completion Flow (for Agents + Users)

Typical endgame for a task:

1) Run `dist/cc-track prepare-completion` and ensure checks pass (or fix issues per instructions).
2) Update docs: task “Recent Progress”, `decision_log.md`, `system_patterns.md`.
3) Ask the user to run `dist/cc-track complete-task` (or they will run it). This will:
   - Perform a final validation (unless skipped).
   - Update task + `CLAUDE.md`, append to `no_active_task.md`.
   - Squash WIP commits when safe; handle push/PR or merge depending on config.
   - Optionally enhance PR description via GitHub CLI.

Notes:
- GitHub workflows depend on `.claude/track.config.json.features.github_integration.*`.
- Default branch is configured in `.claude/track.config.json.git.defaultBranch` (often `main`).

## Known Integrations

- `ccusage` – Used by `statusline` to show session cost/context and 5‑hour billing block info. Optional, auto‑detected by scripts.
- GitHub CLI – Used by `complete-task` for PR creation and enhancement when enabled.

## Verified Commands (Quick Reference)

- Quality gates: `bun run check`, `bun test`
- Build CLI: `bun run build` → run `dist/cc-track -h`
- Prepare completion: `dist/cc-track prepare-completion`
- Complete task: `dist/cc-track complete-task`
- Build hooks: `bun run build:hooks`

## Do / Don’t

- Do: Be precise, cite file paths in findings, keep action items prioritized and testable, and keep user‑visible behavior stable unless spec says otherwise.
- Don’t: Gold‑plate, re‑architect, or mix unrelated refactors with scoped work.

---

If anything in this guide conflicts with an explicit user instruction for a given task, follow the user instruction and call out the variance in your notes or review artifact.
