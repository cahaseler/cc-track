# Technical Plan: Apply Task 111 Orchestration Lessons

**Feature ID**: `112`
**Branch**: `112-apply-task-111-orchestration-lessons`
**Spec**: spec.md
**Status**: Planned

---

## Summary

Apply three lessons learned from Task 111's orchestration experience to cc-track's command and template files. All changes are markdown-only documentation updates with no code changes.

---

## Technical Context

**Language/Version**: N/A (Markdown only)
**Runtime/Framework**: N/A
**Primary Dependencies**: None
**Storage**: N/A
**Testing**: Manual verification (no testable code)
**Target Platform**: Claude Code plugin commands
**Performance Goals**: N/A
**Constraints**: Must preserve existing command structure
**Scale/Scope**: 4 markdown files

---

## Constitution Check

**Status**: ✅ No violations

This task modifies only markdown command/template files:
- No new dependencies
- No code changes
- No architectural changes
- No hook modifications

---

## Design & Contracts

### File Changes

#### 1. `commands/specify.md` (FR-001)

**Current** (Step 1, point 1):
```markdown
1. **Get task title**: Use from user's request. If unclear, ask ONE clarifying question.
```

**Change**: Add clarification that Claude should proceed with title creation without asking for approval.

**New**:
```markdown
1. **Get task title**: Use from user's request and proceed to create infrastructure. Only ask for clarification if the title is genuinely unclear - do not ask for approval of the title itself.
```

#### 2. `commands/prepare-completion.md` (FR-002)

**Current** (Step 4):
```markdown
**IMPORTANT:** Launch all 8 agents in a single message with multiple Task tool calls for parallel execution.
```

**Change**: Clarify that agents should NOT use `run_in_background: true` so UI shows progress clearly and results are immediately available for deduplication.

**Add after the IMPORTANT note**:
```markdown
**Execution mode:** Use **foreground parallel** (do NOT use `run_in_background: true`):
- Launch all 8 agents in a single message without the `run_in_background` parameter
- Orchestrator suspends until ALL agents complete
- All results return together in the response
- Deduplication in Step 5 has access to all findings at once

This is different from the pipeline pattern in `/cc-track:tasks` - here we need ALL results before proceeding to deduplication, so foreground parallel is correct.
```

#### 3. `commands/tasks.md` (FR-003, FR-004)

**Location**: "Orchestration Instructions" section, "For Parallel Phases" subsection

**Current pattern** (lines 233-245):
```markdown
### For Parallel Phases

When multiple phases are marked [P]:

1. Dispatch ALL stub writers for parallel phases as background agents:
   ```
   Task tool with run_in_background: true for each phase
   ```

2. Post status update: "Dispatched stub writers for Phases 2, 3, 4. Waiting for completion..."

3. Wait for all with AgentOutputTool (block: true)

4. **Update tasks.md**: Check off all "Stub" checkboxes for completed phases

5. Repeat pattern for test writers, implementers, validators - always updating checkboxes after each batch completes
```

**Change to pipeline flow with polling fallback**:
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

**Add new subsection for dependency enforcement** (after "For Parallel Phases"):
```markdown
### Dependency Enforcement

Phases marked with dependencies (e.g., "Phase 4 depends on Phase 2") must wait for the **complete** prerequisite cycle:

- ❌ Wrong: Start Phase 4's stub as soon as Phase 2's implementer finishes
- ✅ Correct: Start Phase 4's stub only after Phase 2's **validator** completes

Dependencies mean the full Stub → Tests → Implement → Validate cycle, not just Implement.

**Best practice**: Analyze actual dependencies (imports, shared state) rather than assuming sequential structure. For independent files (like separate markdown files), maximize parallelism.
```

#### 4. `templates/tasks-template.md` (FR-005)

**Current** (lines 170-180):
```markdown
## Phase Progress

**Completed Phases**: 0/[N]

| Phase | Status | Notes |
|-------|--------|-------|
| 1     | ⏳ Pending | |
| 2     | ⏳ Pending | |
| 3     | ⏳ Pending | |

**Status Legend**: ⏳ Pending | 🔄 In Progress | ✅ Complete | ❌ Blocked
```

**Change**: Remove redundant "Completed Phases" counter line (status table is sufficient):
```markdown
## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 1     | ⏳ Pending | |
| 2     | ⏳ Pending | |
| 3     | ⏳ Pending | |

**Status Legend**: ⏳ Pending | 🔄 In Progress | ✅ Complete | ❌ Blocked
```

---

## Project Structure

No new files created. Changes to existing files only:

```
commands/
├── specify.md          # FR-001: Task title approval tweak
├── prepare-completion.md  # FR-002: Non-background agent execution
└── tasks.md            # FR-003, FR-004: Pipeline flow + dependency rules

templates/
└── tasks-template.md   # FR-005: Remove redundant counter
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Unclear instructions cause confusion | Low | Low | Review changes for clarity before commit |
| Breaking existing workflows | Very Low | Low | Changes are additive/clarifying, not structural |

---

## Implementation Approach

All changes are markdown text edits. No TDD applicable - will use direct implementation with manual verification that:
1. Each file change matches the spec requirement
2. Existing command structure is preserved
3. New text is clear and unambiguous

---

## Next Step

Run `/cc-track:tasks` to generate implementation breakdown (though for 4 simple markdown edits, phases will be minimal with TDD waivers for all).
