# Tasks: Migrate Context Files to .cc-track Directory

**Feature ID**: `104`
**Branch**: `104-migrate-context-files-to-cc-track`
**Prerequisites**: plan.md, spec.md
**Input**: Design documents from `.claude/specs/104-migrate-context-files-to-cc-track/`

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in task descriptions
- Tasks are numbered sequentially (T001, T002, etc.)

## Task Execution Rules
1. **Order**: Sequential phases, parallel within phases where marked
2. **Dependencies**: Tasks without `[P]` must be completed sequentially
3. **Parallel Tasks**: Tasks marked `[P]` can be worked on simultaneously
4. **File Conflicts**: Never mark tasks `[P]` if they modify the same file
5. **Verification**: Run tests after each phase to catch issues early

---

## Phase 1: Constitution Amendment

- [ ] T001 Amend `.claude/constitution.md` to v1.2.0: update all `.claude/` references for cc-track files to `.cc-track/`, keep `.claude/settings.json` reference, update version and "Last Amended" date

---

## Phase 2: TypeScript Production Code Updates

**Update path references from `.claude/` to `.cc-track/`**

- [ ] T002 [P] Update `hooks/edit-validation.ts`: change `'.claude', 'track.config.json'` to `'.cc-track', 'track.config.json'`
- [ ] T003 [P] Update `hooks/pre-tool-validation.ts`: change regex patterns `\.claude\/tasks\/` → `\.cc-track\/tasks\/` and `\.claude\/specs\/` → `\.cc-track\/specs\/`
- [ ] T004 [P] Update `scripts/statusline.ts`: change `@.claude/no_active_task.md` → `@.cc-track/no_active_task.md`
- [ ] T005 [P] Update `skills/cc-track-tools/lib/config.ts`: change `'.claude', 'track.config.json'` → `'.cc-track', 'track.config.json'`
- [ ] T006 [P] Update `skills/cc-track-tools/lib/spec-helpers.ts`: change all `'.claude', 'specs'` paths and `@\.claude\/specs\/` regex to `.cc-track` equivalents
- [ ] T007 [P] Update `skills/cc-track-tools/lib/claude-md.ts`: change `@\.claude\/specs\/` regex → `@\.cc-track\/specs\/`
- [ ] T008 [P] Update `skills/cc-track-tools/scripts/complete-task.ts`: change `no_active_task.md` path, claude dir reference, and `@.claude/specs/` regex replacement
- [ ] T009 [P] Update `skills/cc-track-tools/scripts/backlog.ts`: change `'.claude', 'backlog.md'` → `'.cc-track', 'backlog.md'`

---

## Phase 3: Config File Updates

- [ ] T010 [P] Update `tsconfig.json`: change `".claude/**/*.ts"` → `".cc-track/**/*.ts"`
- [ ] T011 [P] Update `biome.json`: change `".claude/**/*.md"` → `".cc-track/**/*.md"`
- [ ] T012 [P] Update `knip.json`: change `".claude/**"` → `".cc-track/**"`

---

## Phase 4: Template Updates

- [ ] T013 [P] Update `templates/CLAUDE.md`: change all `@.claude/` imports → `@.cc-track/`
- [ ] T014 [P] Update `templates/plan-template.md`: change `@.claude/specs/` and `@.claude/constitution.md` → `@.cc-track/`
- [ ] T015 [P] Update `templates/tasks-template.md`: change `.claude/specs/` → `.cc-track/specs/`
- [ ] T016 [P] Update `templates/constitution-template.md`: change `.claude/system_patterns.md` and other context file references → `.cc-track/`

---

## Phase 5: Slash Command Updates

- [ ] T017 [P] Update `commands/add-to-backlog.md`: change `.claude/backlog.md` → `.cc-track/backlog.md`
- [ ] T018 [P] Update `commands/config-track.md`: change `.claude/track.config.json` → `.cc-track/track.config.json`
- [ ] T019 [P] Update `commands/constitution.md`: change `.claude/constitution.md` → `.cc-track/constitution.md`
- [ ] T020 [P] Update `commands/plan.md`: change all `.claude/specs/` and `.claude/constitution.md` → `.cc-track/`
- [ ] T021 [P] Update `commands/prepare-completion.md`: change `.claude/specs/` and `.claude/constitution.md` → `.cc-track/`
- [ ] T022 [P] Update `commands/setup-cc-track.md`: change all `.claude/` context file references → `.cc-track/`
- [ ] T023 [P] Update `commands/specify.md`: change `.claude/specs/` and `.claude/track.config.json` → `.cc-track/`
- [ ] T024 [P] Update `commands/tasks.md`: change `.claude/specs/` → `.cc-track/specs/`

---

## Phase 6: Migration Command Update

- [ ] T025 Update `commands/migrate.md` to handle two migration paths:

  **Goal state**: `.cc-track/` with spec-driven format (specs/, context files, etc.)

  **Migration Path A**: Old cc-track format (`.claude/tasks/TASK_XXX.md`)
  - Preserve existing instructions for converting to spec-driven format
  - But target location is now `.cc-track/specs/` instead of `.claude/specs/`

  **Migration Path B**: Current cc-track format (`.claude/specs/`, `.claude/*.md`)
  - Move all cc-track files from `.claude/` to `.cc-track/`
  - Create `.cc-track/` directory structure
  - Move: specs/, backlog.md, constitution.md, context files, etc.
  - Leave Claude Code files in `.claude/` (settings.json, settings.local.json)
  - Update CLAUDE.md imports from `@.claude/` to `@.cc-track/`

  **Detection logic** (for Claude to follow):
  1. If `.cc-track/specs/` exists → Already migrated, nothing to do
  2. If `.claude/tasks/TASK_*.md` exists → Path A (old format → spec-driven in .cc-track)
  3. If `.claude/specs/` exists → Path B (current format → move to .cc-track)
  4. If neither exists → Fresh project, run `/cc-track:setup-cc-track` instead

---

## Phase 7: Documentation Updates

- [ ] T026 [P] Update `README.md`: change all `.claude/` references for cc-track files → `.cc-track/`
- [ ] T027 [P] Update `AGENTS.md`: change `.claude/specs/` → `.cc-track/specs/`
- [ ] T028 [P] Update `docs/LINTING.md`: change `.claude/track.config.json` → `.cc-track/track.config.json`

---

## Phase 8: Test File Updates

- [ ] T029 Update test files with `.claude/` path references → `.cc-track/`:
  - `hooks/edit-validation.test.ts`
  - `hooks/pre-tool-validation.test.ts`
  - `scripts/statusline.test.ts`
  - `skills/cc-track-tools/lib/config.test.ts`
  - `skills/cc-track-tools/lib/spec-helpers.test.ts`
  - `skills/cc-track-tools/lib/claude-md.test.ts`
  - `skills/cc-track-tools/lib/validation.test.ts`
  - `skills/cc-track-tools/scripts/*.test.ts`
  - Any other test files with `.claude/` references

---

## Phase 9: Verification

- [ ] T030 Run full test suite: `bun test` - all tests must pass
- [ ] T031 Run TypeScript check: `bunx tsc --noEmit` - no errors
- [ ] T032 Run Biome lint: `bunx biome check` - no errors
- [ ] T033 Verify no stray `.claude/` references: `grep -r "\.claude/" --include="*.ts" --include="*.md"` should only show Claude Code owned file references (settings.json)

---

## Phase 10: Dogfood Migration

- [ ] T034 Move cc-track's own context files from `.claude/` to `.cc-track/`:
  - Create `.cc-track/` directory
  - Move: `specs/`, `backlog.md`, `cc-track-workflow.md`, `code_index.md`, `constitution.md`, `decision_log.md`, `learned_mistakes.md`, `no_active_task.md`, `plans-archive/`, `product_context.md`, `progress_log.md`, `research/`, `system_patterns.md`, `track.config.json`, `user_context.md`
  - Leave in `.claude/`: `settings.json`, `settings.local.json`
- [ ] T035 Update project `CLAUDE.md`: change all `@.claude/` imports → `@.cc-track/`
- [ ] T036 Final verification: confirm `@` imports work with new `.cc-track/` paths

---

## Dependencies Graph

```
T001 (Constitution) → T002-T009 (TypeScript) → T010-T012 (Config) → T013-T016 (Templates)
                   → T017-T024 (Commands) → T025 (Migrate Command) → T026-T028 (Docs)
                   → T029 (Tests) → T030-T033 (Verification) → T034-T036 (Dogfood)

Parallel groups:
- T002-T009 can run in parallel
- T010-T012 can run in parallel
- T013-T016 can run in parallel
- T017-T024 can run in parallel
- T026-T028 can run in parallel
```

---

## Validation Checklist
*Verify before declaring complete*

- [ ] All `.claude/` references for cc-track files updated to `.cc-track/`
- [ ] `.claude/settings.json` references preserved (Claude Code owned)
- [ ] Constitution amended to v1.2.0
- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] Biome lint passes
- [ ] `/migrate` command has dual-purpose instructions
- [ ] cc-track's own files are in `.cc-track/` (dogfooding complete)
- [ ] CLAUDE.md imports point to `.cc-track/`

---

## Task Progress Tracking
*Updated during implementation*

**Phase Completion**:
- [ ] Phase 1: Constitution (T001)
- [ ] Phase 2: TypeScript (T002-T009)
- [ ] Phase 3: Config (T010-T012)
- [ ] Phase 4: Templates (T013-T016)
- [ ] Phase 5: Commands (T017-T024)
- [ ] Phase 6: Migrate Command (T025)
- [ ] Phase 7: Documentation (T026-T028)
- [ ] Phase 8: Tests (T029)
- [ ] Phase 9: Verification (T030-T033)
- [ ] Phase 10: Dogfood (T034-T036)

**Overall Progress**: 0/36 tasks complete
