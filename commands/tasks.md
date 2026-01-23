---
description: Generate phase-based TDD breakdown with subagent orchestration
---

# Task Generation (Phase-Based TDD Orchestration)

**Goal**: Convert technical plan into phases, where each phase is a testable chunk of functionality executed by specialized subagents in TDD order.

**Core Principle**: Each phase follows the TDD cycle: Stub → Tests (fail) → Implement (pass) → Validate. Phases can run in parallel when independent. Non-testable phases require explicit TDD Waiver approval.

---

## Prerequisites Check

**Find active spec directory**:
- Read `CLAUDE.md`
- Find line starting with `## Active Task`
- Extract the `@.cc-track/specs/NNN-feature-name/spec.md` path
- Parse out the directory: `.cc-track/specs/NNN-feature-name`

**Read design files**:
- Read `.cc-track/specs/NNN-feature-name/spec.md` (requirements)
- Read `.cc-track/specs/NNN-feature-name/plan.md` (technical design)
- Read `.cc-track/specs/NNN-feature-name/data-model.md` (if exists)
- List `.cc-track/specs/NNN-feature-name/contracts/` (if exists)

**Verify**:
- [ ] spec.md exists with clear requirements
- [ ] plan.md exists and complete
- [ ] Tech stack defined

**If prerequisites missing**:
```
❌ Cannot generate tasks without complete specification and plan.

Missing: [what's missing]
Run `/cc-track:specify` or `/cc-track:plan` first.
```

---

## Step 1: Identify Testable Functionality Chunks

Break the feature into **phases** where each phase:
- Represents a testable piece of functionality
- Can have tests written that verify it works
- Is small enough for focused implementation
- Is large enough to be meaningful (not single-function granularity)

**Good phase granularity**:
- "Email validation module" (validateEmail, isDisposableEmail)
- "User authentication service" (login, logout, validateSession)
- "API endpoint for user creation" (POST /users with validation)

**Too granular** (avoid):
- "Implement validateEmail function"
- "Add null check to login"

**Too broad** (avoid):
- "Implement entire user system"
- "Build all API endpoints"

### Identify Dependencies

For each phase, determine:
- Does it depend on other phases completing first?
- Can it run in parallel with other phases?

Mark phases `[P]` when they:
- ✅ Work on different files/modules
- ✅ Have no data dependencies on other phases
- ✅ Can be implemented independently

Do NOT mark `[P]` when:
- ❌ Phase B imports from Phase A's output
- ❌ Phases modify the same files
- ❌ Integration requires sequential completion

### Identify Non-Testable Phases (TDD Waivers)

Some phases are not suitable for TDD because they don't involve testable code:

**Valid waiver reasons:**
- Markdown/documentation files only
- Configuration files (JSON, YAML, etc.)
- Non-functional refactoring (moving files, renaming, restructuring)
- Template/prompt files
- Static assets

**NOT valid waiver reasons:**
- "Tests are hard to write" - find a way
- "It's just a small change" - small changes need tests too
- "We'll add tests later" - no, TDD means tests first

For phases requiring a waiver, mark them `[TDD WAIVER REQUESTED]` in the initial tasks.md draft.

---

## Step 2: Generate tasks.md

Read template from `${CLAUDE_PLUGIN_ROOT}/templates/tasks-template.md` as the base structure.

### Structure

```markdown
# Tasks: [Feature Name]

**Feature ID**: `[task_id]`
**Branch**: `[branch]`
**Prerequisites**: plan.md, spec.md
**Orchestration**: Phase-based TDD with specialized subagents

## Orchestration Model

Each phase is executed by four specialized subagents in sequence:
1. **Stub Writer** → Creates minimal exports so imports resolve
2. **Test Writer** → Writes failing tests, runs them, reports output
3. **Implementer** → Makes tests pass, runs them, reports output
4. **Validator** → Verifies requirements met, runs tests independently

The orchestrator (you) coordinates these agents, reviews their output, and handles any escalations.

---

## Phase 1: [Phase Name]

**Requirement**: [What this phase accomplishes - reference spec.md]
**Files**: [List of files this phase creates/modifies]

### Steps:
1. [ ] **Stub**: Create exports in [files] so imports resolve
2. [ ] **Tests**: Write failing tests in [test files]
3. [ ] **Implement**: Make tests pass in [implementation files]
4. [ ] **Validate**: Verify requirements met

---

## Phase 2: [Phase Name] [P]

(Mark [P] if can run parallel with Phase 1)

**Requirement**: [What this phase accomplishes]
**Files**: [List of files]

### Steps:
1. [ ] **Stub**: ...
2. [ ] **Tests**: ...
3. [ ] **Implement**: ...
4. [ ] **Validate**: ...

---

## Phase 3: [Phase Name] [TDD WAIVER REQUESTED]

**Requirement**: [What this phase accomplishes]
**Files**: [List of non-code files]
**Waiver Reason**: [Why TDD doesn't apply - e.g., "Markdown documentation only"]

### Steps:
1. ~~**Stub**~~: N/A - no code exports
2. ~~**Tests**~~: N/A - no testable behavior
3. [ ] **Implement**: Create/modify [files]
4. [ ] **Validate**: Review implementation meets requirements

---

## Status Checkpoints

Checkpoints pause for user approval before continuing.

- [ ] **Checkpoint A**: After Phases 1-3 complete
- [ ] **Checkpoint B**: After Phases 4-6 complete
- [ ] **Final**: All phases complete, ready for /cc-track:prepare-completion

---

## Dependencies

```
Phase 1 ──┐
Phase 2 [P]├──→ Phase 5 ──→ Phase 7
Phase 3 [P]├──→ Phase 6 ──┘
Phase 4 ──┘
```

- Phases 1-4 must complete before Phase 5-6
- Phase 2 and 3 can run in parallel
- Phase 5 and 6 must complete before Phase 7

---

## Orchestration Instructions

When the user approves this task breakdown and says to begin implementation:

### Real-Time Task Coordination (Native Task System)

Use Claude Code's native task system (`TaskCreate`, `TaskUpdate`, `TaskList`) for **real-time coordination** during the session. The markdown `tasks.md` file remains the **persistent record**.

**Two-layer approach:**
- **Native tasks** = Session coordination layer (tracks what's happening NOW)
- **Markdown tasks.md** = Persistent record (survives compactions, documents history)

**At the start of each phase set:**
1. Create native tasks for each step with proper dependencies:
   ```
   TaskCreate: "P1: Stub" (description: files, exports needed)
   TaskCreate: "P1: Tests" (description: test requirements)
   TaskCreate: "P1: Implement" (description: make tests pass)
   TaskCreate: "P1: Validate" (description: verify requirements)

   TaskUpdate: "P1: Tests" addBlockedBy: ["P1: Stub"]
   TaskUpdate: "P1: Implement" addBlockedBy: ["P1: Tests"]
   TaskUpdate: "P1: Validate" addBlockedBy: ["P1: Implement"]
   ```

2. For parallel phases, create all tasks upfront with cross-phase dependencies:
   ```
   # Phase 2 and 3 can run in parallel, but each has internal TDD order
   TaskUpdate: "P2: Tests" addBlockedBy: ["P2: Stub"]
   TaskUpdate: "P3: Tests" addBlockedBy: ["P3: Stub"]
   # Phase 4 depends on Phase 2 completing
   TaskUpdate: "P4: Stub" addBlockedBy: ["P2: Validate"]
   ```

**During execution:**
- `TaskUpdate` status to `in_progress` when dispatching a subagent
- `TaskUpdate` status to `completed` when subagent returns successfully
- Use `TaskList` to see what's unblocked and ready to dispatch

**After each phase (and at checkpoints):**
- Sync native task completion back to markdown checkboxes in `tasks.md`
- This ensures the persistent record is updated for context compaction

**Why this matters:**
- Native `blockedBy` enforces TDD order automatically (can't start Tests until Stub completes)
- `TaskList` shows exactly what's ready to dispatch vs. blocked
- Status visible in Claude Code's UI
- Markdown update at checkpoints preserves state across sessions

### For Sequential Phases

Dispatch subagents one at a time in TDD order:

1. **Stub Writer**:
   ```
   TaskUpdate: "PN: Stub" status: in_progress
   Task tool with subagent_type: stub-writer
   Prompt: "Phase N: [Phase Name]. Create stubs for [files] with exports: [list exports needed]"
   ```
   → On success: `TaskUpdate: "PN: Stub" status: completed`

2. **Test Writer** (after stub complete):
   ```
   TaskUpdate: "PN: Tests" status: in_progress
   Task tool with subagent_type: test-generation
   Prompt: "Phase N: [Phase Name]. Write tests for [requirements]. Test files: [paths]. Run tests and report output."
   ```
   → On success: `TaskUpdate: "PN: Tests" status: completed`

3. **Implementer** (after tests written and failing):
   ```
   TaskUpdate: "PN: Implement" status: in_progress
   Task tool with subagent_type: implementer
   Prompt: "Phase N: [Phase Name]. Make tests pass. Implementation files: [paths]. Run tests and report output."
   ```
   → On success: `TaskUpdate: "PN: Implement" status: completed`

4. **Validator** (after implementation):
   ```
   TaskUpdate: "PN: Validate" status: in_progress
   Task tool with subagent_type: validator
   Prompt: "Phase N: [Phase Name]. Verify: [requirements from spec]. Run tests independently. Report pass/fail."
   ```
   → On success: `TaskUpdate: "PN: Validate" status: completed`

**After each phase completes**: Update tasks.md checkboxes to sync the persistent record. This ensures state is preserved across context compactions.

### For Parallel Phases and Dependency Enforcement

**Create all native tasks upfront** with `blockedBy` relationships:
```
# All stubs can start immediately (no blockers)
TaskCreate: "P2: Stub", "P3: Stub", "P4: Stub"

# Tests blocked by their phase's stub
TaskUpdate: "P2: Tests" addBlockedBy: ["P2: Stub"]
TaskUpdate: "P3: Tests" addBlockedBy: ["P3: Stub"]

# Implement blocked by tests, Validate blocked by implement
# (repeat pattern for each phase)
```

**Use `TaskList`** to see what's unblocked and ready to dispatch. The native system enforces dependencies automatically - you can't accidentally start Tests before Stub completes.

**Pipeline flow**: As each step completes, its dependents become unblocked. Dispatch newly-unblocked tasks immediately for maximum parallelism.

See `${CLAUDE_PLUGIN_ROOT}/templates/tasks-template.md` for additional orchestration patterns (polling fallback, dependency diagrams). These are included in the generated tasks.md.

### For Waived Phases

Phases marked `[TDD WAIVER APPROVED]` skip Stub and Tests steps:

1. **Implementer** (directly):
   ```
   Task tool with subagent_type: implementer
   Prompt: "Phase N: [Phase Name] [TDD WAIVER]. Implement [requirements]. Files: [paths].
   Note: This phase has a TDD waiver - no stub or tests. If this is a refactor, run existing tests to ensure nothing breaks. Report results."
   ```
   → On success: Check off "Implement" checkbox

2. **Validator**:
   ```
   Task tool with subagent_type: validator
   Prompt: "Phase N: [Phase Name] [TDD WAIVER]. Verify: [requirements].
   For refactors: Run tests to confirm nothing broke.
   For non-code: Review that implementation meets requirements.
   Report pass/fail."
   ```
   → On success: Check off "Validate" checkbox

### At Checkpoints

When reaching a checkpoint:

1. Summarize progress:
   ```
   Checkpoint A reached.

   Completed:
   - Phase 1: ✅ Email validation (all tests passing)
   - Phase 2: ✅ Password validation (all tests passing)
   - Phase 3: ✅ User model (all tests passing)

   Next: Phases 4-6 (Authentication service)

   Continue?
   ```

2. Wait for user approval before proceeding.

### On Complications

If a subagent reports an issue it cannot resolve:

1. **Stop** delegating new tasks immediately
2. **Wait** for any in-flight background agents to complete
3. **Update** this tasks.md with current status
4. **Raise** the issue with the user:
   ```
   Complication in Phase 3 (Implementer):

   Issue: Tests expect database injection but stub has no parameter for it.
   Subagent recommendation: Add db parameter to UserService constructor.

   Options:
   A) Have stub writer add the parameter, re-run test writer
   B) Modify approach - use singleton database connection
   C) Your guidance needed
   ```

---

## Validation Checklist

Before presenting to user:

- [ ] Each phase represents testable functionality (not too granular, not too broad)
- [ ] Every phase has all 4 steps (Stub, Tests, Implement, Validate)
- [ ] Parallel phases [P] are truly independent
- [ ] Dependencies are clearly documented
- [ ] Checkpoints placed at reasonable intervals
- [ ] Orchestration instructions are complete
- [ ] File paths are specific
```

---

## Step 3: Checkpoint Placement

Place checkpoints based on feature scope:

**Small feature (3-5 phases)**:
- One checkpoint after all phases, before final validation

**Medium feature (6-10 phases)**:
- Checkpoint every 3-4 phases
- Final checkpoint before completion

**Large feature (10+ phases)**:
- Checkpoint every 3-4 phases
- Consider breaking into multiple features

**Checkpoint purposes**:
- Allow user to review progress
- Catch issues before too much work proceeds
- Natural pause points for context management

---

## Step 4: Validation

Before presenting tasks.md:

### TDD Structure Check
- Every phase has Stub → Tests → Implement → Validate order
- No phase skips the test step
- Implementation never comes before tests

### Parallel Safety Check
- Phases marked [P] modify different files
- No data dependencies between parallel phases
- Parallel phases don't import from each other

### Completeness Check
- All requirements from spec.md have corresponding phases
- All entities from data-model.md have implementation phases
- All endpoints from contracts/ have implementation phases

### Orchestration Check
- Instructions are clear for sequential execution
- Instructions are clear for parallel execution
- Escalation path is documented

---

## Step 5: Presentation & Approval

### If TDD Waivers Requested

Present waiver requests FIRST, before implementation begins:

```
Phase-based task breakdown complete! 📋

Generated: [N] phases

⚠️ TDD WAIVER REQUESTS

The following phases are marked for TDD waiver:

Phase 3: Agent Definition Updates [TDD WAIVER REQUESTED]
- Files: agents/stub-writer.md, agents/implementer.md
- Reason: Markdown prompt files only - no testable code
- Waiver effect: Skip Stub and Tests steps, Implementer creates files, Validator reviews

Phase 7: Template Updates [TDD WAIVER REQUESTED]
- Files: templates/tasks-template.md
- Reason: Markdown template - no testable behavior
- Waiver effect: Skip Stub and Tests steps, Implementer creates files, Validator reviews

Do you approve these waivers? (yes/no/discuss)
```

**On waiver approval**: Update tasks.md to change `[TDD WAIVER REQUESTED]` → `[TDD WAIVER APPROVED]`

**On waiver rejection**: Discuss with user how to make the phase testable, or remove it from scope.

### After Waivers Resolved

```
Phase-based task breakdown complete! 📋

Generated: [N] phases
- Phases 1-3: Core validation modules [P]
- Phases 4-5: Authentication service
- Phase 6: API endpoints
- Phase 7: Template updates [TDD WAIVER APPROVED]

Checkpoints: 2 (after Phase 3, after Phase 6)
Parallel opportunities: Phases 1-3 can run concurrently
TDD Waivers: 1 approved (Phase 7)

Orchestration model:
- Each phase: Stub → Tests → Implement → Validate
- Waived phases: Implement → Validate only
- Subagents: stub-writer, test-generation, implementer, validator
- You coordinate, review output, handle escalations

Created: .cc-track/specs/[ID]-[name]/tasks.md

Ready to begin orchestrated implementation?
```

**Wait for user approval before implementing.**

---

## Next Step

After `/cc-track:tasks` approved:
- **User says yes**: Begin orchestrated implementation starting with Phase 1
- **User defers**: tasks.md saved, they can start anytime
- **User requests changes**: Revise tasks.md and re-present

When implementation begins, follow the Orchestration Instructions in tasks.md exactly.
