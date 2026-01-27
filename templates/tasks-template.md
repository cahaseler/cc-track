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

### Real-Time Coordination (Native Task System)

Use Claude Code's native task tools for **real-time coordination** during the session:

- **Native tasks** (`TaskCreate`, `TaskUpdate`, `TaskList`) = Session coordination layer
- **This markdown file** = Persistent record (survives compactions)

**Workflow:**
1. At phase set start: Create native tasks with `blockedBy` dependencies
2. During execution: `TaskUpdate` status as subagents dispatch/complete
3. Use `TaskList` to see what's unblocked and ready
4. After each phase: Sync completed tasks back to markdown checkboxes

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

### Setup: Create Native Tasks

Before starting implementation, create native tasks for all steps with dependencies:

```
# Create all tasks for Phase 1
TaskCreate: subject="P1: Stub", description="Create exports for [files]"
TaskCreate: subject="P1: Tests", description="Write failing tests"
TaskCreate: subject="P1: Implement", description="Make tests pass"
TaskCreate: subject="P1: Validate", description="Verify requirements"

# Set up TDD dependency chain
TaskUpdate: "P1: Tests" addBlockedBy: ["P1: Stub"]
TaskUpdate: "P1: Implement" addBlockedBy: ["P1: Tests"]
TaskUpdate: "P1: Validate" addBlockedBy: ["P1: Implement"]

# For parallel phases, add cross-phase dependencies as needed
TaskUpdate: "P4: Stub" addBlockedBy: ["P2: Validate"]  # P4 depends on P2
```

### Sequential Phase Execution

For each phase, use `TaskList` to find unblocked tasks, then dispatch:

```
1. TaskUpdate: "P1: Stub" status: in_progress
   Task tool: subagent_type=stub-writer
   Prompt: "Phase 1: [Name]. Create stubs for [files] with exports: [list]"
   → On success: TaskUpdate: "P1: Stub" status: completed

2. TaskUpdate: "P1: Tests" status: in_progress
   Task tool: subagent_type=test-generation
   Prompt: "Phase 1: [Name]. Write tests for [requirements]. Files: [paths]. Run tests, report output."
   → On success: TaskUpdate: "P1: Tests" status: completed

3. TaskUpdate: "P1: Implement" status: in_progress
   Task tool: subagent_type=implementer
   Prompt: "Phase 1: [Name]. Make tests pass. Files: [paths]. Run tests, report output."
   → On success: TaskUpdate: "P1: Implement" status: completed

4. TaskUpdate: "P1: Validate" status: in_progress
   Task tool: subagent_type=validator
   Prompt: "Phase 1: [Name]. Verify: [requirements]. Run tests independently. Report pass/fail."
   → On success: TaskUpdate: "P1: Validate" status: completed
```

### Parallel Phase Execution

When multiple phases are marked [P], use **pipeline flow** with native task coordination:

1. **Create all native tasks upfront** with `blockedBy` dependencies (see Setup above)
2. **Use `TaskList`** to see all unblocked tasks ready to dispatch
3. **Dispatch** all unblocked stub writers in a single message
4. **Post status** to user: "Dispatched stub writers for Phases X, Y, Z. Waiting for task completion."
5. **STOP and wait** - Do NOT call TaskOutput or poll agents. When a subagent completes, the system will wake you automatically with its results. At that point:
   - `TaskUpdate` the completed step's status to completed
   - `TaskList` to find newly unblocked tasks (e.g., Tests for completed Stubs)
   - Dispatch any newly unblocked tasks, `TaskUpdate` their status to in_progress
   - Post another status message and wait again if tasks remain

**CRITICAL**: Never use TaskOutput to watch subagent progress. This dumps the subagent's entire working context into the orchestrator's context window, causing rapid context overflow. The notification system handles completion automatically.

### Dependency Enforcement

Phases marked with dependencies (e.g., "Phase 4 depends on Phase 2") must wait for the **complete** prerequisite cycle:

- ❌ Wrong: Start Phase 4's stub as soon as Phase 2's implementer finishes
- ✅ Correct: Start Phase 4's stub only after Phase 2's **validator** completes

Dependencies mean the full Stub → Tests → Implement → Validate cycle, not just Implement.

**Best practice**: Analyze actual dependencies (imports, shared state) rather than assuming sequential structure. For independent files (like separate markdown files), maximize parallelism.

### At Checkpoints

1. **Sync to markdown**: Update all checkboxes in this file to match native task completion
2. Summarize completed phases with pass/fail status
3. List upcoming phases
4. Wait for user approval before continuing

*The markdown sync ensures progress is preserved across context compactions.*

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

