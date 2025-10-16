# Tasks: Fix Plugin Script Execution

**Feature ID**: `102`
**Branch**: `102-fix-plugin-script-execution`
**Prerequisites**: plan.md, spec.md
**Input**: Design documents from `.claude/specs/102-fix-plugin-script-execution/`

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in task descriptions
- Tasks are numbered sequentially (T001, T002, etc.)

## Task Execution Rules
1. **TDD Order**: Tests MUST be written and MUST FAIL before implementation
2. **Dependencies**: Tasks without `[P]` must be completed sequentially
3. **Parallel Tasks**: Tasks marked `[P]` can be worked on simultaneously
4. **File Conflicts**: Never mark tasks `[P]` if they modify the same file
5. **Commit Frequency**: Commit after completing each task

---

## Phase 1: Setup & Helper Functions

- [ ] T001 Extract platform path helper function to `hooks/lib/platform-paths.ts`
- [ ] T002 [P] Unit tests for platform path determination in `hooks/lib/platform-paths.test.ts`

---

## Phase 2: Core Hook Implementation

- [ ] T003 Implement SessionStart hook in `hooks/session-start.ts` using platform-paths helper
- [ ] T004 Register SessionStart hook in `hooks/hooks.json`

---

## Phase 3: Slash Command Updates

- [ ] T005 [P] Update `commands/migrate.md` to use `${CC_TRACK_SCRIPTS_ROOT}`
- [ ] T006 [P] Update `commands/complete-task.md` to use `${CC_TRACK_SCRIPTS_ROOT}`
- [ ] T007 [P] Update `commands/prepare-completion.md` to use `${CC_TRACK_SCRIPTS_ROOT}`
- [ ] T008 [P] Update `commands/add-to-backlog.md` to use `${CC_TRACK_SCRIPTS_ROOT}`
- [ ] T009 [P] Update `commands/specify.md` to use `${CC_TRACK_SCRIPTS_ROOT}`
- [ ] T010 [P] Update `commands/clarify.md` to use `${CC_TRACK_SCRIPTS_ROOT}`
- [ ] T011 [P] Update `commands/plan.md` to use `${CC_TRACK_SCRIPTS_ROOT}`
- [ ] T012 [P] Update `commands/tasks.md` to use `${CC_TRACK_SCRIPTS_ROOT}`

---

## Phase 4: Manual Validation

- [ ] T013 Manual test: Fresh session startup - verify scripts copied to platform directory and `CC_TRACK_SCRIPTS_ROOT` set
- [ ] T014 Manual test: Session resume - verify version check works, no re-copy when version unchanged
- [ ] T015 Manual test: Plugin version update - modify `.claude-plugin/plugin.json` version, verify scripts re-copied
- [ ] T016 Manual test: Execute `/cc-track:migrate` command - verify script runs successfully
- [ ] T017 Manual test: Execute all remaining slash commands - verify all 8 commands work

---

## Dependencies Graph

```
Phase 1: Setup
  T001 (extract helper) → T002 (test helper) [P]

Phase 2: Hook Implementation
  T002 blocks T003 (need helper for implementation)
  T003 (implement hook) → T004 (register hook)

Phase 3: Command Updates
  T004 blocks T005-T012 (hook must be registered before commands reference it)
  T005-T012 all [P] (independent files)

Phase 4: Manual Validation
  T012 blocks T013-T017 (all updates must be complete before testing)
  T013-T017 sequential (build on each other)
```

---

## Parallel Execution Examples

### Example 1: Unit Test (T002)
```bash
# Can work on test independently after helper is extracted
Task: "Unit tests for platform path determination in hooks/lib/platform-paths.test.ts"
```

### Example 2: Slash Command Updates (T005-T012)
```bash
# All these can run simultaneously - different files:
Task: "Update commands/migrate.md to use ${CC_TRACK_SCRIPTS_ROOT}"
Task: "Update commands/complete-task.md to use ${CC_TRACK_SCRIPTS_ROOT}"
Task: "Update commands/prepare-completion.md to use ${CC_TRACK_SCRIPTS_ROOT}"
... (5 more command updates)
```

---

## Validation Checklist
*Verify before starting implementation*

- [x] All tests come before their corresponding implementation (T002 before T003)
- [x] Parallel tasks (`[P]`) are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another `[P]` task
- [x] Dependencies are clearly documented
- [x] TDD order maintained for testable code

---

## Task Details

### T001: Extract Platform Path Helper
**File**: `hooks/lib/platform-paths.ts`
**Description**: Create helper function to determine platform-specific installation directory
**Logic**:
```typescript
export function getScriptsInstallPath(): string {
  return process.platform === 'win32'
    ? join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'cc-track', 'scripts')
    : join(homedir(), '.local', 'share', 'cc-track', 'scripts');
}
```

### T002: Unit Tests for Platform Path Helper
**File**: `hooks/lib/platform-paths.test.ts`
**Tests to write**:
- Linux platform returns `~/.local/share/cc-track/scripts/`
- Windows platform returns `%LOCALAPPDATA%\cc-track\scripts\`
- Windows fallback when `LOCALAPPDATA` undefined
- Use Bun's mocking to test `process.platform` and `process.env`

### T003: Implement SessionStart Hook
**File**: `hooks/session-start.ts`
**Logic** (from plan.md lines 215-307):
- Read SessionStart hook input from stdin
- Call `getScriptsInstallPath()` helper
- Set `CC_TRACK_SCRIPTS_ROOT` environment variable
- Create scripts directory with `mkdirSync`
- Read plugin version from `.claude-plugin/plugin.json`
- Compare with `.version` file in scripts directory
- Copy scripts if version changed
- Output JSON with `hookSpecificOutput.additionalContext`
- Exit 0 on all errors (graceful failure)

### T004: Register Hook
**File**: `hooks/hooks.json`
**Add**:
```json
{
  "SessionStart": [
    {
      "name": "session-start",
      "script": "bun run ${CLAUDE_PLUGIN_ROOT}/hooks/session-start.ts",
      "description": "Installs plugin scripts to user directory and sets CC_TRACK_SCRIPTS_ROOT"
    }
  ]
}
```

### T005-T012: Slash Command Updates
**Changes per file** (example for `commands/migrate.md`):
**Before**:
```markdown
---
allowed-tools: Bash(bun run ${CLAUDE_PLUGIN_ROOT}/commands/scripts/migrate.ts)
---

!`bun run ${CLAUDE_PLUGIN_ROOT}/commands/scripts/migrate.ts`
```

**After**:
```markdown
---
allowed-tools: Bash(bun run ${CC_TRACK_SCRIPTS_ROOT}/migrate.ts)
---

!`bun run ${CC_TRACK_SCRIPTS_ROOT}/migrate.ts`
```

**Files**:
- T005: `commands/migrate.md`
- T006: `commands/complete-task.md`
- T007: `commands/prepare-completion.md`
- T008: `commands/add-to-backlog.md`
- T009: `commands/specify.md`
- T010: `commands/clarify.md`
- T011: `commands/plan.md`
- T012: `commands/tasks.md`

### T013-T017: Manual Testing
See plan.md "Testing Strategy" section (lines 443-453) for detailed test scenarios.

---

## Task Progress Tracking
*Updated during implementation - see progress.md for detailed updates*

**Phase Completion**:
- [ ] Phase 1: Setup & Helper Functions (T001-T002)
- [ ] Phase 2: Core Hook Implementation (T003-T004)
- [ ] Phase 3: Slash Command Updates (T005-T012)
- [ ] Phase 4: Manual Validation (T013-T017)

**Overall Progress**: 0/17 tasks complete

---

## Success Criteria
Task is complete when all checklist items pass:

From spec.md:
- [ ] SessionStart hook runs without errors on Linux
- [ ] All scripts are copied to `~/.local/share/cc-track/scripts/` (Linux)
- [ ] `CC_TRACK_SCRIPTS_ROOT` environment variable is set correctly
- [ ] All 8 slash commands execute successfully
- [ ] Version detection correctly identifies when plugin has been updated
- [ ] Hook includes unit tests for platform path helper
- [ ] Warning message displays when script installation fails (test with read-only directory)

---

## Implementation Notes

### Success Criteria Per Task
Each task is complete when:
1. Code is written and works as expected
2. All tests for that task pass (where applicable)
3. Code follows project patterns (TypeScript strict mode, Biome linting)
4. Changes are committed with conventional commit message

### Common Pitfalls to Avoid
- Writing hook implementation (T003) before unit test (T002) passes
- Updating slash commands before hook is registered (T005-T012 before T004)
- Not testing graceful failure (T013 should include permission denied scenario)
- Forgetting to test version detection (T015 critical for plugin updates)
- Not verifying ALL 8 commands work (T017 must test every command)

### TDD Compliance
- T002 (unit test) MUST be written and MUST FAIL before T003 (implementation)
- Unit test should mock `process.platform` to test both Linux and Windows paths
- Test should verify Windows fallback when `LOCALAPPDATA` is undefined
