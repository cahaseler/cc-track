# Tasks: cc-track Workflow Cleanup

**Feature ID**: `105`
**Branch**: `105-cc-track-workflow-cleanup`
**Prerequisites**: plan.md, spec.md
**Input**: Design documents from `.cc-track/specs/105-cc-track-workflow-cleanup/`

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Tasks are numbered sequentially (T001, T002, etc.)

---

## Phase 1: Tests First (TDD)

**CRITICAL: New tests MUST be written and MUST FAIL before implementation**

- [ ] T001 Add `isMetadataFile()` unit tests in tests/hooks/pre-tool-validation.test.ts
- [ ] T002 Add metadata protection integration tests in tests/hooks/pre-tool-validation.test.ts

*Note: T001 and T002 modify same file, cannot be parallel*

---

## Phase 2: Hook Implementation

- [ ] T003 Add `isMetadataFile()` function to hooks/pre-tool-validation.ts
- [ ] T004 Add metadata protection blocking logic to `preToolValidationHook()` in hooks/pre-tool-validation.ts

*Note: T003 and T004 modify same file, sequential*

---

## Phase 3: Hook Cleanup (Remove Obsolete Code)

- [ ] T005 Remove `isTaskFile()` function from hooks/pre-tool-validation.ts
- [ ] T006 Remove `extractDiffInfo()` function from hooks/pre-tool-validation.ts
- [ ] T007 Remove `buildValidationPrompt()` function from hooks/pre-tool-validation.ts
- [ ] T008 Remove Claude SDK task validation logic (lines 463-551) from hooks/pre-tool-validation.ts
- [ ] T009 Remove ClaudeSDK import from hooks/pre-tool-validation.ts

*Note: All T005-T009 modify same file, sequential*

---

## Phase 4: Test Cleanup

- [ ] T010 Remove obsolete test blocks from tests/hooks/pre-tool-validation.test.ts:
  - Remove `describe('isTaskFile', ...)`
  - Remove `describe('extractDiffInfo', ...)`
  - Remove `describe('buildValidationPrompt', ...)`
  - Remove `describe('preToolValidationHook - task validation', ...)`
- [ ] T011 Remove obsolete imports from test file (createMockClaudeSDK if no longer used)

*Note: T010 and T011 modify same file, sequential*

---

## Phase 5: Command Naming Updates (All Parallel)

- [ ] T012 [P] Update commands/plan.md - change `/specify` and `/tasks` to namespaced format
- [ ] T013 [P] Update commands/specify.md - change `/plan` references to `/cc-track:plan`
- [ ] T014 [P] Update commands/tasks.md - change `/plan` reference to `/cc-track:plan`
- [ ] T015 [P] Update commands/complete-task.md - change `/prepare-completion` to `/cc-track:prepare-completion`
- [ ] T016 [P] Update templates/CLAUDE.md - change `/complete-task` to `/cc-track:complete-task`
- [ ] T017 [P] Update templates/no_active_task.md - change `/specify` to `/cc-track:specify`
- [ ] T018 [P] Update templates/metadata-example.json - change command refs to namespaced format
- [ ] T019 [P] Update templates/constitution-template.md - change `/plan` to `/cc-track:plan`
- [ ] T020 [P] Update templates/plan-template.md - change `/plan` and `/tasks` refs
- [ ] T021 [P] Update .cc-track/cc-track-workflow.md - change all command refs to namespaced format

---

## Phase 6: Validation & Cleanup

- [ ] T022 Run test suite: `bun test tests/hooks/pre-tool-validation.test.ts`
- [ ] T023 Run full test suite: `bun test`
- [ ] T024 Run TypeScript check: `bunx tsc --noEmit`
- [ ] T025 Run Biome lint: `bunx biome check`
- [ ] T026 Remove addressed backlog items from .cc-track/backlog.md

---

## Dependencies Graph

```
Phase 1 (T001-T002) → Phase 2 (T003-T004) → Phase 3 (T005-T009) → Phase 4 (T010-T011) → Phase 6 (T022-T026)
                                                                                         ↑
Phase 5 (T012-T021) ─────────────────────────────────────────────────────────────────────┘

Specific dependencies:
- T001-T002: Sequential (same file)
- T003-T009: Sequential (same file)
- T010-T011: Sequential (same file)
- T012-T021: Parallel (different files)
- T022-T026: Sequential (validation chain)
```

---

## Parallel Execution Example

### Phase 5: Command Naming (T012-T021)
```bash
# All can run simultaneously - different files:
Task: "Update commands/plan.md"
Task: "Update commands/specify.md"
Task: "Update commands/tasks.md"
Task: "Update commands/complete-task.md"
Task: "Update templates/CLAUDE.md"
Task: "Update templates/no_active_task.md"
Task: "Update templates/metadata-example.json"
Task: "Update templates/constitution-template.md"
Task: "Update templates/plan-template.md"
Task: "Update .cc-track/cc-track-workflow.md"
```

---

## Validation Checklist
*Verify before starting implementation*

- [x] All tests come before their corresponding implementation (T001-T002 before T003-T009)
- [x] Parallel tasks (`[P]`) are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another `[P]` task
- [x] Dependencies are clearly documented

---

## Task Progress Tracking

**Phase Completion**:
- [ ] Phase 1: Tests First (T001-T002)
- [ ] Phase 2: Hook Implementation (T003-T004)
- [ ] Phase 3: Hook Cleanup (T005-T009)
- [ ] Phase 4: Test Cleanup (T010-T011)
- [ ] Phase 5: Command Naming (T012-T021)
- [ ] Phase 6: Validation (T022-T026)

**Overall Progress**: 0/26 tasks complete
