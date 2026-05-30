# Brainstorm: Folding Dynamic Workflows into cc-track's TDD Orchestration

**Date:** 2026-05-30
**Status:** Design exploration — no implementation yet. Test spike to be done later in Desktop mode (workflows need v2.1.154+ and the feature enabled).
**Companion:** `docs/research/claude-code-dynamic-workflows.md` (the factual findings + sources).

## TL;DR

cc-track's `/cc-track:tasks` is already a subagent-orchestration engine: the main session is an orchestrator that delegates every implementation step to specialized Haiku subagents in a fixed 4-stage TDD cycle (stub-writer → test-generation → implementer → validator), coordinating them via the native task system (`TaskCreate`/`TaskUpdate`/`blockedBy`) and persisting state to `tasks.md`. Anthropic's new **dynamic workflows** solve the *same* problem one layer down: they move the orchestration plan into a **script** so intermediate results live in **script variables instead of the orchestrator's context window**.

**Plan:** push the fan-out-heavy, context-hungry execution into saved workflow scripts, while keeping the conversational orchestrator as the spec-driven, checkpoint-gating, escalation-handling **shell**. This converts cc-track's current *instruction-dependent* context hygiene ("dispatch, post status, STOP, don't poll `TaskOutput`") into *runtime-enforced* behavior, and collapses N intermediate agent transcripts into a single returned result.

## Why this is a good fit (and not redundant)

cc-track and dynamic workflows are **complementary**, not overlapping:

- Workflows are the *better mechanism* for the part of cc-track that fights context overflow during parallel work — they make the hand-built "STOP and wait to be woken" pattern structural.
- cc-track's own contributions — **spec-first separation of concerns, checkpoint gating, and tool-restriction-enforced TDD** — are things workflows don't provide and could even undercut if integrated carelessly.

The relevant `tasks.md` instruction we're replacing the manual version of:

> "Do NOT call TaskOutput to watch or poll subagents — this dumps their entire working context into the orchestrator's context window, causing rapid context overflow… dispatch all unblocked tasks, post a status message, and STOP."

That is exactly what a workflow runtime does for free.

## Where it lands, by component

### 1. Code review / `prepare-completion` — lowest risk, highest value, start here

The review fleet (`bug-scanner`, `dead-code-detector`, `duplication-detector`, `guidelines-reviewer`, `spec-compliance-reviewer`, `plan-adherence-reviewer`, `task-completion-reviewer`) + `issue-scorer` is **structurally identical to `/deep-research`**: fan out independent reviewers → cross-check/score findings → filter → return one report. It's **read-mostly**, so the `acceptEdits` / tool-narrowing concerns below don't apply. This is the natural pilot.

### 2. The 4-stage TDD cycle — the main event

Encode stub → test → implement → validate as the workflow's per-phase loop. Parallelize by expressing the checkpoint group's dependency DAG in the script (independent phases run concurrently; the 4 stages stay sequential within each phase, enforced by code rather than `blockedBy` juggling in the orchestrator).

**Do NOT bundle the whole implementation into one workflow.** Part of cc-track's value is the orchestrator in oversight. Workflows also have a hard constraint that forces this boundary anyway:

> "No mid-run user input. Only agent permission prompts can pause a run. **For sign-off between stages, run each stage as its own workflow.**"

So checkpoints become *boundaries between workflow runs*, which maps cleanly onto cc-track's existing checkpoint structure.

## The granularity dial (the key design decision)

The workflow unit can be a **single phase** or a **whole checkpoint group**. This is a real tradeoff worth deciding deliberately:

| | Phase-granularity workflow | Checkpoint-group workflow (**recommended default**) |
|---|---|---|
| Orchestrator applies judgment | Between every phase | At checkpoints only |
| Context cost on orchestrator | Higher — holds each phase result + coordinates cross-phase DAG | Lowest — entire parallel DAG + all intermediate chatter stay in script vars; orchestrator gets one group summary |
| Round-trips | One per phase | One per checkpoint group |
| Oversight | In the conversation transcript | **Relocated**, not lost: live monitoring via `/workflows` progress view; phase failure aborts run → surfaces to orchestrator for escalation |
| Maps to existing artifact | n/a | The `tasks.md` dependency diagram **is** the orchestration script |

cc-track's `tasks.md` already draws the group DAG, e.g.:

```
Phase 1 ──┐
Phase 2 [P]├──→ Phase 5 ──→ Phase 7
Phase 3 [P]├──→ Phase 6 ──┘
Phase 4 ──┘
```

That diagram is, effectively, the workflow. **Recommendation: checkpoint-group granularity by default** (maximizes the context win and matches the natural human-approval boundary), dropping to **phase-granularity for high-risk groups** where a judgment beat between phases is worth the extra round-trips/context.

## The one real risk: tool-restriction enforcement

cc-track's TDD guarantee is not the *ordering* (a script encodes that trivially) — it's the **tool-restriction role separation**: the test-writer literally cannot write production code, the implementer cannot edit tests, the validator is read-only. Whether a workflow script can spawn a `subagent_type` constrained to its **narrowed** `tools` allowlist (vs. only inheriting the broad session allowlist) is **not explicitly documented**. → **Spike item #1.**

**Why it's less load-bearing than it sounds:** once orchestration is *code*, the script deterministically controls which agent runs at which stage, with what prompt, over which files. The tool restriction drops from "the load-bearing wall" to "defense in depth," and the **validator stage is the real backstop** (it independently re-runs tests and checks they're meaningful). Even in the worst case where narrowing isn't honored, the structural TDD *ordering* survives; we'd lose belt-and-suspenders, not the guarantee.

**Fallback if narrowing isn't supported:** keep the TDD inner loop on the current native-task orchestration (where tool restrictions hold) and use workflows only for the parallel/review layers.

## Distribution / bundling

Plugins **cannot** bundle workflows as a component (confirmed — see research doc). Two viable paths:

- **Bootstrap (research-preview phase):** orchestration instructions say "create a workflow to do xyz" + provide sample code. Flexible, but Claude *re-authors* per run → nondeterministic, costs authoring tokens, can drift.
- **Steady state (recommended for the fixed-shape TDD cycle):** author once → vet via `View raw script` → **commit to `.claude/workflows/`**, or have `/cc-track:setup` write it there at init (same mechanism it uses for templates). Deterministic, rerunnable, no regeneration cost — the "orchestration codified" win. The TDD cycle is the ideal codification candidate precisely because it's the *same shape every phase*; only the files/requirements change as inputs (saved workflows run as `/<name>` and take a prompt argument, the way `/deep-research` takes a question).

## Open questions for the Desktop spike

1. **[Blocking] Custom subagent + tool narrowing:** Can a workflow script spawn `subagent_type: implementer` (etc.) with the definition's restricted `tools` honored, or only the session allowlist? (`View raw script` / `Ctrl+G` to inspect what Claude actually generates.)
2. **Parameterized saved workflows:** Can a saved `.claude/workflows/` workflow take the phase/group spec as a prompt argument and read it inside the script? (Assumed yes, by analogy to `/deep-research <question>` — confirm.)
3. **Per-stage model routing:** Confirm the script can pin stub/test/impl/validate stages to Haiku while the session runs Opus (docs say per-stage routing is supported — verify the ergonomics).
4. **Failure → escalation ergonomics:** When a stage fails (e.g. implementer can't go green), how does the run surface back? Confirm "abort + return to orchestrator for escalation" is clean and that completed phases' work persists (resume semantics).
5. **Concurrency math:** With checkpoint-group granularity, confirm the group's max simultaneous agents stays under the 16-concurrent cap (stages are sequential within a phase, so it's ≈ number of parallel `[P]` phases at a given stage — should be comfortable).
6. **Cost delta:** Measure tokens for one representative checkpoint group via workflow vs. the current native-task orchestration, to confirm the expected savings (1 returned result vs. 4×N intermediate transcripts) actually materialize.
7. **Permissions on long runs:** Pre-add the test/shell commands the Haiku agents need to the allowlist so non-allowlisted calls don't prompt mid-run.

## Proposed sequencing

1. **Spike** the blocking question (#1) on a throwaay task in Desktop. Inspect the generated script.
2. **Pilot** the review workflow (`/cc-track:review`-style) — lowest risk, proves the integration + the save-to-`.claude/workflows/` distribution path.
3. **If #1 passes:** build the checkpoint-group TDD workflow; wire `/cc-track:tasks` orchestration instructions to launch it per group and gate at checkpoints. **If #1 fails:** keep TDD inner loop as-is, ship only the review workflow.
4. Decide bootstrap-generate vs. committed-script based on how stable the generated script shape is during research preview.

## Straw-man script

See `docs/brainstorm/tdd-phase-workflow.draft.md` for a concrete (non-functional, illustrative) sketch of the checkpoint-group TDD workflow to react to during the spike — stage loop, parallel-phase fan-out matching the DAG, per-stage Haiku routing, and abort-and-surface escalation.
