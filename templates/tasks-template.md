# Tasks: [FEATURE NAME]

**Feature ID**: `[###]`
**Branch**: `[###-feature-name]`
**Prerequisites**: plan.md, spec.md
**Orchestration**: Phase-based TDD with specialized subagents

---

## Orchestration Model

Each phase is executed by four specialized subagents in TDD sequence:

1. **Stub Writer** → Creates minimal exports so imports resolve
2. **Test Writer** → Writes failing tests, runs them, reports output
3. **Implementer** → Makes tests pass, runs them, reports output
4. **Validator** → Verifies requirements met, runs tests independently

The orchestrator coordinates these agents, reviews their output, updates checkboxes, and handles escalations.

### Execution Rules

- **TDD Order**: Every phase follows Stub → Tests → Implement → Validate
- **Parallel Phases**: Phases marked `[P]` can run concurrently via background agents
- **Checkpoints**: Pause for user approval at designated points
- **Escalation**: Stop new work, settle in-flight agents, then raise issues

---

## Phase 1: [Phase Name]

**Requirement**: [Reference spec.md requirement this phase addresses]
**Files**:
- Implementation: `src/[path]/[file].ts`
- Tests: `src/[path]/[file].test.ts`

### Steps:
1. [ ] **Stub**: Create exports in `src/[path]/[file].ts`
2. [ ] **Tests**: Write failing tests in `src/[path]/[file].test.ts`
3. [ ] **Implement**: Make tests pass
4. [ ] **Validate**: Verify requirements met

---

## Phase 2: [Phase Name] [P]

**Requirement**: [Reference spec.md requirement]
**Files**:
- Implementation: `src/[path]/[file].ts`
- Tests: `src/[path]/[file].test.ts`

### Steps:
1. [ ] **Stub**: Create exports
2. [ ] **Tests**: Write failing tests
3. [ ] **Implement**: Make tests pass
4. [ ] **Validate**: Verify requirements met

---

## Phase 3: [Phase Name] [P]

**Requirement**: [Reference spec.md requirement]
**Files**:
- Implementation: `src/[path]/[file].ts`
- Tests: `src/[path]/[file].test.ts`

### Steps:
1. [ ] **Stub**: Create exports
2. [ ] **Tests**: Write failing tests
3. [ ] **Implement**: Make tests pass
4. [ ] **Validate**: Verify requirements met

---

## Phase 4: [Phase Name] [TDD WAIVER REQUESTED]

**Requirement**: [Reference spec.md requirement]
**Files**: `[path]/[file].md` (or other non-code files)
**Waiver Reason**: [Why TDD doesn't apply - markdown only, config file, etc.]

### Steps:
1. ~~**Stub**~~: N/A - no code exports
2. ~~**Tests**~~: N/A - no testable behavior
3. [ ] **Implement**: Create/modify files
4. [ ] **Validate**: Review implementation meets requirements

*Note: Change to `[TDD WAIVER APPROVED]` after user approves waiver request.*

---

## Status Checkpoints

Checkpoints pause orchestration for user review and approval.

- [ ] **Checkpoint A**: After Phases 1-3 complete
- [ ] **Final**: All phases complete, ready for `/cc-track:prepare-completion`

---

## Dependencies

```
Phase 1 ──────┐
Phase 2 [P] ──┼──→ [Dependent phases]
Phase 3 [P] ──┘
```

Document which phases can run in parallel and which have dependencies.

---

## Orchestration Instructions

### Sequential Phase Execution

For each phase, dispatch subagents in order:

```
1. Task tool: subagent_type=stub-writer
   Prompt: "Phase N: [Name]. Create stubs for [files] with exports: [list]"

2. Task tool: subagent_type=test-generation
   Prompt: "Phase N: [Name]. Write tests for [requirements]. Files: [paths]. Run tests, report output."

3. Task tool: subagent_type=implementer
   Prompt: "Phase N: [Name]. Make tests pass. Files: [paths]. Run tests, report output."

4. Task tool: subagent_type=validator
   Prompt: "Phase N: [Name]. Verify: [requirements]. Run tests independently. Report pass/fail."
```

### Parallel Phase Execution

When multiple phases are marked [P], use **pipeline flow**:

1. **Dispatch** ALL stub writers with `run_in_background: true` in a single message
2. **Post status** to user: "Dispatched stub writers for Phases X, Y, Z."
3. **Orchestration loop**:
   - Do any pending work (check off completed steps, dispatch next agents for completed phases)
   - Process any notifications that arrived while working
   - If no pending work: poll all active agents with `AgentOutputTool(block: false)`
   - If all still running: `Bash(sleep 30)` to idle efficiently, then poll again

This creates true pipeline parallelism - Phase 1's test writer starts as soon as Phase 1's stub finishes, even while other stubs run. Notifications usually arrive promptly, but the 30-second polling fallback catches any that don't.

### Dependency Enforcement

Phases marked with dependencies (e.g., "Phase 4 depends on Phase 2") must wait for the **complete** prerequisite cycle:

- ❌ Wrong: Start Phase 4's stub as soon as Phase 2's implementer finishes
- ✅ Correct: Start Phase 4's stub only after Phase 2's **validator** completes

Dependencies mean the full Stub → Tests → Implement → Validate cycle, not just Implement.

**Best practice**: Analyze actual dependencies (imports, shared state) rather than assuming sequential structure. For independent files (like separate markdown files), maximize parallelism.

### At Checkpoints

1. Summarize completed phases with pass/fail status
2. List upcoming phases
3. Wait for user approval before continuing

### On Complications

1. **Stop** - No new task delegation
2. **Wait** - Let in-flight agents complete
3. **Update** - Mark current status in this file
4. **Raise** - Present issue to user with options

---

## Validation Checklist

*Verify before starting implementation*

- [ ] Each phase has clear requirement reference
- [ ] Each phase has all 4 steps (Stub, Tests, Implement, Validate)
- [ ] Parallel phases `[P]` are truly independent (different files)
- [ ] Dependencies are documented
- [ ] Checkpoints placed at reasonable intervals
- [ ] File paths are specific

---

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 1     | ⏳ Pending | |
| 2     | ⏳ Pending | |
| 3     | ⏳ Pending | |

**Status Legend**: ⏳ Pending | 🔄 In Progress | ✅ Complete | ❌ Blocked

---

## Notes

*Updated during implementation*

