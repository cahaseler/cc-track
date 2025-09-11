# Hook Functionality Differences: .claude → src/ CLI

This document compares the original .claude hook scripts to their refactored src CLI modules, focusing strictly on behavioral differences (not just structure).

## Capture Plan (capture_plan → capture-plan)
- Execution model
  - .claude: Bun script reads stdin and writes JSON to stdout; exits process.
  - src: Exposes `capturePlanHook(input, deps)` returning a `HookOutput`. Side-effects and shell/FS are DI-capable.
- Task ID generation and enrichment
  - Behavior preserved: next-available 3‑digit ID, prompt content/sections, Sonnet model, temp file cleanup.
- Git branching
  - .claude: Inline calls to helpers; proceeds opportunistically (swallows git errors) and appends `<!-- branch: ... -->`.
  - src: Encapsulated in `handleGitBranching` with DI and logging; returns branch name or null. Same visible outcome.
- GitHub integration
  - Behavior preserved: gated by `features.github_integration`, validates `gh`, optionally creates issue and `<!-- github_issue / github_url / issue_branch -->` tags. Now encapsulated in `handleGitHubIntegration`.
- CLAUDE.md update
  - Behavior preserved; extracted into `updateClaudeMd`.
- Logging/diagnostics
  - .claude had emergency file logging to `/tmp/capture_plan_debug.log` and some console error notes.
  - src removes ad-hoc debug file writing; uses injected logger consistently.

## Edit Validation (edit_validation → edit-validation)
- Blocking behavior
  - .claude: Non-blocking. On issues, returns `continue: true` with `hookSpecificOutput.additionalContext` describing problems.
  - src: Blocking. On issues, returns `{ decision: 'block', systemMessage: '⚠️ TypeScript/Biome validation failed: …' }`. This is a functional change.
- Command resolution
  - .claude: Honors `hooks.edit_validation.typecheck.command` and `lint.command` from `.claude/track.config.json` (defaults to `bunx …`).
  - src: `runTypeScriptCheck`/`runBiomeCheck` respect config, but the main hook path currently invokes `npx tsc`/`npx biome` directly, ignoring configured commands. Functional divergence from .claude.
- Error parsing and edge cases
  - src adds explicit handling for timeouts (`ETIMEDOUT` → block with timeout message) and `ENOENT` (skip validation for new files written via Write). These behaviors did not exist in .claude.
- Output channel
  - .claude: issues via `hookSpecificOutput.additionalContext`.
  - src: issues via `systemMessage` and `decision: 'block'`.

## Pre-Compact (pre_compact → pre-compact)
- Execution model
  - .claude: Bun script processes stdin; outputs `{success,message}` and exits.
  - src: `preCompactHook(input)` returns `{ continue: true, success, message }`.
- Error sequence detection
  - Logic is equivalent (string/object tool results, message `tool_result`, max 5 subsequent attempts). Heuristics include terms like “error/failed/not found/permission denied/update/version”.
- Claude analysis + learned_mistakes
  - Behavior preserved: batch prompt → Sonnet, parse list, merge with existing `.claude/learned_mistakes.md` under “## Error Patterns”. DI added for exec/fs.
- Failure modes
  - Both return success=false messages when transcript missing or read errors. src reports via return value (no process exit).

## Post-Compact (post_compact → post-compact)
- Execution model
  - .claude: Bun script; exits.
  - src: `postCompactHook(input, deps)` returns output object.
- Trigger gating
  - Behavior preserved: runs only when `source === 'compact'`.
- Context gathering and instructions
  - Behavior preserved: reads `CLAUDE.md`, aggregates `@.claude/*` imports, embeds as fenced markdown, builds same instruction set, and returns both `systemMessage` and `hookSpecificOutput`.

## Stop Review (stop_review → stop-review)
- Execution model
  - .claude: Bun script; exits.
  - src: `stopReviewHook(input, deps)` with testable `SessionReviewer`, `isGitRepository`, `hasUncommittedChanges`, and `generateStopOutput` helpers.
- Diff handling and review
  - Behavior preserved: filters out documentation paths, handles doc‑only changes, limits diff size, builds structured prompt, invokes Sonnet (120s timeout), unwraps CLI JSON, and maps statuses to actions.
- Commit flow and suggestions
  - Behavior preserved: commits when `commitMessage` present; if consecutive recent non‑task commits ≥2, appends suggestion about planning mode. In stop-hook recursion (`stop_hook_active`), always allows stop but shows review.
- Logging/DI
  - src centralizes logging and allows exec/fs injection; otherwise same visible outcomes.

## Summary of Notable Functional Changes
- Edit Validation now blocks edits on validation failures instead of only annotating context.
- Edit Validation hook’s command invocation diverges: `.claude` honored configured commands; `src` main path currently hardcodes `npx` calls (config-aware helpers exist but aren’t used in the hook loop).
- All hooks now return structured values instead of exiting processes; behavior for end users is equivalent in the orchestrated environment but integration points differ (use returned `HookOutput`).
- Diagnostic noise reduced (no ad-hoc writes to `/tmp`), with more consistent logging and DI for stability and testability.

If you want parity with the original non-blocking edit validation and config-resolved commands, we can:
- Switch `editValidationHook` to use `loadEditValidationConfig` + `validateFiles` (config‑aware) and return `continue: true` + `hookSpecificOutput` instead of blocking, or make behavior configurable via `hooks.edit_validation.block_on_errors`.
