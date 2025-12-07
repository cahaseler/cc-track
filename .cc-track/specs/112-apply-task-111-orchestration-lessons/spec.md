# Feature Specification: Apply Task 111 Orchestration Lessons

**Feature ID**: `112`
**Branch**: `112-apply-task-111-orchestration-lessons`
**Created**: 2025-12-07
**Status**: Specified

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers
- 🔍 Use [NEEDS CLARIFICATION: specific question] for any ambiguity

---

## User Scenarios & Testing

### Primary User Story
As a cc-track user, I want the workflow commands and templates to incorporate lessons learned from Task 111's orchestration experience, so that future task implementations benefit from improved patterns.

### Acceptance Scenarios
1. **Given** a user runs `/cc-track:specify`, **When** they provide a clear feature idea, **Then** Claude should create the task title and begin work without asking for approval of the title
2. **Given** a user runs `/cc-track:prepare-completion`, **When** review agents are launched, **Then** they run in non-background mode so the UI clearly shows progress and results are available for deduplication
3. **Given** a user reads `tasks.md` orchestration instructions, **When** parallel phases complete, **Then** instructions describe pipeline flow (dispatch next step per-phase as each completes) rather than batch-wait pattern
4. **Given** a tasks.md file, **When** viewing progress, **Then** there is no redundant "Completed Phases: X/Y" counter since the status table already tracks this

### Edge Cases
- N/A - These are documentation-only changes with no runtime behavior

---

## Requirements

### Functional Requirements
- **FR-001**: The specify command MUST instruct Claude to create a task title and begin work without approval, unless the title is genuinely unclear
- **FR-002**: The prepare-completion command MUST instruct agents to run without `run_in_background: true` so results appear in real-time
- **FR-003**: The tasks.md command MUST describe pipeline flow pattern where each phase's next step is dispatched as soon as the previous completes (not batch-wait)
- **FR-004**: The tasks.md command MUST clarify that `[P]` dependencies mean the full Implement→Validate cycle, not just Implement
- **FR-005**: The tasks-template.md MUST NOT have a separate "Completed Phases: X/Y" counter (status table is sufficient)

### Non-Functional Requirements
- N/A - Documentation changes only

### Key Entities
- N/A - No data model changes

---

## Success Criteria
- [x] specify.md Step 1 updated to allow Claude to proceed with task title
- [x] prepare-completion.md Step 4 updated to remove `run_in_background` from agent instructions
- [x] tasks.md Orchestration Instructions updated with pipeline flow pattern
- [x] tasks.md updated with dependency enforcement clarification
- [x] tasks-template.md "Completed Phases" counter removed

---

## Scope & Boundaries

### In Scope
- `commands/specify.md` - Minor wording tweak in Step 1
- `commands/prepare-completion.md` - Remove background execution from agent launch instructions
- `commands/tasks.md` - Update orchestration instructions with lessons learned
- `templates/tasks-template.md` - Remove redundant phase counter

### Out of Scope
- Any TypeScript code changes
- Any hook modifications
- Any script changes
- Changes to other commands or templates

---

## Clarifications
*Key decisions made during specification*

### Session 2025-12-07
- Q: Is item #1 just updating prompt text? → A: Yes, just adjusting specify.md wording
- Q: For item #2, is this about clearer UI and waiting for results? → A: Yes, non-background means clearer progress in UI and ensures all results are available before deduplication step
- Q: Should all 3 lessons from Task 111 Notes be applied? → A: Yes - pipeline flow, dependency enforcement, remove redundant counter

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
- Assumes Task 111 documentation (notes section) accurately captures lessons learned
- No code dependencies - all changes are markdown files

---

## Open Questions
*None - all requirements are clear*
