# Tasks: Align Planning Phase with Phase-Based Task Orchestration

**Feature ID**: `111`
**Branch**: `111-align-planning-phase-with-phase-based-task-orchest`
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

## Phase 1: Update specify.md Command [TDD WAIVER APPROVED]

**Requirement**: FR-011 - Rename Phase 0/1/1.5/2/3 → Step 1/2/3/4/5
**Files**: `commands/specify.md`
**Waiver Reason**: Markdown command file - no testable code behavior

### Transformation:
| Old | New |
|-----|-----|
| `## Phase 0: Create Infrastructure` | `## Step 1: Create Infrastructure` |
| `## Phase 1: Understanding` | `## Step 2: Understanding (Socratic Questioning)` |
| `## Phase 1.5: Complexity Assessment` | `## Step 3: Complexity Assessment & Exploration` |
| `## Phase 2: Artifact Creation` | `## Step 4: Artifact Creation (spec.md)` |
| `## Phase 3: Presentation` | `## Step 5: Presentation` |

Also update any cross-references (e.g., "Skip to Phase 0" → "Skip to Step 3").

### Steps:
1. ~~**Stub**~~: N/A - no code exports
2. ~~**Tests**~~: N/A - no testable behavior
3. [x] **Implement**: Apply transformation map to `commands/specify.md`
4. [x] **Validate**: Verify no "Phase" in workflow headers, steps numbered 1-5

---

## Phase 2: Update plan.md Command [TDD WAIVER APPROVED] [P]

**Requirement**: FR-012 - Rename Phase 0.5/0.6/0/1/2/3/4 → Step 1-7; FR-004/005/006 - Remove task preview
**Files**: `commands/plan.md`
**Waiver Reason**: Markdown command file - no testable code behavior

### Transformation:
| Old | New |
|-----|-----|
| `## Phase 0.5: Complexity Assessment` | `## Step 1: Complexity Assessment` |
| `## Phase 0.6: Alternative Design Exploration` | `## Step 2: Alternative Design Exploration (Optional)` |
| `## Phase 0: Constitution Check (Initial)` | `## Step 3: Constitution Check (Initial)` |
| `## Phase 1: Research` | `## Step 4: Research` |
| `## Phase 2: Design` | `## Step 5: Design` |
| `## Phase 3: Constitution Check (Post-Design)` | `## Step 6: Constitution Check (Post-Design)` |
| `## Phase 4: Presentation` | `## Step 7: Presentation` |

### Additional Changes:
- Remove "Create Quickstart Guide" section entirely
- Remove quickstart.md from output file list
- Remove "Phase 2 (Task Planning Approach)" from "Write Plan Document" bullet list
- Update cross-references ("Skip to Phase 0" → "Skip to Step 3", etc.)

### Steps:
1. ~~**Stub**~~: N/A - no code exports
2. ~~**Tests**~~: N/A - no testable behavior
3. [x] **Implement**: Apply transformation map and remove quickstart/task preview sections
4. [x] **Validate**: Verify no "Phase" in workflow headers, steps numbered 1-7, no quickstart references

---

## Phase 3: Update tasks.md Command [TDD WAIVER APPROVED] [P]

**Requirement**: FR-013 - Rename workflow Phase 1/2/3/4/5 → Step 1-5 (keep Phase for TDD units)
**Files**: `commands/tasks.md`
**Waiver Reason**: Markdown command file - no testable code behavior

### Transformation (workflow headers only):
| Old | New |
|-----|-----|
| `## Phase 1: Identify Testable Functionality Chunks` | `## Step 1: Identify Testable Functionality Chunks` |
| `## Phase 2: Generate tasks.md` | `## Step 2: Generate tasks.md` |
| `## Phase 3: Checkpoint Placement` | `## Step 3: Checkpoint Placement` |
| `## Phase 4: Validation` | `## Step 4: Validation` |
| `## Phase 5: Presentation & Approval` | `## Step 5: Presentation & Approval` |

### Preserve (TDD implementation units in examples):
- `## Phase 1: [Phase Name]` in generated content examples
- `## Phase 2: [Phase Name] [P]` in generated content examples
- All "Phase" references inside code blocks showing tasks.md structure

### Steps:
1. ~~**Stub**~~: N/A - no code exports
2. ~~**Tests**~~: N/A - no testable behavior
3. [x] **Implement**: Rename workflow headers, preserve TDD phase examples
4. [x] **Validate**: Workflow headers use "Step", TDD examples still use "Phase"

---

## Phase 4: Simplify plan-template.md [TDD WAIVER APPROVED]

**Requirement**: FR-007/008/009/010 - Remove Progress Tracking, Quickstart, Task Generation Approach
**Files**: `templates/plan-template.md`
**Waiver Reason**: Markdown template file - no testable code behavior

### Sections to Remove:
- `## Phase 2: Task Generation Approach` (entire section, ~25 lines)
- `## Progress Tracking` (entire section, ~17 lines)
- Quickstart subsection within `## Phase 1: Design & Contracts`
- `quickstart.md` from Project Structure file list

### Sections to Rename:
- `## Phase 0: Research & Decisions` → `## Research & Decisions`
- `## Phase 1: Design & Contracts` → `## Design & Contracts`

### Steps:
1. ~~**Stub**~~: N/A - no code exports
2. ~~**Tests**~~: N/A - no testable behavior
3. [x] **Implement**: Remove sections, rename headers
4. [x] **Validate**: No Progress Tracking, no Quickstart, no Task Generation Approach, no "Phase" in section headers

---

## Phase 5: Verify tasks-template.md [TDD WAIVER APPROVED]

**Requirement**: Verify no workflow "Phase" usage (should already be clean)
**Files**: `templates/tasks-template.md`
**Waiver Reason**: Markdown template file - verification only, minimal changes expected

### Verification:
- Confirm all "Phase" references are for TDD implementation units only
- No workflow steps labeled as "Phase"

### Steps:
1. ~~**Stub**~~: N/A - no code exports
2. ~~**Tests**~~: N/A - no testable behavior
3. [x] **Implement**: Fix any workflow "Phase" references if found (likely none)
4. [x] **Validate**: All "Phase" references are TDD implementation units

---

## Status Checkpoints

Checkpoints pause orchestration for user review and approval.

- [ ] **Checkpoint A**: After Phases 1-3 complete (all command files updated)
- [ ] **Final**: After Phases 4-5 complete (templates updated), ready for `/cc-track:prepare-completion`

---

## Dependencies

```
Phase 1 (specify.md) ──┐
Phase 2 (plan.md) [P] ─┼──→ Phase 4 (plan-template.md) ──→ Phase 5 (tasks-template.md)
Phase 3 (tasks.md) [P]─┘
```

- Phases 1-3 can run in parallel (different files)
- Phase 4 depends on Phase 2 patterns (but can start independently)
- Phase 5 is verification only, should be quick

---

## Orchestration Instructions

### For Parallel Phases (1, 2, 3)

Since all phases require TDD waivers, dispatch implementers directly:

1. Dispatch ALL implementers for Phases 1, 2, 3 as background agents:
   ```
   Task tool with subagent_type: implementer, run_in_background: true
   Prompt for each: "Phase N: [Name] [TDD WAIVER]. Apply transformation map from tasks.md. File: [path]. Report changes made."
   ```

2. Post status: "Dispatched implementers for Phases 1, 2, 3. Waiting..."

3. Wait with AgentOutputTool (block: true)

4. **Update tasks.md**: Check off "Implement" checkboxes

5. Dispatch validators in parallel:
   ```
   Task tool with subagent_type: validator, run_in_background: true
   Prompt for each: "Phase N: [Name] [TDD WAIVER]. Verify: [requirements]. Review implementation meets spec."
   ```

6. Wait, then update "Validate" checkboxes

### At Checkpoint A

Summarize:
```
Checkpoint A reached.

Completed:
- Phase 1: ✅ specify.md updated (Phase → Step 1-5)
- Phase 2: ✅ plan.md updated (Phase → Step 1-7, quickstart removed)
- Phase 3: ✅ tasks.md updated (workflow Phase → Step)

Next: Phases 4-5 (template updates)

Continue?
```

### Phases 4-5 (Sequential)

After checkpoint approval:

1. Phase 4: Dispatch implementer for plan-template.md
2. Wait, validate, update checkboxes
3. Phase 5: Dispatch implementer for tasks-template.md verification
4. Wait, validate, update checkboxes

### Final Checkpoint

```
All phases complete!

- Phase 1: ✅ commands/specify.md
- Phase 2: ✅ commands/plan.md
- Phase 3: ✅ commands/tasks.md
- Phase 4: ✅ templates/plan-template.md
- Phase 5: ✅ templates/tasks-template.md

Ready for /cc-track:prepare-completion
```

---

## Validation Checklist

*Verify before starting implementation*

- [x] Each phase has clear requirement reference
- [x] Each waived phase has valid waiver reason (markdown files)
- [x] Parallel phases [P] are truly independent (different files)
- [x] Dependencies are documented
- [x] Checkpoints placed at reasonable intervals
- [x] File paths are specific

---

## Phase Progress

**Completed Phases**: 5/5

| Phase | Status | Notes |
|-------|--------|-------|
| 1     | ✅ Complete | specify.md |
| 2     | ✅ Complete | plan.md |
| 3     | ✅ Complete | tasks.md |
| 4     | ✅ Complete | plan-template.md |
| 5     | ✅ Complete | tasks-template.md |

**Status Legend**: ⏳ Pending | 🔄 In Progress | ✅ Complete | ❌ Blocked

---

## Notes

*Updated during implementation*

### Orchestration Lesson Learned (2025-12-07)

**Issue**: Initial implementation used batch-wait pattern:
- Dispatch 3 implementers in parallel
- Wait for ALL 3 with parallel `AgentOutputTool` calls
- Then dispatch 3 validators in parallel
- Wait for ALL 3

**Better pattern**: Pipeline flow with wakeup notifications:
- Dispatch 3 implementers in parallel with `run_in_background: true`
- Post "waiting..." message and STOP (don't call AgentOutputTool)
- Agent completion triggers wakeup notification automatically
- On each wakeup: check off task, dispatch that phase's validator, continue
- Validators complete and trigger their own wakeups

**Why it matters**: Total time = longest single chain, not sum of batch waits. For full TDD (Stub → Tests → Implement → Validate), Phase 1's test writer can start as soon as Phase 1's stub finishes, even while other stubs are still running.

**Action**: Update orchestration instructions in tasks.md command to clarify this pattern.

### Dependency Enforcement Lesson (2025-12-07)

**Issue**: Stated that Phase 5 depended on Phase 4, but then launched Phase 5 before Phase 4's validator completed.

**Correct behavior**: If a phase is documented as depending on another phase, the dependent phase cannot start ANY work (including implementer dispatch) until the prerequisite phase's validator completes. Dependencies mean the full Implement→Validate cycle, not just Implement.

**In this case**: The dependency was incorrectly stated. All 5 phases touched independent files and could have run fully in parallel. Analyze actual dependencies (imports, shared state, ordering requirements) rather than assuming sequential structure.

**Action**: Be more rigorous about dependency analysis. For markdown/config files with no relationships, maximize parallelism.

### Template Simplification Note (2025-12-07)

**Issue**: The tasks template has redundant tracking - both a "Completed Phases: X/Y" counter AND a status table with the same information.

**Problem**: Multiple places need updates when checking off progress, increasing chance of inconsistency.

**Action**: Simplify tasks-template.md to remove the separate counter. The status table alone is sufficient - count can be derived from ✅ marks if needed.
