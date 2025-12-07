# Tasks: Apply Task 111 Orchestration Lessons

**Feature ID**: `112`
**Branch**: `112-apply-task-111-orchestration-lessons`
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
- **Parallel Phases**: Phases marked `[P]` can run concurrently (NOT backgrounded - use foreground parallel)
- **Checkpoints**: Pause for user approval at designated points
- **Escalation**: Stop new work, settle in-flight agents, then raise issues

---

## Phase 1: Update specify.md Command [TDD WAIVER APPROVED] [P]

**Requirement**: FR-001 - Task title approval tweak
**Files**: `commands/specify.md`
**Waiver Reason**: Markdown command file - no testable code behavior

### Change:
Update Step 1, point 1 from:
```
1. **Get task title**: Use from user's request. If unclear, ask ONE clarifying question.
```
To:
```
1. **Get task title**: Use from user's request and proceed to create infrastructure. Only ask for clarification if the title is genuinely unclear - do not ask for approval of the title itself.
```

### Steps:
1. ~~**Stub**~~: N/A - no code exports
2. ~~**Tests**~~: N/A - no testable behavior
3. [ ] **Implement**: Apply text change to `commands/specify.md`
4. [ ] **Validate**: Verify Step 1 instructions are updated correctly

---

## Phase 2: Update prepare-completion.md Command [TDD WAIVER APPROVED] [P]

**Requirement**: FR-002 - Non-background agent execution
**Files**: `commands/prepare-completion.md`
**Waiver Reason**: Markdown command file - no testable code behavior

### Change:
After the existing "IMPORTANT" note in Step 4, add:
```markdown
**Execution mode:** Use **foreground parallel** (do NOT use `run_in_background: true`):
- Launch all 8 agents in a single message without the `run_in_background` parameter
- Orchestrator suspends until ALL agents complete
- All results return together in the response
- Deduplication in Step 5 has access to all findings at once

This is different from the pipeline pattern in `/cc-track:tasks` - here we need ALL results before proceeding to deduplication, so foreground parallel is correct.
```

### Steps:
1. ~~**Stub**~~: N/A - no code exports
2. ~~**Tests**~~: N/A - no testable behavior
3. [ ] **Implement**: Add execution mode note to `commands/prepare-completion.md`
4. [ ] **Validate**: Verify new note appears after IMPORTANT note in Step 4

---

## Phase 3: Update tasks.md Command [TDD WAIVER APPROVED] [P]

**Requirement**: FR-003, FR-004 - Pipeline flow pattern and dependency enforcement
**Files**: `commands/tasks.md`
**Waiver Reason**: Markdown command file - no testable code behavior

### Changes:

**3a. Replace "For Parallel Phases" subsection** with pipeline flow with polling fallback:
```markdown
### For Parallel Phases

When multiple phases are marked [P], use **pipeline flow**:

1. **Dispatch** ALL stub writers with `run_in_background: true` in a single message
2. **Post status** to user: "Dispatched stub writers for Phases 2, 3, 4."
3. **Orchestration loop**:
   - Do any pending work (check off completed steps, dispatch next agents for completed phases)
   - Process any notifications that arrived while working
   - If no pending work: poll all active agents with `AgentOutputTool(block: false)`
   - If all still running: `Bash(sleep 30)` to idle efficiently, then poll again

This creates true pipeline parallelism - Phase 1's test writer starts as soon as Phase 1's stub finishes, even while other stubs run. Notifications usually arrive promptly, but the 30-second polling fallback catches any that don't.
```

**3b. Add new "Dependency Enforcement" subsection** after "For Parallel Phases":
```markdown
### Dependency Enforcement

Phases marked with dependencies (e.g., "Phase 4 depends on Phase 2") must wait for the **complete** prerequisite cycle:

- ❌ Wrong: Start Phase 4's stub as soon as Phase 2's implementer finishes
- ✅ Correct: Start Phase 4's stub only after Phase 2's **validator** completes

Dependencies mean the full Stub → Tests → Implement → Validate cycle, not just Implement.

**Best practice**: Analyze actual dependencies (imports, shared state) rather than assuming sequential structure. For independent files (like separate markdown files), maximize parallelism.
```

### Steps:
1. ~~**Stub**~~: N/A - no code exports
2. ~~**Tests**~~: N/A - no testable behavior
3. [ ] **Implement**: Replace "For Parallel Phases" and add "Dependency Enforcement" to `commands/tasks.md`
4. [ ] **Validate**: Verify both sections updated correctly

---

## Phase 4: Update tasks-template.md [TDD WAIVER APPROVED] [P]

**Requirement**: FR-005 - Remove redundant phase counter
**Files**: `templates/tasks-template.md`
**Waiver Reason**: Markdown template file - no testable code behavior

### Change:
Remove the `**Completed Phases**: 0/[N]` line from the "Phase Progress" section.

Before:
```markdown
## Phase Progress

**Completed Phases**: 0/[N]

| Phase | Status | Notes |
```

After:
```markdown
## Phase Progress

| Phase | Status | Notes |
```

### Steps:
1. ~~**Stub**~~: N/A - no code exports
2. ~~**Tests**~~: N/A - no testable behavior
3. [ ] **Implement**: Remove redundant counter line from `templates/tasks-template.md`
4. [ ] **Validate**: Verify "Completed Phases" line is gone, table remains

---

## Status Checkpoints

Checkpoints pause orchestration for user review and approval.

- [ ] **Final**: After all 4 phases complete, ready for `/cc-track:prepare-completion`

---

## Dependencies

```
Phase 1 (specify.md) [P] ──┐
Phase 2 (prepare-completion.md) [P] ──┼──→ Final Checkpoint
Phase 3 (tasks.md) [P] ──┤
Phase 4 (tasks-template.md) [P] ──┘
```

All 4 phases are independent (different files) and can run fully in parallel.

---

## Orchestration Instructions

### For This Task (All Waived, All Parallel)

Since all phases have TDD waivers and are independent:

1. **Dispatch ALL 4 implementers** in a single message (parallel, NOT backgrounded):
   ```
   Task tool with subagent_type: cc-track:implementer for each phase
   Prompt for each: "Phase N: [Name] [TDD WAIVER APPROVED]. Apply change from tasks.md. File: [path]. Report changes made."
   ```

2. As each implementer completes in the response:
   - Check off that phase's "Implement" checkbox immediately
   - Note any issues raised

3. **Dispatch ALL 4 validators** in a single message (parallel, NOT backgrounded):
   ```
   Task tool with subagent_type: cc-track:validator for each phase
   Prompt for each: "Phase N: [Name] [TDD WAIVER APPROVED]. Verify: [requirement from spec]. Review implementation meets spec."
   ```

4. As each validator completes:
   - Check off that phase's "Validate" checkbox
   - Update Phase Progress table

### On Complications

1. **Stop** - No new task delegation
2. **Wait** - Let in-flight agents complete
3. **Update** - Mark current status in this file
4. **Raise** - Present issue to user with options

---

## Validation Checklist

*Verified before presenting*

- [x] Each phase has clear requirement reference
- [x] Each waived phase has valid waiver reason (markdown files)
- [x] Parallel phases [P] are truly independent (different files)
- [x] Dependencies are documented (none - all parallel)
- [x] Checkpoints placed at reasonable intervals (single final)
- [x] File paths are specific
- [x] Orchestration uses foreground parallel, not backgrounded

---

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 1     | ✅ Complete | specify.md |
| 2     | ✅ Complete | prepare-completion.md |
| 3     | ✅ Complete | tasks.md + fixed template inconsistency |
| 4     | ✅ Complete | tasks-template.md |

**Status Legend**: ⏳ Pending | 🔄 In Progress | ✅ Complete | ❌ Blocked

---

## Notes

*Updated during implementation*
