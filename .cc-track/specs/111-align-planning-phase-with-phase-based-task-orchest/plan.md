# Implementation Plan: Align Planning Phase with Phase-Based Task Orchestration

**Feature ID**: `111`
**Branch**: `111-align-planning-phase-with-phase-based-task-orchest`
**Created**: 2025-12-07
**Spec**: @.cc-track/specs/111-align-planning-phase-with-phase-based-task-orchest/spec.md

## Summary

Update cc-track command files and templates to use consistent terminology: "Step" for workflow instructions, "Phase" reserved exclusively for TDD implementation units. Also simplify the plan template to focus on architecture decisions rather than task generation previews.

---

## Technical Context

**Language/Version**: N/A (Markdown only)
**Runtime/Framework**: N/A
**Primary Dependencies**: None
**Storage**: N/A
**Testing**: Manual verification (grep for "Phase" in workflow contexts)
**Target Platform**: Claude Code plugin commands and templates
**Constraints**: Backward compatible, no migration needed

---

## Constitution Check

**Checking against**: @.cc-track/constitution.md

### Guardrails Assessment
- [x] Radical Simplicity: PASS - Cleaning up confusing terminology is simplification
- [x] Plugin-Native Architecture: PASS - No changes to architecture
- [x] Minimal Dependencies: PASS - No new dependencies
- [x] Maximum File Size: PASS - No files exceed 500 lines
- [x] Code Quality Standards: N/A - No code changes

### Complexity Violations
*None - this is a documentation/template cleanup task*

---

## Project Structure

### Files to Modify

```
commands/
├── specify.md       # Phase → Step, renumber to 1-5
├── plan.md          # Phase → Step, renumber to 1-7, remove task preview
└── tasks.md         # Workflow Phase → Step (keep Phase for TDD units)

templates/
├── plan-template.md # Remove Progress Tracking, Quickstart, Task Generation
└── tasks-template.md # Verify clean (should already be good)
```

---

## Key Decisions

### Decision: "Step" vs "Phase" Terminology
- **Chosen**: "Step" for workflow instructions, "Phase" for TDD implementation units only
- **Rationale**: Clear separation prevents confusion between command workflow and implementation units
- **Alternatives Considered**:
  - "Stage" for workflow: Less intuitive than "Step"
  - Keep "Phase" everywhere: Current confusion is the problem
- **Tradeoffs**: Requires updating multiple files, but provides long-term clarity

### Decision: Remove Task Generation Preview from Plan
- **Chosen**: Plan focuses on architecture/technology only
- **Rationale**: Task generation is `/cc-track:tasks` responsibility; previewing it in plan creates duplication and drift
- **Alternatives Considered**:
  - Keep preview for context: Creates maintenance burden and inconsistency
- **Tradeoffs**: Plan users lose visibility into task structure until running `/cc-track:tasks`

### Decision: Remove Quickstart from Plan
- **Chosen**: Remove entirely
- **Rationale**: Quickstart was underused and duplicated effort; user stories in spec.md serve same purpose
- **Alternatives Considered**:
  - Make optional: Still adds noise to template
- **Tradeoffs**: Lose quickstart documentation (low value)

### Decision: Remove Progress Tracking from Plan Template
- **Chosen**: Remove entirely
- **Rationale**: Plan.md is written after discussion completes; checkbox tracking is meaningless
- **Alternatives Considered**:
  - Keep for multi-session planning: Rarely happens in practice
- **Tradeoffs**: None significant

---

## Transformation Map

### commands/specify.md
| Old | New |
|-----|-----|
| Phase 0: Create Infrastructure | Step 1: Create Infrastructure |
| Phase 1: Understanding | Step 2: Understanding |
| Phase 1.5: Complexity Assessment | Step 3: Complexity Assessment |
| Phase 2: Artifact Creation | Step 4: Artifact Creation |
| Phase 3: Presentation | Step 5: Presentation |

### commands/plan.md
| Old | New |
|-----|-----|
| Phase 0.5: Complexity Assessment | Step 1: Complexity Assessment |
| Phase 0.6: Alternative Design | Step 2: Alternative Design (Optional) |
| Phase 0: Constitution Check | Step 3: Constitution Check (Initial) |
| Phase 1: Research | Step 4: Research |
| Phase 2: Design | Step 5: Design |
| Phase 3: Constitution Check (Post) | Step 6: Constitution Check (Post-Design) |
| Phase 4: Presentation | Step 7: Presentation |

**Additional changes to plan.md:**
- Remove "Create Quickstart Guide" section
- Remove references to quickstart.md output
- Simplify "Write Plan Document" to not include task generation approach

### commands/tasks.md
| Old | New |
|-----|-----|
| Phase 1: Identify Testable Chunks | Step 1: Identify Testable Chunks |
| Phase 2: Generate tasks.md | Step 2: Generate tasks.md |
| Phase 3: Checkpoint Placement | Step 3: Checkpoint Placement |
| Phase 4: Validation | Step 4: Validation |
| Phase 5: Presentation & Approval | Step 5: Presentation & Approval |

**Note:** Keep "Phase 1:", "Phase 2:" etc. in the *generated content examples* (TDD implementation units)

### templates/plan-template.md
**Remove:**
- "Phase 2: Task Generation Approach" section (lines ~181-205)
- "Progress Tracking" section (lines ~207-223)
- "Quickstart Guide" section within Phase 1: Design
- References to quickstart.md in Project Structure

**Keep:**
- Summary
- Alternatives Considered
- Technical Context
- Constitution Check
- Project Structure (simplified)
- Phase 0: Research & Decisions (rename to "Research & Decisions")
- Phase 1: Design & Contracts (rename to "Design & Contracts", remove quickstart)
- Risk Assessment
- Implementation Notes

**Rename:** "Phase 0", "Phase 1" → "Research & Decisions", "Design & Contracts" (section headers, not step numbers)

---

## Risk Assessment

### Technical Risks
- **Risk**: Missing some "Phase" occurrences in workflow context
  - **Likelihood**: Low
  - **Impact**: Low (cosmetic inconsistency)
  - **Mitigation**: Grep verification after changes

### Dependency Risks
- **Risk**: None - markdown only changes

---

## Implementation Notes

### Verification Strategy
After changes, run:
```bash
# Should return NO results for workflow "Phase X:" patterns in commands
grep -n "## Phase [0-9]" commands/*.md

# Should return ONLY results in TDD context (tasks.md generated content examples)
grep -n "Phase [0-9]:" commands/tasks.md templates/tasks-template.md
```

### Backward Compatibility
- Existing plan.md files in specs/ directories are NOT migrated
- New plans generated after this change will use simplified template
- Old plans remain functional (just different format)
