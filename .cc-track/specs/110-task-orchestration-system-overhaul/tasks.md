# Tasks: Task Orchestration System Overhaul

**Feature ID**: `110`
**Branch**: `110-task-orchestration-system-overhaul`
**Prerequisites**: plan.md, spec.md
**Input**: Design documents from `.cc-track/specs/110-task-orchestration-system-overhaul/`

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in task descriptions
- Tasks are numbered sequentially (T001, T002, etc.)

---

## Phase 1: Agent Definitions

All agent files are independent - can be created in parallel.

- [ ] T001 [P] Create stub-writer agent in `agents/stub-writer.md`
- [ ] T002 [P] Update test-generation agent in `agents/test-generation.md` for phase-aware TDD
- [ ] T003 [P] Create implementer agent in `agents/implementer.md`
- [ ] T004 [P] Create validator agent in `agents/validator.md`

---

## Phase 2: Command and Template Updates

Depends on agent definitions being complete (T001-T004).

- [ ] T005 Overhaul tasks command in `commands/tasks.md` for phase-based TDD orchestration
- [ ] T006 Update tasks template in `templates/tasks-template.md` for new phase structure

---

## Phase 3: Integration Testing

Depends on command updates (T005-T006).

- [ ] T007 Manual test: Generate tasks.md for a test feature using new command
- [ ] T008 Manual test: Verify orchestration flow executes phases in correct TDD order
- [ ] T009 Manual test: Verify parallel phases run concurrently via background agents
- [ ] T010 Manual test: Verify status checkpoints pause for user approval
- [ ] T011 Manual test: Verify escalation triggers "stop and settle" pattern

---

## Phase 4: Polish

- [ ] T012 Review and refine agent prompts based on testing feedback
- [ ] T013 Update progress.md with implementation notes
- [ ] T014 Run `/cc-track:prepare-completion` validation suite

---

## Dependencies Graph

```
Agent Definitions (T001-T004) [P] → Command Updates (T005-T006) → Testing (T007-T011) → Polish (T012-T014)

Specific dependencies:
- T001, T002, T003, T004 can run in parallel (different files)
- T005 requires T001-T004 complete (references agent names)
- T006 requires T005 complete (template matches command output)
- T007-T011 require T005-T006 complete (testing the new system)
- T012-T014 can begin after initial testing feedback
```

---

## Parallel Execution Examples

### Example 1: Agent Definitions (T001-T004)
```bash
# These can run simultaneously:
Task: "Create stub-writer agent in agents/stub-writer.md"
Task: "Update test-generation agent in agents/test-generation.md"
Task: "Create implementer agent in agents/implementer.md"
Task: "Create validator agent in agents/validator.md"
```

---

## Validation Checklist
*Verify before starting implementation*

- [x] All deliverables from plan.md have corresponding tasks
- [x] Agent definitions can be parallel (different files)
- [x] Command/template updates are sequential (dependencies)
- [x] Testing tasks cover success criteria from spec.md
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task

---

## Task Execution Notes

### Agent Definitions (T001-T004)
Each agent definition must include:
- YAML frontmatter with: name, description, model (haiku), color, tools (restricted per role)
- Clear instructions for the agent's scope
- Tool restrictions that enforce TDD boundaries
- Output format for reporting back to orchestrator
- Escalation criteria (when to report issues)

### Command Overhaul (T005)
The new tasks.md command must:
- Generate phases (not just task lists)
- Each phase has 4 steps: Stub → Tests → Implement → Validate
- Mark parallel phases with [P]
- Include checkpoint placements
- Contain orchestration instructions for execution
- Use subagent naming pattern: "Phase-N-AgentRole"

### Template Update (T006)
The new tasks-template.md must:
- Reflect phase-based structure
- Include step definitions within phases
- Document orchestration flow
- Provide examples of checkpoint usage

### Testing (T007-T011)
Manual testing should verify spec.md success criteria:
- TDD order enforced
- Subagents run tests and report results
- Tool restrictions honored
- Background agents for parallel phases
- Checkpoints pause for approval
- Escalation works correctly

---

## Task Progress Tracking
*Updated during implementation - see progress.md for detailed updates*

**Phase Completion**:
- [ ] Phase 1: Agent Definitions (T001-T004)
- [ ] Phase 2: Command/Template (T005-T006)
- [ ] Phase 3: Testing (T007-T011)
- [ ] Phase 4: Polish (T012-T014)

**Overall Progress**: 0/14 tasks complete
