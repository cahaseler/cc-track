# Tasks: Migrate to Claude Code Plugin System

**Feature ID**: `101`
**Branch**: `101-migrate-to-claude-code-plugin-system`
**Prerequisites**: plan.md, spec.md, research.md
**Input**: Design documents from `.claude/specs/101-migrate-to-claude-code-plugin-system/`

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in task descriptions
- Tasks are numbered sequentially (T001, T002, etc.)

## Path Conventions
This migration restructures from:
- **Current**: `src/` wrapper with `dist/` binaries
- **Target**: Plugin root structure following Claude Code conventions

## CRITICAL: .claude/ Directory Untouched
**`.claude/` is THIS project's development files - DO NOT MODIFY**
- We distribute from `src/` and `templates/`
- `.claude/` is our dogfooding setup and stays intact

---

## Phase 1: Plugin Infrastructure Setup

- [x] T001 Create .claude-plugin/ directory and plugin.json with metadata (name, description, version 3.0.0, author, repository, keywords)
- [x] T002 Create hooks/ directory and hooks.json registering edit-validation.ts (PostToolUse) and pre-tool-validation.ts (PreToolUse)
- [x] T003 Update package.json to remove commander dependency and update description for plugin usage
- [x] T004 Create scripts/ directory for non-hook scripts
- [x] T005 Update .gitignore to exclude node_modules, add plugin-specific patterns, remove dist/ patterns
- [x] T006 [P] Create marketplace repository cc-track-marketplace with .claude-plugin/marketplace.json - ✅ Craig created repo at https://github.com/cahaseler/cc-track-marketplace (MANUAL)
- [x] T007 [P] Create marketplace README.md with installation instructions - ✅ Craig added marketplace-README.md content to repo (MANUAL)

---

## Phase 2: Code Restructuring (File Movements)

**Note**: T017-T018 (task-from-issue.md, cc-track-uninstall.md) were deprecated and deleted rather than moved.
**Note**: Also moved test-utils/ and all remaining src/commands/*.ts files (context.ts, git-session.ts, init.ts, migrate.ts, setup-*.ts) to commands/.

### Slash Commands Migration (from src/commands/slash-commands/)
- [x] T008 [P] Move src/commands/slash-commands/specify.md to commands/specify.md
- [x] T009 [P] Move src/commands/slash-commands/clarify.md to commands/clarify.md
- [x] T010 [P] Move src/commands/slash-commands/plan.md to commands/plan.md
- [x] T011 [P] Move src/commands/slash-commands/tasks.md to commands/tasks.md
- [x] T012 [P] Move src/commands/slash-commands/complete-task.md to commands/complete-task.md
- [x] T013 [P] Move src/commands/slash-commands/prepare-completion.md to commands/prepare-completion.md
- [x] T014 [P] Move src/commands/slash-commands/add-to-backlog.md to commands/add-to-backlog.md
- [x] T015 [P] Move src/commands/slash-commands/constitution.md to commands/constitution.md
- [x] T016 [P] Move src/commands/slash-commands/config-track.md to commands/config-track.md
- [x] T017 [P] DELETED - task-from-issue.md (deprecated command)
- [x] T018 [P] DELETED - cc-track-uninstall.md (deprecated command)

### Hooks Migration
- [x] T019 Move src/hooks/edit-validation.ts to hooks/edit-validation.ts
- [x] T020 Move src/hooks/pre-tool-validation.ts to hooks/pre-tool-validation.ts

### Library Files Migration
- [x] T021 [P] Move src/lib/config.ts to lib/config.ts
- [x] T022 [P] Move src/lib/git-helpers.ts to lib/git-helpers.ts
- [x] T023 [P] Move src/lib/github-helpers.ts to lib/github-helpers.ts
- [x] T024 [P] Move src/lib/logger.ts to lib/logger.ts
- [x] T025 [P] Move src/lib/log-parser.ts to lib/log-parser.ts
- [x] T026 [P] Move src/lib/claude-sdk.ts to lib/claude-sdk.ts
- [x] T027 [P] Move src/lib/spec-helpers.ts to lib/spec-helpers.ts
- [x] T028 [P] Move src/lib/lint-parsers.ts to lib/lint-parsers.ts

### Command Implementations Migration
- [x] T029 [P] Move src/commands/complete-task.ts to commands/complete-task.ts
- [x] T030 [P] Move src/commands/backlog.ts to commands/backlog.ts
- [x] T031 [P] Move src/commands/prepare-completion.ts to commands/prepare-completion.ts
- [x] T032 [P] Move src/commands/hook.ts to commands/hook.ts
- [x] T033 [P] Move src/commands/parse-logs.ts to commands/parse-logs.ts

### Statusline Migration
- [x] T034 Move src/commands/statusline.ts to scripts/statusline.ts

### Templates (No Move Needed - Already in templates/)
- [x] T035 Verify templates/ directory structure matches plugin requirements (all template files present and correct)

---

## Phase 3: Import Path Updates

**Note**: All files already had relative import paths (../lib/*), so no updates were needed. Only adjustment was scripts/statusline.ts to reference ../commands/context.

### Update Hooks Import Paths
- [x] T036 NO CHANGES NEEDED - Already used relative paths
- [x] T037 NO CHANGES NEEDED - Already used relative paths

### Update Command Implementation Import Paths
- [x] T038 [P] NO CHANGES NEEDED - Already used relative paths
- [x] T039 [P] NO CHANGES NEEDED - Already used relative paths
- [x] T040 [P] NO CHANGES NEEDED - Already used relative paths
- [x] T041 [P] NO CHANGES NEEDED - Already used relative paths
- [x] T042 [P] NO CHANGES NEEDED - Already used relative paths

### Update Scripts Import Paths
- [x] T043 FIXED - Updated scripts/statusline.ts to import from ../commands/context

### Update Library Cross-References
- [x] T044 [P] NO CHANGES NEEDED - Already used relative paths

---

## Phase 4: Slash Command ${CLAUDE_PLUGIN_ROOT} Updates

**Note**: Only 3 commands needed updates (complete-task.md, prepare-completion.md, add-to-backlog.md). The rest (specify.md, clarify.md, plan.md, tasks.md, constitution.md, config-track.md) don't execute TypeScript files.

- [x] T045 [P] NO CHANGES NEEDED - specify.md doesn't execute TS files
- [x] T046 [P] NO CHANGES NEEDED - clarify.md doesn't execute TS files
- [x] T047 [P] NO CHANGES NEEDED - plan.md doesn't execute TS files
- [x] T048 [P] NO CHANGES NEEDED - tasks.md doesn't execute TS files
- [x] T049 [P] UPDATED - commands/complete-task.md uses ${CLAUDE_PLUGIN_ROOT}/commands/complete-task.ts
- [x] T050 [P] UPDATED - commands/prepare-completion.md uses ${CLAUDE_PLUGIN_ROOT}/commands/prepare-completion.ts
- [x] T051 [P] UPDATED - commands/add-to-backlog.md uses ${CLAUDE_PLUGIN_ROOT}/commands/backlog.ts
- [x] T052 [P] NO CHANGES NEEDED - constitution.md doesn't execute TS files
- [x] T053 [P] NO CHANGES NEEDED - config-track.md doesn't execute TS files
- [x] T054 [P] DELETED - task-from-issue.md was deprecated
- [x] T055 [P] DELETED - cc-track-uninstall.md was deprecated

---

## Phase 5: Detection & Validation Logic

**Note**: All tasks complete. Created detection library (T056-T059) and integrated into hooks/pre-tool-validation.ts (T060-T062).

- [x] T056 Add npm detection function to lib/detection.ts (check for global cc-track via which/npm list)
- [x] T057 Add Bun verification function to lib/detection.ts (check for bun binary)
- [x] T058 Add plugin dependency verification to lib/detection.ts (check node_modules in plugin directory)
- [x] T059 Create lib/error-messages.ts with templates for npm/plugin conflicts and missing dependencies
- [x] T060 Integrated npm detection into hooks/pre-tool-validation.ts - checks at startup and blocks with getNpmPluginConflictMessage() if detected
- [x] T061 Integrated Bun verification into hooks/pre-tool-validation.ts - checks at startup and blocks with getBunNotInstalledMessage() if missing
- [x] T062 Integrated dependency verification into hooks/pre-tool-validation.ts - checks at startup and blocks with getMissingDependenciesMessage() if node_modules missing

---

## Phase 6: Test Updates

**Note**: All tasks complete. Created comprehensive test coverage for detection library (T064-T067) and updated pre-tool-validation tests to mock detection functions (T069).

### Test Infrastructure
- [x] T063 NO CHANGES NEEDED - All test imports already used relative paths, verified by test run

### Detection Logic Tests
- [x] T064 [P] Created lib/detection.test.ts with 11 tests for detectNpmPackage (mocked which/npm list commands)
- [x] T065 [P] Created lib/detection.test.ts with 4 tests for verifyBunInstalled (mocked bun --version)
- [x] T066 [P] Created lib/detection.test.ts with 8 tests for verifyPluginDependencies (mocked node_modules checks)

### Error Messages Tests
- [x] T067 [P] Created lib/error-messages.test.ts with 15 tests covering all 4 error message templates and common patterns

### Hook Tests Updates
- [x] T068 [P] NO CHANGES NEEDED - edit-validation tests already correct
- [x] T069 [P] UPDATED - Added createMockDetectionFunctions() helper and updated all 17 preToolValidationHook test calls to include detection mocks

### Integration Test Run
- [x] T070 Run full test suite (bun test) and verify all tests pass with new structure - ✅ 435 tests passing, 0 failures

---

## Phase 7: Semantic Release Configuration

- [x] T071 Add @semantic-release/git to devDependencies in package.json (already present)
- [x] T072 Update .releaserc.json to include @semantic-release/git plugin with assets: ["package.json", ".claude-plugin/plugin.json"]
- [x] T073 Update .releaserc.json to set npmPublish: false for @semantic-release/npm
- [x] T074 Update .github/workflows/release.yml to remove binary build steps (no changes needed - workflow already clean)
- [x] T075 Test semantic-release configuration locally (dry-run mode) - ✅ All plugins loaded successfully

---

## Phase 8: Documentation

- [x] T076 Create MIGRATION.md in plugin root with step-by-step npm-to-plugin migration guide - ✅ Comprehensive guide with troubleshooting, FAQ, checklist
- [x] T077 Update README.md to replace npm installation instructions with plugin installation via marketplace - ✅ Replaced with plugin quick start
- [x] T078 Add "Uninstalling npm Version" section to README.md with npm uninstall -g cc-track - ✅ Added migration section with npm uninstall instructions
- [x] T079 Update README.md quickstart section for plugin usage (add marketplace, install plugin, bun install dependencies) - ✅ Comprehensive quick start with 4 steps
- [x] T080 [P] Document ${CLAUDE_PLUGIN_ROOT} usage pattern in README.md - ✅ Added "Plugin Architecture" section explaining pattern
- [x] T081 [P] Update commands/*.md to reflect plugin installation (if needed beyond ${CLAUDE_PLUGIN_ROOT} changes) - ✅ Already completed in Phase 4 (T045-T055)
- [x] T082 Update marketplace README.md with plugin description and installation instructions - ✅ Created marketplace-README.md for use in cc-track-marketplace repo
- [x] T083a Create commands/setup-cc-track.md with plugin-appropriate setup instructions (replaces init.ts generated version, includes Bun verification and npm conflict detection) - ✅ Comprehensive setup command with pre-checks, feature selection, error messages

---

## Phase 9: Cleanup & Removal

- [x] T084 Remove src/cli/ directory (no longer needed - CLI entry point removed) - ✅ Deleted src/cli/index.ts
- [x] T085 Remove src/commands/slash-commands/ directory (files moved to commands/) - ✅ Deleted empty directory and backup files
- [ ] T086 Remove dist/ directory and all compiled binaries - DEFER, this should be gitignored anyway and the current project is using the old binary to operate until we release the plugin
- [x] T087 Remove src/ directory wrapper (all code moved to plugin root) - ✅ Deleted src/ after backing up CLAUDE.md to docs/testing-guidance.md
- [x] T088 Remove build scripts from package.json (build, build:linux, build:windows, prebuild, build:cross-platform, build:hooks) - ✅ Removed all build scripts, removed "bin" and "files" fields
- [x] T089 Remove commander from dependencies in package.json (already done in T003) - ✅ Already completed in Phase 1
- [x] T090 Remove scripts/embed-resources.ts (no longer needed without binary compilation) - ✅ Deleted embed-resources.ts
- [x] T091 Remove scripts/create-wrapper.ts (no longer needed without binary compilation) - ✅ Deleted create-wrapper.ts
- [x] T092 Update package.json "files" field to remove "dist/" (plugin distributes source, not binaries) - ✅ Removed "bin" and "files" fields entirely
- [x] T093 Remove deprecated npm CLI commands: commands/init.ts, commands/setup-commands.ts, commands/setup-templates.ts - ✅ Deleted all three files and their test files
- [x] T093b Remove lib/embedded-resources.ts and embedded resources build artifacts - ✅ Deleted embedded-resources.ts, dist/cc-track-test, dist/cc-track.js, dist/scripts/, dist/src/, dist/tsconfig.tsbuildinfo (~105 MB cleanup)
- [x] T093a Update docs/testing-guidance.md (backed up from src/CLAUDE.md) to reflect new paths and integrate DI/mocking patterns into system_patterns.md - ✅ Updated all file paths in testing-guidance.md (hooks/, lib/, test-utils/) and expanded Testing Patterns section in system_patterns.md with comprehensive DI/mocking guidance
- [x] T093c Add comprehensive integration tests for commands/complete-task.ts runCompleteTask() function - ✅ Created complete-task-integration.test.ts with 21 tests covering full workflow, failure/rollback paths, option flags, and edge cases (all pass)
- [x] T093d Add focused tests for lib/claude-sdk.ts wrapper logic - ✅ Created claude-sdk.test.ts with 4 tests for createMessageStream generator function. Documented that findClaudeCodeExecutable is better tested via integration (platform-specific, uses module-level imports)

---

## Phase 10: npm Package Deprecation

- [x] T094 Create npm deprecation message pointing to plugin installation guide - ✅ Created NPM_DEPRECATION.md with migration steps and deprecation message
- [x] T095 Publish final npm version with deprecation warning (manual step via npm deprecate) - ✅ Craig completed npm deprecation via npm CLI (MANUAL)
- [x] T096 Tag current npm version as "last-npm-release" in git for archival - ✅ Created annotated git tag pointing to v2.10.0 commit

---

## Phase 11: Final Validation

- [ ] T097 Manual test: Install plugin in fresh Claude Code instance
- [ ] T098 Manual test: Run through quickstart guide (add marketplace, install plugin, bun install, setup)
- [ ] T099 Manual test: Verify all slash commands execute correctly with ${CLAUDE_PLUGIN_ROOT}
- [ ] T100 Manual test: Verify hooks trigger correctly (edit validation, pre-tool validation)
- [ ] T101 Manual test: Test npm detection (install npm version, verify blocking error)
- [ ] T102 Manual test: Test dependency error messages (remove node_modules, verify clear guidance)
- [ ] T103 Final test suite run: bun test (all tests must pass)
- [ ] T104 Review all file movements complete (no files left in src/, dist/ removed, src/commands/slash-commands/ empty)

---

## Dependencies Graph

```
Phase 1 (T001-T007) → Phase 2 (T008-T035) → Phase 3 (T036-T044) → Phase 4 (T045-T055)
                                            ↓
Phase 5 (T056-T062) → Phase 6 (T063-T070) → Phase 7 (T071-T075)
                                            ↓
Phase 8 (T076-T082) → Phase 9 (T083-T091) → Phase 10 (T092-T094) → Phase 11 (T095-T102)

Critical paths:
- Infrastructure (T001-T007) must complete before file movements
- File movements (T008-T035) must complete before import updates
- Import updates (T036-T044) must complete before tests
- Tests (T063-T070) must pass before semantic-release config
- All cleanup (T083-T091) before final validation

Parallel opportunities:
- Within each file movement group (slash commands, libs, etc.)
- All documentation tasks can proceed in parallel
- Test updates for different modules are independent
```

---

## Parallel Execution Examples

### Example 1: Slash Command Moves (T008-T018)
```bash
# These can run simultaneously - different files, no dependencies:
T008: Move src/commands/slash-commands/specify.md to commands/specify.md
T009: Move src/commands/slash-commands/clarify.md to commands/clarify.md
T010: Move src/commands/slash-commands/plan.md to commands/plan.md
# ... all slash command moves are independent
```

### Example 2: Library File Moves (T021-T028)
```bash
# These can run simultaneously - different files:
T021: Move src/lib/config.ts to lib/config.ts
T022: Move src/lib/git-helpers.ts to lib/git-helpers.ts
T023: Move src/lib/github-helpers.ts to lib/github-helpers.ts
# ... all lib moves are independent
```

### Example 3: ${CLAUDE_PLUGIN_ROOT} Updates (T045-T055)
```bash
# These can run simultaneously - different markdown files:
T045: Update commands/specify.md to use ${CLAUDE_PLUGIN_ROOT}
T046: Update commands/clarify.md to use ${CLAUDE_PLUGIN_ROOT}
# ... all command updates are independent
```

---

## Validation Checklist
*Verify before starting implementation*

- [x] All infrastructure tasks come before file movements
- [x] File movements complete before import path updates
- [x] Import updates complete before test updates
- [x] Parallel tasks (`[P]`) are truly independent (different files)
- [x] Each task specifies exact file path or clear description
- [x] No task modifies same file as another `[P]` task
- [x] All moved files have corresponding import update tasks
- [x] Test updates cover existing test suite
- [x] Dependencies are clearly documented
- [x] .claude/ directory is NOT touched (our dogfooding setup stays intact)

---

## Task Progress Tracking
*Updated during implementation - see progress.md for detailed updates*

**Phase Completion**:
- [x] Phase 1: Plugin Infrastructure (T001-T007) - 7/7 complete
- [x] Phase 2: Code Restructuring (T008-T035) - 28/28 complete
- [x] Phase 3: Import Path Updates (T036-T044) - 9/9 complete
- [x] Phase 4: Slash Command Updates (T045-T055) - 11/11 complete
- [x] Phase 5: Detection & Validation (T056-T062) - 7/7 complete
- [x] Phase 6: Test Updates (T063-T070) - 8/8 complete
- [x] Phase 7: Semantic Release (T071-T075) - 5/5 complete
- [x] Phase 8: Documentation (T076-T083a) - 8/8 complete
- [x] Phase 9: Cleanup (T084-T093d) - 13/13 complete (T086 deferred)
- [x] Phase 10: npm Deprecation (T094-T096) - 3/3 complete
- [ ] Phase 11: Final Validation (T097-T104) - 0/8 complete

**Overall Progress**: 99/109 tasks complete (91% done)
**Blocked**: None
**Next**: Phase 11 (Final validation - all manual testing)

**Key Adjustments**:
- Added T083a (setup-cc-track.md creation)
- Added T093 (remove deprecated npm CLI commands)
- Added T093b (remove embedded resources system)
- Added T093c (complete-task integration tests - identified during commander cleanup)
- Added T093d (claude-sdk wrapper tests - identified during test coverage analysis)
- T086 deferred (keeping dist/cc-track for current project usage)
- Renumbered Phase 10-11 tasks accordingly
- Total task count: 109 (was 102)

**Estimated Time**:
- Quick wins: ~18 hours (file movements, import updates)
- Medium complexity: ~14 hours (tests, detection logic, documentation)
- Testing & validation: ~10 hours (manual testing, verification)
- Total: ~42-45 hours of focused work

---

## Implementation Notes

### Success Criteria
Each task is complete when:
1. File movement or code change is executed correctly
2. All affected tests pass (if applicable)
3. Code follows project patterns (see system_patterns.md)
4. Changes are committed with clear conventional commit message

### Common Pitfalls to Avoid
- Moving files without updating imports in same commit
- Marking tasks `[P]` when they have implicit dependencies
- Forgetting to update test fixtures after file movements
- Skipping commits between logical task groups
- Not verifying full test suite after major restructuring phases
- **Touching .claude/ directory (this is our dev project, not what we distribute)**

### Commit Strategy
- Commit after each logical group of parallel tasks
- Example: Commit after all slash command moves (T008-T018)
- Use conventional commits: `refactor(plugin): move slash commands to commands/`
- Keep commits focused on single phase when possible

---

**Ready to begin implementation?**

This is a large migration (102 tasks) but systematically organized. We can proceed phase by phase, with many opportunities for parallel execution within each phase.

The migration preserves all functionality while adopting plugin architecture. Each phase builds on the previous, with clear validation points.

**Critical note**: `.claude/` directory remains completely untouched - it's our development project's configuration.

Would you like to start with Phase 1: Plugin Infrastructure Setup (T001-T007)?
