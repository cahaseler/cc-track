# Feature Specification: Task Orchestration System Overhaul

**Feature ID**: `110`
**Branch**: `110-task-orchestration-system-overhaul`
**Created**: 2025-12-07
**Status**: Draft

---

## User Scenarios & Testing

### Primary User Story
As a developer using cc-track, I want the task execution phase to leverage specialized subagents coordinated by an Opus orchestrator, so that I get faster implementation, better TDD enforcement, cost savings from using Haiku for scoped work, and cleaner context management.

### Acceptance Scenarios

1. **Given** a user has run `/cc-track:tasks` and approved the phase breakdown, **When** they begin implementation, **Then** the Opus orchestrator dispatches specialized subagents (stub writer, test writer, implementer, validator) in the correct TDD sequence for each phase.

2. **Given** a phase has tests that fail after implementation, **When** the implementer reports test failures in its response, **Then** the orchestrator reviews the reported output and determines whether to have the implementer continue or escalate.

3. **Given** multiple phases are marked as parallelizable `[P]`, **When** execution begins, **Then** those phases run concurrently via background subagents while the orchestrator posts a status update and waits for results.

4. **Given** a phase completes successfully (tests pass + validation passes), **When** the orchestrator moves to the next phase, **Then** the tasks.md checkbox for that phase is marked complete.

5. **Given** a checkpoint is reached (all parallel work complete at a designated sync point), **When** the orchestrator pauses, **Then** it provides a progress summary and waits for user approval before continuing.

6. **Given** the orchestrator encounters a complication it cannot resolve (technical difficulty, plan won't work), **When** it determines the issue requires human input, **Then** it stops delegating new tasks and raises the issue for discussion.

### Edge Cases
- What happens when a test writer produces tests that fail due to import errors? → Clear instructions to test writer about ensuring stubs exist first; if it still happens, orchestrator has stub writer fix missing exports.
- What happens when implementer and test writer disagree repeatedly? → Orchestrator escalates to user after using judgment about the dispute.
- What happens when a validator finds the phase didn't meet requirements? → Phase is marked incomplete, orchestrator determines whether to retry implementation or escalate.
- What happens when parallel phases have an unexpected dependency? → Orchestrator detects the conflict and serializes the affected phases.
- What happens when the orchestrator realizes the planned approach won't work? → Stop new task delegation, raise issue for replanning discussion with user.

---

## Requirements

### Functional Requirements

#### Task Breakdown (`/cc-track:tasks` changes)

- **FR-001**: The `/cc-track:tasks` command MUST generate a phase-based breakdown where each phase represents a testable chunk of functionality.
- **FR-002**: Each phase MUST include four steps: Stub, Tests, Implement, Validate.
- **FR-003**: Phases MUST be numbered sequentially (Phase 1, Phase 2, etc.) for clear identification.
- **FR-004**: Phases MUST be marked with `[P]` when they can execute in parallel with other phases.
- **FR-005**: Phases MUST declare dependencies on other phases when they exist.
- **FR-006**: The task breakdown MUST include status checkpoints at appropriate intervals for user approval.
- **FR-007**: The phase breakdown MUST be presented to the user for approval before any implementation begins.

#### Specialized Subagents

- **FR-008**: The system MUST define a **Stub Writer** agent that creates minimal file stubs with exported interfaces/types so imports resolve.
- **FR-009**: The system MUST define a **Test Writer** agent that can only modify test files, runs tests, and includes test output in its response. Cannot modify production code.
- **FR-010**: The system MUST define an **Implementer** agent that can modify production code, runs tests, and includes test output in its response. Cannot modify test files.
- **FR-011**: The system MUST define a **Validator** agent that has read-only access and verifies the phase accomplished its stated requirement.
- **FR-012**: Subagent tool restrictions MUST be enforced via the agent definition's `tools` field.
- **FR-013**: Subagents MUST be named using a consistent pattern including the phase number (e.g., "Phase-3-TestWriter", "Phase-3-Implementer") so the orchestrator can identify responses.

#### Orchestration Flow

- **FR-014**: The orchestrator MUST execute phases in dependency order, with parallel phases dispatched as background agents.
- **FR-015**: Within each phase, the orchestrator MUST follow the sequence: Stub → Tests (agent runs tests, reports output) → Implement (agent runs tests, reports output) → Validate.
- **FR-016**: Subagents MUST run tests themselves and include test results in their response to the orchestrator, rather than the orchestrator running tests directly.
- **FR-017**: The Test Writer agent MUST receive clear instructions that tests should fail for functional reasons, not import/syntax errors, and that stubs must exist first.
- **FR-018**: The orchestrator MUST referee disputes between test writer and implementer, using judgment to determine resolution.
- **FR-019**: The orchestrator MUST update tasks.md checkboxes as each phase completes.

#### Status Checkpoints

- **FR-020**: Status checkpoints MUST be defined in tasks.md at appropriate intervals between phases.
- **FR-021**: At each checkpoint, the orchestrator MUST pause, provide a progress summary, and wait for user approval before continuing.
- **FR-022**: The number and placement of checkpoints depends on overall scope and user preference (could be several or none).
- **FR-023**: Between checkpoints, the orchestrator MUST continue working the plan autonomously until finished, a checkpoint, or a complication arises.

#### Escalation and Complications

- **FR-024**: The orchestrator MUST escalate to the user when its judgment indicates human input is needed.
- **FR-025**: When a complication arises that the orchestrator cannot resolve (technical difficulty, plan won't work, replanning needed), the orchestrator MUST:
  1. Stop delegating new tasks immediately
  2. Wait for all in-flight background agents to complete
  3. Update tasks.md with current status of all phases
  4. Then raise the issue for discussion with the user
- **FR-026**: This "stop and settle" pattern prevents background agents from interrupting the human conversation with completion notifications.
- **FR-027**: Complications requiring escalation include: repeated implementation failures, fundamental plan flaws discovered during implementation, and disputes that can't be resolved.

#### Context Management

- **FR-028**: The orchestrator MUST NOT treat context limit warnings as cause for concern, rushing, or cutting corners.
- **FR-029**: The orchestrator MUST understand that cc-track's tasks.md serves as durable progress tracking, so context compaction is not disruptive.
- **FR-030**: When context compaction occurs, work continues based on tasks.md and progress state - no information is lost if checkboxes are updated appropriately.
- **FR-031**: The orchestrator MUST maintain steady, quality-focused execution regardless of context warnings.

#### Background Agent Integration

- **FR-032**: Parallel phases MUST be dispatched using Claude Code's `run_in_background: true` parameter.
- **FR-033**: When waiting for background agents, the orchestrator MUST post a brief status update (e.g., "Waiting for Phase 2, 3, 4 to complete...") and then wait for results using `AgentOutputTool` with `block: true`.
- **FR-034**: The orchestrator MUST NOT poll or micromanage background agents; they complete when they complete.
- **FR-035**: Results from all parallel agents MUST be collected before proceeding to phases that depend on them.

### Non-Functional Requirements

- **NFR-001**: Performance - Haiku subagents should provide ~5x speedup over Opus for file read/write operations.
- **NFR-002**: Cost - Using Haiku for scoped tasks should reduce token costs by approximately 90% for those operations.
- **NFR-003**: Context - Orchestrator context usage should be minimized by delegating code I/O to subagents.
- **NFR-004**: Reliability - Failed subagent tasks should not crash the orchestration; orchestrator handles failures gracefully.

### Key Entities

- **Phase**: A numbered, testable chunk of functionality comprising stub, test, implementation, and validation steps. May depend on other phases. May be parallelizable.
- **Subagent**: A specialized Claude instance with restricted tools, focused instructions, and a name indicating its phase and role.
- **Orchestrator**: The Opus-powered main agent that coordinates subagents, referees disputes, manages checkpoints, and communicates with the user.
- **Status Checkpoint**: A designated sync point where all parallel work completes and the orchestrator pauses for user approval.
- **Complication**: An issue the orchestrator cannot resolve autonomously, requiring escalation and potential replanning.

---

## Success Criteria

- [ ] Phases execute in correct TDD order (stub → failing tests → implementation → passing tests → validation)
- [ ] Subagents run tests themselves and report results (orchestrator doesn't run tests directly)
- [ ] Test writer cannot modify production code (enforced by agent definition)
- [ ] Implementer cannot modify test files (enforced by agent definition)
- [ ] Subagent names include phase number for clear identification
- [ ] Parallel phases actually run concurrently via background agents
- [ ] Orchestrator waits for background agents without polling/micromanaging
- [ ] Status checkpoints pause for user approval
- [ ] tasks.md checkboxes update as phases complete
- [ ] Orchestrator successfully handles at least one complication/escalation in testing
- [ ] Cost reduction demonstrated vs current all-Opus implementation

---

## Scope & Boundaries

### In Scope
- Overhaul of `/cc-track:tasks` command to produce phase-based TDD breakdown with checkpoints
- Definition of four specialized subagents (stub writer, test writer, implementer, validator)
- Orchestration logic for coordinating subagents in TDD sequence
- Integration with Claude Code's background agent feature
- Parallel phase execution for independent work
- Status checkpoints for user approval at sync points
- Escalation and complication handling
- Automatic tasks.md checkbox updates

### Out of Scope
- Changes to `/cc-track:specify` command (already has exploration agents)
- Changes to `/cc-track:plan` command (already has research delegation)
- Changes to `/cc-track:prepare-completion` code review (already overhauled in Task 109)
- New agent personas beyond the four core roles
- Git operations during phase execution (handled at task completion)
- UI/UX changes to status line

---

## Clarifications

### Session 2025-12-07
- Q: Should the implementer be able to run tests? → A: Yes, and it MUST run tests and include output in its response.
- Q: What model for subagents? → A: Haiku for speed/cost, possibly Sonnet for complex implementations. Orchestrator decides.
- Q: Hard limit on test/implementation dispute iterations? → A: No, trust Opus judgment to escalate when appropriate.
- Q: Validator scope? → A: Narrow - just verify the phase did what requirements said, not a full code review.
- Q: Granularity of phases? → A: Testable functionality chunks. Could be one function or several wired together. Balance between "build everything at once" and "unit test every private function."
- Q: Should orchestrator run tests directly? → A: No, subagents run tests and report output. Orchestrator reviews their reports. Validator catches issues that slip through.
- Q: How should orchestrator handle import errors in tests? → A: Clear instructions to test writer about requirements; stubs must exist first.
- Q: Should orchestrator poll background agents? → A: No, post a status update and wait with `block: true`. No micromanaging.
- Q: What should orchestrator do while waiting? → A: Post brief status update, then wait. Don't burn tokens pondering or asking user for input.
- Q: Can subagents be named? → A: Yes, use consistent naming pattern with phase number (e.g., "Phase-3-TestWriter").
- Q: When should orchestrator escalate? → A: When it can't resolve an issue autonomously - technical difficulties, plan won't work, needs replanning.
- Q: What's the escalation procedure? → A: "Stop and settle" - stop delegating new tasks, wait for all in-flight agents to complete, update tasks.md with current status, THEN raise with user. This prevents agents interrupting the conversation.
- Q: How should orchestrator handle context limit warnings? → A: Ignore them as cause for concern. cc-track's tasks.md provides durable state, so compaction isn't disruptive. No rushing or cutting corners - maintain steady, quality execution.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All sections completed or marked N/A

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified
- [x] Edge cases documented

---

## Dependencies & Assumptions

- **Dependency**: Claude Code's background agent feature (`run_in_background: true`) is functional (confirmed working 2025-12-07)
- **Dependency**: Agent definitions can restrict tools via the `tools` field in YAML frontmatter
- **Dependency**: Task tool's `description` parameter can be used for agent naming/identification
- **Assumption**: Haiku is capable of handling well-scoped implementation tasks (1-2 files)
- **Assumption**: Orchestrator (Opus) has sufficient judgment to referee disputes and decide when to escalate
- **Assumption**: Existing `/cc-track:plan` phase breakdown can inform the new tasks.md structure with minimal changes
- **Assumption**: Subagents given clear instructions will run tests and report output reliably

---

## Open Questions
*None - all questions resolved during specification session*
