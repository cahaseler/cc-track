# Feature Specification: Align Planning Phase with Phase-Based Task Orchestration

**Feature ID**: `111`
**Branch**: `111-align-planning-phase-with-phase-based-task-orchest`
**Created**: 2025-12-07
**Status**: Draft

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers
- 🔍 Use [NEEDS CLARIFICATION: specific question] for any ambiguity

---

## User Scenarios & Testing

### Primary User Story
As a developer using cc-track, I want the `/cc-track:plan` command to produce clear, architecture-focused plans that feed cleanly into the phase-based TDD orchestration system, so that there's no confusion between workflow steps and implementation phases.

### Acceptance Scenarios
1. **Given** I run `/cc-track:plan`, **When** the command describes its workflow, **Then** it uses "Step 1, Step 2, Step 3" terminology (not "Phase")
2. **Given** I complete `/cc-track:plan`, **When** I review the generated plan.md, **Then** it focuses on technology decisions and architecture, not task-level details
3. **Given** I run `/cc-track:tasks`, **When** the command describes its workflow, **Then** it uses "Step" for workflow instructions and reserves "Phase" exclusively for TDD implementation units
4. **Given** I review any cc-track command, **When** I see numbered steps, **Then** they are consecutive whole numbers starting at 1 (no 0.5, 0.6, 0, 1 sequences)

### Edge Cases
- What happens if someone has existing plan.md files using old template? → Out of scope, no migration needed
- How does this affect the specify command? → It also needs "Phase" → "Step" renaming for consistency

---

## Requirements

### Functional Requirements

**Terminology Consistency**
- **FR-001**: All cc-track commands MUST use "Step" for workflow instructions (Step 1, Step 2, etc.)
- **FR-002**: Only `tasks.md` and `tasks-template.md` MAY use "Phase" to describe TDD implementation units
- **FR-003**: All workflow steps MUST be numbered as consecutive whole numbers starting at 1

**Plan Command Focus**
- **FR-004**: `/cc-track:plan` MUST focus on technology decisions and architecture choices
- **FR-005**: `/cc-track:plan` MUST NOT include task-level step-by-step details (that's `/cc-track:tasks` job)
- **FR-006**: `/cc-track:plan` MUST NOT preview or describe what `/cc-track:tasks` will generate

**Plan Template Simplification**
- **FR-007**: `plan-template.md` MUST NOT include Progress Tracking checkboxes (plan is written after discussion)
- **FR-008**: `plan-template.md` MUST NOT include Quickstart section
- **FR-009**: `plan-template.md` MUST NOT include "Phase 2: Task Generation Approach" section
- **FR-010**: `plan-template.md` MUST focus on: Summary, Technical Context, Constitution Check, Key Decisions, Project Structure, Risk Assessment

**Command Updates**
- **FR-011**: `commands/specify.md` MUST rename Phase 0/1/1.5/2/3 → Step 1/2/3/4/5
- **FR-012**: `commands/plan.md` MUST rename Phase 0.5/0.6/0/1/2/3/4 → Step 1/2/3/4/5/6/7
- **FR-013**: `commands/tasks.md` MUST rename Phase 1/2/3/4/5 (workflow steps) → Step 1/2/3/4/5

### Non-Functional Requirements
- **NFR-001**: Changes MUST be backward compatible (no migration scripts needed)
- **NFR-002**: Changes MUST be limited to markdown command/template files (no TypeScript changes)

### Key Entities
- **Workflow Step**: A numbered instruction within a cc-track command (Step 1, Step 2, etc.)
- **Implementation Phase**: A testable chunk of functionality in tasks.md (Phase 1: Email Validation, Phase 2: Auth Service)

---

## Success Criteria
- [ ] No command file uses "Phase" for workflow steps
- [ ] All workflow steps are numbered 1, 2, 3, 4, 5 (whole numbers, no decimals or zeros)
- [ ] Plan template focuses on architecture, not task generation
- [ ] Clear separation: "Step" = command workflow, "Phase" = TDD implementation unit
- [ ] Quickstart section removed from plan command and template
- [ ] Progress tracking removed from plan template

---

## Scope & Boundaries

### In Scope
- `commands/specify.md` - Phase → Step renaming, renumbering
- `commands/plan.md` - Phase → Step renaming, renumbering, remove task preview sections
- `commands/tasks.md` - Phase → Step renaming for workflow (keep Phase for implementation units)
- `templates/plan-template.md` - Simplify, remove Progress Tracking, Quickstart, Task Generation Approach
- `templates/tasks-template.md` - Verify no workflow "Phase" usage (should be clean already)

### Out of Scope
- Migration of existing spec/plan files
- TypeScript code changes
- Changes to prepare-completion, complete-task, or other commands
- Changes to agent definitions

---

## Clarifications
*Key decisions made during specification*

### Session 2025-12-07
- Q: Should plan.md describe what tasks will be generated? → A: No, plan focuses on architecture/technology. Tasks command handles that.
- Q: Is quickstart valuable? → A: No, removed from scope.
- Q: What about existing plan.md files? → A: No migration, only affects new plans.
- Q: Should spec template also be updated? → A: No, spec template doesn't use "Phase" terminology.

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
- Task 110 (Phase-Based TDD Orchestration) is complete and merged
- No other commands use "Phase" terminology for workflows

---

## Open Questions
*None - all questions resolved during specification*
