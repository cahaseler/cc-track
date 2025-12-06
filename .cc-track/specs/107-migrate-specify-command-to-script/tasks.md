# Tasks: Migrate Specify Command to Script

**Feature ID**: `107`
**Branch**: `107-migrate-specify-command-to-script`
**Prerequisites**: plan.md, spec.md
**Input**: Design documents from `.cc-track/specs/107-migrate-specify-command-to-script/`

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in task descriptions

---

## Phase 1: Setup

- [x] T001 Review existing patterns in backlog.ts and complete-task.ts for script structure

---

## Phase 2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE PHASE 3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Unit Tests for specify.ts
- [x] T002 [P] Test: creates branch, folder, metadata, updates CLAUDE.md (happy path) in skills/cc-track-tools/scripts/specify.test.ts
- [x] T003 [P] Test: auto-generates task ID when not provided in skills/cc-track-tools/scripts/specify.test.ts
- [x] T004 [P] Test: creates GitHub issue when enabled in skills/cc-track-tools/scripts/specify.test.ts
- [x] T005 [P] Test: fails gracefully when spec dir already exists in skills/cc-track-tools/scripts/specify.test.ts
- [x] T006 [P] Test: fails gracefully when branch already exists in skills/cc-track-tools/scripts/specify.test.ts
- [x] T007 [P] Test: fails gracefully when .cc-track missing in skills/cc-track-tools/scripts/specify.test.ts
- [x] T008 [P] Test: warns but continues when GitHub fails in skills/cc-track-tools/scripts/specify.test.ts

**Note:** T002-T008 are in the same file but test independent scenarios - they can be written in parallel as separate test blocks.

---

## Phase 3: Core Implementation (ONLY after tests are failing)

- [x] T009 Implement runSpecify() function with DI in skills/cc-track-tools/scripts/specify.ts
- [x] T010 Add CLI entrypoint in skills/cc-track-tools/scripts/specify.ts
- [x] T011 Verify all tests pass

---

## Phase 4: Integration

- [x] T012 Update SKILL.md to document specify.ts script in skills/cc-track-tools/SKILL.md
- [x] T013 Rewrite commands/specify.md to use skill + script pattern (infrastructure FIRST)

---

## Phase 5: Validation & Polish

- [x] T014 Run full validation suite (TypeScript, Biome, tests)
- [x] T015 Manual integration test: run /cc-track:specify on a test task

---

## Dependencies Graph

```
T001 (Setup) → T002-T008 (Tests) → T009-T011 (Implementation) → T012-T013 (Integration) → T014-T015 (Polish)

Specific dependencies:
- T001 blocks T002-T008 (need to understand patterns first)
- T002-T008 must all complete before T009 (TDD - tests must fail first)
- T009 blocks T010 (core logic before CLI)
- T010 blocks T011 (implementation before verification)
- T011 blocks T012, T013 (working script before docs/command)
- T012, T013 can run in parallel (different files)
- T014 blocks T015 (validation before manual test)
```

---

## Parallel Execution Examples

### Example 1: Writing Tests (T002-T008)
```bash
# These test different scenarios in the same file but are logically independent:
# Write all test blocks, then run to verify they fail
```

### Example 2: Integration (T012-T013)
```bash
# These can run simultaneously:
Task: "Update SKILL.md documentation"
Task: "Rewrite specify.md command"
```

---

## Validation Checklist
*Verify before starting implementation*

- [x] All tests come before their corresponding implementation
- [x] Parallel tasks (`[P]`) are truly independent
- [x] Each task specifies exact file path
- [x] No task modifies same file as another `[P]` task in same phase
- [x] Dependencies are clearly documented

---

## Task Progress Tracking

**Phase Completion**:
- [x] Phase 1: Setup (T001)
- [x] Phase 2: Tests (T002-T008)
- [x] Phase 3: Implementation (T009-T011)
- [x] Phase 4: Integration (T012-T013)
- [x] Phase 5: Polish (T014-T015)

**Overall Progress**: 15/15 tasks complete ✅
