# Feature Specification: Migrate Context Files to .cc-track Directory

**Feature ID**: `104`
**Branch**: `104-migrate-context-files-to-cc-track`
**Created**: 2025-12-06
**Status**: Specified

## Quick Summary

Anthropic has updated Claude Code to always prompt for permission when editing files in `.claude/`, regardless of permission settings. This is reasonable security since that's where Claude's permissions live, but it breaks cc-track's seamless workflow. Move all cc-track owned context files to a new `.cc-track/` directory to restore frictionless operation.

---

## User Scenarios & Testing

### Primary User Story
As a developer using cc-track, I want my context files stored in `.cc-track/` so that Claude can edit them without permission prompts, restoring the seamless workflow cc-track was designed for.

### Acceptance Scenarios
1. **Given** an existing project with cc-track files in `.claude/`, **When** user runs `/migrate`, **Then** all cc-track owned files are moved to `.cc-track/` and CLAUDE.md imports are updated
2. **Given** a new project, **When** user runs `/cc-track:init`, **Then** context files are created in `.cc-track/` (not `.claude/`)
3. **Given** a project without `.cc-track/` folder, **When** user runs `/specify`, **Then** they are told to run `/migrate` first
4. **Given** a project with both `.claude/` and `.cc-track/` locations, **When** cc-track commands run, **Then** they use `.cc-track/` exclusively

### Edge Cases
- What happens when user has custom files in `.claude/`? → Only move known cc-track files, leave others untouched
- What happens when `.cc-track/` already exists with some files? → Merge carefully, don't overwrite existing files
- What happens when migration fails midway? → Rollback mechanism or clear error with recovery instructions

---

## Requirements

### Functional Requirements
- **FR-001**: System MUST move these cc-track owned files/directories from `.claude/` to `.cc-track/`:
  - `specs/` - Feature specifications
  - `backlog.md` - Backlog items
  - `cc-track-workflow.md` - Workflow guide
  - `code_index.md` - Code index
  - `constitution.md` - Project guardrails
  - `decision_log.md` - Decision log
  - `no_active_task.md` - Active task placeholder
  - `product_context.md` - Product context
  - `progress_log.md` - Progress log
  - `system_patterns.md` - System patterns
  - `track.config.json` - cc-track config
  - `user_context.md` - User context
- **FR-001a**: During dogfood migration, these legacy files were reviewed and intentionally removed:
  - `learned_mistakes.md` - Reviewed; valuable patterns extracted to `system_patterns.md`, file deleted (auto-extraction was producing dangerous advice)
  - `plans-archive/` - Reviewed; confirmed as duplicates of content already in `specs/` folders, deleted
  - `research/` - Project-specific research notes, not part of standard cc-track setup
- **FR-002**: System MUST leave Claude Code owned files in `.claude/`:
  - `settings.json`
  - `settings.local.json`
  - Any other non-cc-track files
- **FR-003**: System MUST update CLAUDE.md template to use `@.cc-track/...` imports instead of `@.claude/...`
- **FR-004**: `/specify` command MUST check for `.cc-track/` folder existence and direct users to run `/migrate` if missing
- **FR-005**: `/migrate` command MUST include instructions for moving files from `.claude/` to `.cc-track/`
- **FR-006**: All cc-track commands that reference context files MUST use `.cc-track/` path
- **FR-007**: System MUST update any hardcoded `.claude/` paths in cc-track codebase to `.cc-track/`

### Non-Functional Requirements
- **NFR-001**: Migration MUST preserve all file contents exactly (no data loss)
- **NFR-002**: Migration SHOULD complete in under 5 seconds for typical projects
- **NFR-003**: Migration MUST be idempotent (running twice should not cause errors)

### Key Entities
- **CC-Track Context Files**: The set of markdown and JSON files that cc-track manages for project context
- **Claude Code Files**: Files owned by Claude Code itself (settings.json, etc.) that must remain in `.claude/`

---

## Success Criteria
- [ ] New projects get context files in `.cc-track/` by default
- [ ] Existing projects can migrate via `/migrate` command
- [ ] Claude no longer prompts for permission when editing context files
- [ ] All cc-track commands work correctly with new `.cc-track/` location
- [ ] No data loss during migration

---

## Scope & Boundaries

### In Scope
- Moving cc-track context files to `.cc-track/`
- Updating CLAUDE.md template imports
- Updating `/migrate` command for `.claude/` → `.cc-track/` migration (instructions for Claude, not scripts)
- Updating `/specify` to gate on `.cc-track/` existence
- Updating all cc-track commands/scripts with new paths
- Updating spec-helpers.ts and other libs with new paths

### Out of Scope
- Changing how Claude Code handles `.claude/` folder permissions (Anthropic's decision)
- Moving Claude Code owned files (settings.json, etc.)
- Backward compatibility mode (no "check both locations" fallback)
- Migrating cc-track's own development files (this is for end-user projects)

---

## Files Requiring Updates

### TypeScript/JavaScript Production Code

| File | Lines | Reference Type |
|------|-------|----------------|
| `hooks/edit-validation.ts` | 100 | `join(cwd, '.claude', 'track.config.json')` |
| `hooks/pre-tool-validation.ts` | 179, 186 | Regex: `\.claude\/tasks\/`, `\.claude\/specs\/` |
| `scripts/statusline.ts` | 142 | String check: `@.claude/no_active_task.md` |
| `skills/cc-track-tools/lib/config.ts` | 155, 162 | Path join for `track.config.json` |
| `skills/cc-track-tools/lib/spec-helpers.ts` | 40, 76, 152, 187, 193, 309 | `'.claude', 'specs'` paths + regex |
| `skills/cc-track-tools/lib/claude-md.ts` | 44 | Regex: `@\.claude\/specs\/` |
| `skills/cc-track-tools/scripts/complete-task.ts` | 367, 675, 817 | `no_active_task.md`, claude dir, regex replacement |
| `skills/cc-track-tools/scripts/backlog.ts` | 30 | `'.claude', 'backlog.md'` |

### Config Files

| File | Reference |
|------|-----------|
| `tsconfig.json` | `".claude/**/*.ts"` → `".cc-track/**/*.ts"` |
| `biome.json` | `".claude/**/*.md"` → `".cc-track/**/*.md"` |
| `knip.json` | `".claude/**"` → `".cc-track/**"` |

### Templates

| File | References |
|------|------------|
| `templates/CLAUDE.md` | All `@.claude/...` imports → `@.cc-track/...` |
| `templates/plan-template.md` | `@.claude/specs/`, `@.claude/constitution.md` |
| `templates/tasks-template.md` | `.claude/specs/` |
| `templates/constitution-template.md` | `.claude/system_patterns.md`, etc. |

### Slash Commands (in `commands/`)

| File | Key References |
|------|----------------|
| `add-to-backlog.md` | `.claude/backlog.md` |
| `config-track.md` | `.claude/track.config.json` |
| `constitution.md` | `.claude/constitution.md` |
| `migrate.md` | `.claude/tasks/`, `.claude/specs/`, `.claude/tasks.backup/` |
| `plan.md` | `.claude/specs/`, `.claude/constitution.md` |
| `prepare-completion.md` | `.claude/specs/`, `.claude/constitution.md` |
| `setup-cc-track.md` | All `.claude/` context files |
| `specify.md` | `.claude/specs/`, `.claude/track.config.json` |
| `tasks.md` | `.claude/specs/` |

### Documentation

| File | Note |
|------|------|
| `README.md` | Multiple references to `.claude/` structure |
| `AGENTS.md` | References to `.claude/specs/` |
| `docs/LINTING.md` | `.claude/track.config.json` |

### Test Files (50+ references)
- `hooks/pre-tool-validation.test.ts`
- `scripts/statusline.test.ts`
- `skills/cc-track-tools/lib/*.test.ts`

**Note**: The `/migrate` command provides instructions for Claude to follow, not automated scripts. We trust the project's Claude instance to execute the migration steps correctly based on clear instructions.

---

## Clarifications
*Key decisions made during specification*

### Session 2025-12-06
- Q: Which files should remain in .claude/? → A: Only Claude Code files (settings.json, settings.local.json). Move all cc-track owned files.
- Q: How handle migration for existing projects? → A: `/specify` checks for `.cc-track/`, tells user to run `/migrate` if missing
- Q: Should CLAUDE.md move? → A: No, CLAUDE.md stays at project root. Just update its `@` imports to point to `.cc-track/`
- Q: How handle user's custom files in .claude/? → A: Only move known cc-track files (explicit list), leave others untouched
- Q: Do @ imports work with non-.claude paths? → A: Yes, update imports (user confirmed this is the approach)

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
- Claude Code's `@` import syntax works with paths outside `.claude/` directory
- Users will run `/migrate` command when prompted by `/specify`
- Git will track the file moves properly (mv preserves history with git mv)

---

## Open Questions
*None - all questions resolved during specification*
