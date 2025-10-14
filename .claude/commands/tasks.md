---
description: Generate actionable task breakdown following TDD principles
---

# Task Generation

**Goal**: Convert technical plan into numbered, ordered, testable tasks.

**Core Principle**: Tests before implementation. Parallel where possible. TDD strictly enforced.

---

## Prerequisites Check

```typescript
const specDir = getActiveSpecDirectory(projectRoot);
const plan = readSpecFile(specDir, 'plan.md');
const dataModel = readSpecFile(specDir, 'data-model.md');
const contracts = readdirSync(join(specDir, 'contracts'));
```

**Verify**:
- [ ] plan.md exists and complete
- [ ] Tech stack defined
- [ ] Design documents present

**If plan incomplete**:
```
❌ Cannot generate tasks without complete plan.

Missing: [what's missing]
Run `/plan` first to complete technical design.
```

---

## Phase 1: Task Extraction

### From Contracts (if present)
**Each contract file → Contract test task**
```
T00X [P] Contract test POST /api/users in tests/contract/test_users_post.test.ts
```
Mark `[P]` - different files, parallel-safe.

### From Data Model (if present)
**Each entity → Model creation task**
```
T00X [P] User model in src/models/user.ts
T00X [P] Session model in src/models/session.ts
```
Mark `[P]` - different files, parallel-safe.

### From User Stories (spec.md)
**Each story → Integration test**
```
T00X [P] Integration test user registration in tests/integration/test_registration.test.ts
T00X [P] Integration test login flow in tests/integration/test_login.test.ts
```
Mark `[P]` - different files, parallel-safe.

### From Implementation Plan
**For each component/service/feature**:
- Setup tasks
- Implementation tasks
- Integration tasks
- Polish tasks

---

## Phase 2: Task Ordering

### Ordering Rules:

**1. Setup First**
```
T001 Create project structure per plan
T002 Initialize [language] with dependencies
T003 [P] Configure linting/formatting
T004 [P] Set up testing framework
```

**2. Tests Before Implementation (TDD)**
```
## Phase 2: Tests First ⚠️ MUST COMPLETE BEFORE PHASE 3

T005 [P] Contract test POST /api/users
T006 [P] Contract test GET /api/users/{id}
T007 [P] Integration test registration
T008 [P] Integration test login
```

**3. Implementation After Tests**
```
## Phase 3: Core Implementation (ONLY after tests failing)

T009 [P] User model in src/models/user.ts
T010 [P] UserService in src/services/user_service.ts
T011 POST /api/users endpoint
T012 GET /api/users/{id} endpoint
```

**4. Integration & Polish Last**
```
## Phase 4: Integration
T013 Connect UserService to database
T014 Add authentication middleware

## Phase 5: Polish
T015 [P] Performance tests (<200ms target)
T016 [P] Update documentation
T017 Remove duplication
```

### Parallel Marking Rules:
- ✅ **Mark [P]**: Different files, no dependencies
- ❌ **NO [P]**: Same file modifications
- ❌ **NO [P]**: Has dependencies on other tasks

---

## Phase 3: Task File Generation

Use `templates/tasks-template.md` and fill:

### Header
```markdown
# Tasks: [Feature Name]

**Feature ID**: `[task_id]`
**Branch**: `[branch]`
```

### Phases with Tasks
```markdown
## Phase 1: Setup
- [ ] T001 Create project structure...
- [ ] T002 Initialize TypeScript...

## Phase 2: Tests First ⚠️ MUST COMPLETE BEFORE PHASE 3
**CRITICAL: Tests MUST fail before implementation**
- [ ] T003 [P] Contract test...
- [ ] T004 [P] Integration test...

## Phase 3: Core Implementation (ONLY after tests failing)
- [ ] T005 [P] User model...
- [ ] T006 [P] UserService...

## Phase 4: Integration
- [ ] T007 Connect to database...

## Phase 5: Polish
- [ ] T008 [P] Performance tests...
- [ ] T009 [P] Documentation...
```

### Dependencies Section
```markdown
## Dependencies
- Setup (T001-T002) before Tests (T003-T004)
- Tests (T003-T004) before Implementation (T005-T006)
- T005 blocks T006
- Implementation before Integration (T007)
- Integration before Polish (T008-T009)
```

### Parallel Examples
```markdown
## Parallel Example
```bash
# Launch T003-T004 together:
Task: "Contract test POST /api/users in tests/contract/users_post.test.ts"
Task: "Integration test registration in tests/integration/registration.test.ts"
```
```

### Validation Checklist
```markdown
## Validation Checklist
- [ ] All contracts have test tasks
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No [P] task modifies same file as another [P]
```

Save to `tasks.md`.

---

## Phase 4: Validation

**Self-check before presenting**:

### TDD Order Check
```typescript
const testTasks = tasks.filter(t => t.phase === 'Tests');
const implTasks = tasks.filter(t => t.phase === 'Implementation');
const maxTestNum = Math.max(...testTasks.map(t => t.number));
const minImplNum = Math.min(...implTasks.map(t => t.number));

if (minImplNum <= maxTestNum) {
  throw new Error('TDD violation: Implementation task before test task');
}
```

### Parallel Safety Check
```typescript
const parallelTasks = tasks.filter(t => t.parallel);
const filePaths = parallelTasks.map(t => t.filePath);
const duplicates = filePaths.filter((f, i) => filePaths.indexOf(f) !== i);

if (duplicates.length > 0) {
  throw new Error(`Parallel tasks modify same file: ${duplicates}`);
}
```

### Coverage Check
- All contracts → tests? ✓
- All entities → models? ✓
- All user stories → integration tests? ✓

---

## Phase 5: Presentation & Approval

```
Task breakdown complete! 📋

Generated: 28 tasks across 5 phases
- Phase 1 (Setup): 4 tasks
- Phase 2 (Tests): 6 tasks [P]
- Phase 3 (Implementation): 10 tasks (4 [P])
- Phase 4 (Integration): 5 tasks
- Phase 5 (Polish): 3 tasks [P]

TDD compliance: ✅ All tests before implementation
Parallel opportunities: 13 tasks marked [P]
File conflicts: None

Created: .claude/specs/[ID]-[name]/tasks.md

Ready to begin implementation?

Note: You'll work through these tasks sequentially (or in parallel where marked).
When ready to start, just say "yes" or "let's implement" and I'll begin with Task 001.
```

**Wait for user approval before implementing.**

User might want to:
- Review tasks.md
- Adjust task breakdown
- Ask questions
- Defer implementation

---

## Common Patterns

### When Tasks Get Too Granular
```
User: "This seems like too many small tasks"

Claude: "I can combine related tasks. For example:
- Merge T005-T007 (all model creation) into single task?
- Combine T015-T017 (polish phase) into one cleanup task?

Which would you prefer?"
```

### When Parallel Marking is Unclear
```
Claude: "T008 and T009 both modify src/services/user_service.ts,
so I can't mark them [P]. T008 must complete before T009.

Should I:
A) Keep sequential (safer)
B) Split into different files (T008 → user_service.ts, T009 → user_validation.ts)

Recommend: A"
```

### When User Wants to Skip TDD
```
User: "Can we just implement without tests first?"

Claude: "I can reorder, but this violates TDD principles and project patterns.

Risks:
- Harder to verify correctness
- More bugs reach production
- Refactoring becomes scarier

Still want to proceed?"
```

---

## Implementation Notes

- Use templates/tasks-template.md as base
- Number sequentially (T001, T002, etc.)
- Include exact file paths in descriptions
- Reference specific line numbers from plan if helpful
- Mark dependencies clearly
- Generate realistic task count (20-30 typical)
- Update metadata.status to 'in_progress' when tasks created

---

## Next Step

After `/tasks` approved by user:
- **If user says yes**: Begin implementation with T001
- **If user defers**: Save tasks.md, they can start anytime
- **If user requests changes**: Revise tasks.md and re-present
