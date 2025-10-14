# Tasks: [FEATURE NAME]

**Feature ID**: `[###]`
**Branch**: `[###-feature-name]`
**Prerequisites**: plan.md, spec.md
**Input**: Design documents from `.claude/specs/[###-feature-name]/`

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in task descriptions
- Tasks are numbered sequentially (T001, T002, etc.)

## Path Conventions
Tasks below assume standard project structure. Adjust based on plan.md:
- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`, separate `tests/` dirs
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Always use exact paths from plan.md Project Structure section

## Task Execution Rules
1. **TDD Order**: Tests MUST be written and MUST FAIL before implementation
2. **Dependencies**: Tasks without `[P]` must be completed sequentially
3. **Parallel Tasks**: Tasks marked `[P]` can be worked on simultaneously
4. **File Conflicts**: Never mark tasks `[P]` if they modify the same file
5. **Commit Frequency**: Commit after completing each task

---

## Phase 1: Setup

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize dependencies and tooling
- [ ] T003 [P] Configure linting and formatting
- [ ] T004 [P] Set up testing framework

---

## Phase 2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE PHASE 3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (if applicable)
- [ ] T005 [P] Contract test for [endpoint 1] in tests/contract/[file].test.ts
- [ ] T006 [P] Contract test for [endpoint 2] in tests/contract/[file].test.ts

### Integration Tests
- [ ] T007 [P] Integration test for [user story 1] in tests/integration/[file].test.ts
- [ ] T008 [P] Integration test for [user story 2] in tests/integration/[file].test.ts

### Model Tests (if applicable)
- [ ] T009 [P] Unit tests for [entity 1] model in tests/unit/[file].test.ts
- [ ] T010 [P] Unit tests for [entity 2] model in tests/unit/[file].test.ts

---

## Phase 3: Core Implementation (ONLY after tests are failing)

### Models & Data Layer
- [ ] T011 [P] Implement [Entity 1] model in src/models/[file].ts
- [ ] T012 [P] Implement [Entity 2] model in src/models/[file].ts

### Business Logic
- [ ] T013 [P] Implement [Service 1] in src/services/[file].ts
- [ ] T014 [P] Implement [Service 2] in src/services/[file].ts

### API/CLI Layer
- [ ] T015 Implement [endpoint/command 1]
- [ ] T016 Implement [endpoint/command 2]
- [ ] T017 Add input validation
- [ ] T018 Add error handling and logging

---

## Phase 4: Integration

- [ ] T019 Connect services to data layer
- [ ] T020 Add authentication/authorization (if applicable)
- [ ] T021 Add middleware and request/response handling
- [ ] T022 Add observability (logging, metrics)

---

## Phase 5: Polish

- [ ] T023 [P] Additional unit tests for edge cases
- [ ] T024 Performance testing and optimization
- [ ] T025 [P] Update documentation
- [ ] T026 Code review and refactoring
- [ ] T027 Remove duplication
- [ ] T028 Run manual testing scenarios from quickstart.md

---

## Dependencies Graph

```
Setup (T001-T004) → Tests (T005-T010) → Implementation (T011-T018) → Integration (T019-T022) → Polish (T023-T028)

Specific dependencies:
- T011, T012 block T013, T014
- T013, T014 block T015, T016
- T015-T018 block T019-T022
- All implementation blocks polish phase
```

---

## Parallel Execution Examples

### Example 1: Contract Tests (T005-T006)
```bash
# These can run simultaneously:
Task: "Contract test for POST /api/users in tests/contract/users-post.test.ts"
Task: "Contract test for GET /api/users in tests/contract/users-get.test.ts"
```

### Example 2: Model Implementation (T011-T012)
```bash
# These can run simultaneously:
Task: "Implement User model in src/models/user.ts"
Task: "Implement Project model in src/models/project.ts"
```

---

## Validation Checklist
*Verify before starting implementation*

- [ ] All tests come before their corresponding implementation
- [ ] Parallel tasks (`[P]`) are truly independent (different files)
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another `[P]` task
- [ ] All contracts from plan.md have corresponding tests
- [ ] All entities from data-model.md have model tasks
- [ ] Dependencies are clearly documented

---

## Task Generation Rules
*Applied when generating tasks from design documents*

1. **From Contracts** (if contracts/ directory exists):
   - Each contract file → contract test task marked [P]
   - Each endpoint → implementation task

2. **From Data Model** (if data-model.md exists):
   - Each entity → model creation task marked [P]
   - Relationships → service layer tasks

3. **From User Stories** (in spec.md):
   - Each story → integration test marked [P]
   - Quickstart scenarios → validation tasks

4. **Ordering Strategy**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution
   - TDD order: Tests before implementation

## Implementation Notes

### Success Criteria
Each task is complete when:
1. Code is written and works as expected
2. All tests for that task pass
3. Code follows project patterns (see system_patterns.md)
4. Changes are committed with clear message

### Common Pitfalls to Avoid
- Writing implementation before tests fail
- Marking tasks `[P]` when they have dependencies
- Vague task descriptions without file paths
- Skipping commits between tasks
- Not verifying tests fail before implementing

---

## Task Progress Tracking
*Updated during implementation - see progress.md for detailed updates*

**Phase Completion**:
- [ ] Phase 1: Setup (T001-T004)
- [ ] Phase 2: Tests (T005-T010)
- [ ] Phase 3: Implementation (T011-T018)
- [ ] Phase 4: Integration (T019-T022)
- [ ] Phase 5: Polish (T023-T028)

**Overall Progress**: 0/28 tasks complete
