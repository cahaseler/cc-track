# Feature Specification: cc-track Workflow Cleanup

**Feature ID**: `105`
**Branch**: `105-cc-track-workflow-cleanup`
**Created**: 2025-12-06
**Status**: Specified

## Quick Summary

Two minor cleanup items bundled together:
1. Update command references to use namespaced `/cc-track:` format
2. Simplify pre-tool-validation hook to protect `.metadata.json` instead of obsolete task file patterns

---

## User Scenarios & Testing

### Primary User Story
As a cc-track user, I want slash command suggestions to use the correct namespaced format so that I can copy-paste them directly without confusion about which `/plan` command (native vs cc-track) is being referenced.

### Acceptance Scenarios

**Command Naming:**
1. **Given** I run `/cc-track:plan`, **When** it completes, **Then** the "next step" message shows `/cc-track:tasks` not `/tasks`
2. **Given** I run `/cc-track:specify`, **When** it suggests next steps, **Then** it uses `/cc-track:plan` format
3. **Given** I read cc-track-workflow.md, **When** I see command references, **Then** they use `/cc-track:` prefix

**Hook Protection:**
4. **Given** I try to Edit `.metadata.json` directly, **When** the edit is attempted, **Then** it is blocked with clear message
5. **Given** I try to Write a new `.metadata.json`, **When** the write is attempted, **Then** it is blocked
6. **Given** I run `/cc-track:complete-task`, **When** the script updates metadata, **Then** it succeeds (scripts bypass hooks)

---

## Requirements

### Functional Requirements

**Command Naming (FR-1xx):**
- **FR-101**: All slash commands in `commands/*.md` MUST reference other cc-track commands using `/cc-track:` prefix
- **FR-102**: Templates that reference cc-track commands MUST use namespaced format
- **FR-103**: The cc-track-workflow.md guide MUST use namespaced command references

**Hook Simplification (FR-2xx):**
- **FR-201**: Pre-tool-validation hook MUST block Edit/Write/MultiEdit operations targeting `.metadata.json` files in `.cc-track/specs/` directories
- **FR-202**: Block message MUST explain that metadata files should only be modified via cc-track scripts
- **FR-203**: Hook MUST NOT call Claude SDK for validation (remove weasel-word detection)
- **FR-204**: Hook MUST NOT validate `tasks.md` content (remove obsolete check)

### Non-Functional Requirements
- **NFR-001**: Hook execution should be faster without SDK calls
- **NFR-002**: Block messages should be clear and actionable

---

## Success Criteria
- [ ] All `/plan`, `/specify`, `/tasks`, `/prepare-completion`, `/complete-task` references updated to `/cc-track:` format in commands and workflow guide
- [ ] Pre-tool-validation hook blocks `.metadata.json` edits with clear message
- [ ] Claude SDK validation code removed from hook
- [ ] `tasks.md` content validation removed
- [ ] All existing tests pass (or are updated to reflect new behavior)

---

## Scope & Boundaries

### In Scope
- Slash command files in `commands/` directory
- Template file references
- `.cc-track/cc-track-workflow.md`
- `hooks/pre-tool-validation.ts` simplification
- Related tests

### Out of Scope
- Historical spec files (don't update old completed specs)
- Agent definition files (those have different context)
- CHANGELOG.md (historical record)
- Context files that just document the system
- Any files outside the command/template/hook scope

---

## Clarifications

### Session 2025-12-06
- Q: Should we update ALL references or just user-facing? → A: Slash commands and templates only
- Q: Which naming pattern? → A: Always `/cc-track:plan` format (with slash and colon)
- Q: What files to protect? → A: Just `.metadata.json`, remove tasks.md protection
- Q: What about weasel-word detection? → A: Remove entirely - no longer relevant
- Q: Behavior when editing metadata? → A: Block completely with message about using scripts

---

## Technical Context (for planning reference)

Current hook state:
- `isTaskFile()` matches `tasks.md` in spec directories
- Calls Claude SDK for expensive validation
- Original intent was to protect status field, which is now in `.metadata.json`

Files to update:
- `commands/plan.md` - lines 34, 374, 432
- `commands/specify.md` - next step suggestion
- `commands/tasks.md` - next step suggestion
- `commands/prepare-completion.md` - next step suggestion
- `.cc-track/cc-track-workflow.md` - workflow documentation
- `hooks/pre-tool-validation.ts` - simplify protection logic
- Related test files

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] All sections completed or marked N/A

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
