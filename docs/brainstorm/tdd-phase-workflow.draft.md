# Straw-man: checkpoint-group TDD workflow (DRAFT)

**STRAW-MAN DRAFT — NOT FUNCTIONAL. DO NOT COPY TO `.claude/workflows/` YET.**

Illustrative sketch of a cc-track checkpoint-group TDD workflow, to react to during the Desktop spike. See `docs/brainstorm/dynamic-workflows-tdd-orchestration.md`.

> ⚠️ **API SHAPE IS INVENTED.** The dynamic-workflows *script API* (how you spawn an agent, target a `subagent_type`, set its model, read its result) is **not** in the public docs as of 2026-05-30 — only the runtime *behavior* is documented. **Spike step 1:** have Claude generate a real workflow, open it with `View raw script` / `Ctrl+G`, and replace the assumed primitives below (`spawn`, `workflow.input`, …) with whatever the runtime actually exposes.

What this sketch demonstrates (the parts that **are** grounded in docs):

- Orchestration plan lives in script variables, not the orchestrator's context.
- The checkpoint group's `[P]` dependency DAG expressed as code.
- 4-stage TDD cycle (stub → test → implement → validate) sequential **within** a phase; independent phases run concurrently (bounded by the 16-agent cap).
- Per-stage model routing to Haiku (docs confirm scripts can route a stage to a different model than the session).
- Each stage spawns cc-track's existing custom `subagent_type` with its narrowed tools allowlist — **the unverified assumption (spike item #1).**
- Failure aborts the phase and surfaces back to the conversational orchestrator for escalation; completed phases' work persists (resumable).

```js
// === INPUT (assumed: saved workflows receive the prompt arg, like /deep-research) ===
// The orchestrator passes the checkpoint group's phase DAG, parsed from tasks.md.
const group = workflow.input; // e.g. { phases: [...], dependencies: {...} }

const HAIKU = "claude-haiku-4-5";

// One TDD stage = spawn a specific cc-track subagent_type with its OWN restricted
// tools. `subagentType` is the lever spike item #1 must confirm actually narrows tools.
async function runStage(phase, { subagentType, instruction }) {
  const result = await spawn({
    subagentType,                 // "stub-writer" | "test-generation" | "implementer" | "validator"
    model: HAIKU,                 // per-stage model routing
    prompt: `Phase: ${phase.name}\nFiles: ${phase.files.join(", ")}\n${instruction}`,
  });
  // Stages that run tests must report output; validator re-runs independently.
  return result; // { ok: boolean, summary: string, testOutput?: string }
}

// One phase = the full sequential TDD cycle. Waived phases skip stub+test.
async function runPhase(phase) {
  try {
    if (!phase.tddWaiver) {
      const stub = await runStage(phase, {
        subagentType: "stub-writer",
        instruction: "Create minimal exports so imports resolve. No logic, no tests.",
      });
      if (!stub.ok) return abort(phase, "stub", stub);

      const tests = await runStage(phase, {
        subagentType: "test-generation",
        instruction: "Write failing tests. Run them. Report output. Do NOT write production code.",
      });
      if (!tests.ok) return abort(phase, "tests", tests);
      // Expect RED here — tests should fail for functional reasons, not import errors.
    }

    const impl = await runStage(phase, {
      subagentType: "implementer",
      instruction: phase.tddWaiver
        ? "Implement requirement. If refactor, run existing tests to confirm nothing breaks."
        : "Write minimum code to make tests pass. Run them. Report output. Do NOT edit tests.",
    });
    if (!impl.ok) return abort(phase, "implement", impl); // e.g. can't go green -> escalate

    const validate = await runStage(phase, {
      subagentType: "validator",       // read-only
      instruction: "Independently re-run tests and verify requirements are met. Report pass/fail.",
    });
    if (!validate.ok) return abort(phase, "validate", validate);

    return { phase: phase.name, ok: true, summary: validate.summary };
  } catch (err) {
    return abort(phase, "exception", { summary: String(err) });
  }
}

// Surface a complication back to the conversational orchestrator. Workflows can't
// take mid-run user input, so we stop this phase and let the orchestrator escalate.
function abort(phase, stage, result) {
  return { phase: phase.name, ok: false, failedStage: stage, detail: result };
}

// === DAG execution: run independent [P] phases concurrently, respecting deps ===
// (Pseudo topological scheduler. Real impl bounds concurrency under the 16-agent cap;
//  within a phase the 4 stages are sequential, so active agents ≈ #parallel phases.)
async function runGroup(group) {
  const done = new Map();
  const ready = () => group.phases.filter(
    (p) => !done.has(p.name) &&
           (group.dependencies[p.name] ?? []).every((d) => done.get(d)?.ok)
  );

  while (done.size < group.phases.length) {
    const batch = ready();
    if (batch.length === 0) break; // blocked by an upstream failure
    const results = await Promise.all(batch.map(runPhase));
    for (const r of results) {
      done.set(r.phase, r);
      if (!r.ok) {
        // First failure: stop scheduling new work, return everything so far.
        return { ok: false, results: [...done.values()] };
      }
    }
  }
  return { ok: done.size === group.phases.length, results: [...done.values()] };
}

// Single consolidated result returns to the orchestrator's context — NOT the
// per-stage transcripts. Orchestrator presents the checkpoint to the user, or
// escalates the failedStage detail.
return await runGroup(group);
```
