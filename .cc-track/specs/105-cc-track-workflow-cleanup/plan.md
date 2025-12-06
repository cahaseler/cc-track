# Technical Plan: cc-track Workflow Cleanup

**Feature ID**: `105`
**Created**: 2025-12-06
**Status**: Planned

## Summary

Two cleanup items:
1. **Command Naming**: Update command references from `/plan` to `/cc-track:plan` format in commands and templates
2. **Hook Simplification**: Replace task file validation with simpler metadata file protection

## Technical Context

**Language/Version**: TypeScript
**Runtime/Framework**: Bun
**Testing**: Bun test
**Existing Patterns**: Dependency injection for hooks, colocated tests

## Constitution Check

✅ **All guardrails met:**
- No new dependencies
- Removes code (SDK calls) improving performance
- Maintains DI pattern for testability
- Hook execution will be faster (<1s)

---

## Part 1: Command Naming Updates

### Files to Update

**Slash Commands (`commands/`):**

| File | Lines to Update |
|------|-----------------|
| `commands/plan.md` | Line 33 (`/specify`), 156 (`/specify`), 374 (`/tasks`), 432 (`/tasks`) |
| `commands/specify.md` | Lines 335, 390, 407 (`/plan`) |
| `commands/tasks.md` | Line 36 (`/plan`), 321 (post-approval instructions) |
| `commands/complete-task.md` | Lines 10, 48 (`/prepare-completion`) |

**Templates (`templates/`):**

| File | Lines to Update |
|------|-----------------|
| `templates/CLAUDE.md` | Line 5 (`/complete-task`) |
| `templates/no_active_task.md` | Line 5 (`/specify`) |
| `templates/metadata-example.json` | Lines 3, 17, 18, 24, 27 (various command refs) |
| `templates/constitution-template.md` | Lines 150, 181 (`/plan`) |
| `templates/plan-template.md` | Lines 14, 68, 182, 210-213 (`/plan`, `/tasks`) |

**Workflow Guide:**

| File | Lines to Update |
|------|-----------------|
| `.cc-track/cc-track-workflow.md` | Lines 10, 49, 56-57, 66, 88, 92, 119, 123, 157, 164, 185, 189, 233, 239, 259, 316, 320, 330, 335 |

### Transformation Rules

- `/specify` → `/cc-track:specify`
- `/plan` → `/cc-track:plan`
- `/tasks` → `/cc-track:tasks`
- `/prepare-completion` → `/cc-track:prepare-completion`
- `/complete-task` → `/cc-track:complete-task`
- `/migrate` → `/cc-track:migrate`
- `/constitution` → `/cc-track:constitution`
- `/add-to-backlog` → `/cc-track:add-to-backlog`

**Note:** Don't change references to native Claude Code commands like `/help`, `/compact`, etc.

---

## Part 2: Hook Simplification

### Current State (hooks/pre-tool-validation.ts)

```
Lines 178-179: isTaskFile() matches tasks.md
Lines 236-273: buildValidationPrompt() for Claude SDK
Lines 463-551: Task validation logic calling SDK
```

### Target State

**Remove:**
- `isTaskFile()` function (not needed)
- `buildValidationPrompt()` function (not needed)
- `extractDiffInfo()` function (not needed - we're blocking ALL metadata edits)
- Claude SDK import and usage for validation
- All task validation code (lines 463-551)

**Add:**
- `isMetadataFile()` function: matches `.cc-track/specs/\d{3}-[^/]+/\.metadata\.json$`
- Simple blocking logic for Edit/Write/MultiEdit targeting metadata files
- Clear error message explaining scripts should modify metadata

### New Hook Logic

```typescript
// New function
export function isMetadataFile(filePath: string): boolean {
  return /\.cc-track\/specs\/\d{3}-[^/]+\/\.metadata\.json$/.test(filePath);
}

// In preToolValidationHook, after branch protection:
const filePath = extractFilePath(input.tool_name, input.tool_input);
if (filePath && isMetadataFile(filePath)) {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `🚫 Metadata Protection: Cannot directly modify .metadata.json files

Metadata files track task status and should only be modified by cc-track commands:
- /cc-track:complete-task - marks task as completed
- /cc-track:prepare-completion - validates before completion

These commands run scripts that properly update metadata with validation.`,
    },
  };
}
```

### Test Updates (tests/hooks/pre-tool-validation.test.ts)

**Remove tests:**
- `describe('isTaskFile', ...)` - function being removed
- `describe('extractDiffInfo', ...)` - function being removed
- `describe('buildValidationPrompt', ...)` - function being removed
- `describe('preToolValidationHook - task validation', ...)` - entire block (Claude SDK validation)

**Add tests:**
- `describe('isMetadataFile', ...)` - new function tests
- `describe('preToolValidationHook - metadata protection', ...)` - new blocking tests

**Keep tests:**
- `describe('isGitIgnored', ...)`
- `describe('extractFilePath', ...)`
- `describe('preToolValidationHook - branch protection', ...)`
- `describe('getCurrentYear', ...)`
- `describe('detectOutdatedYear', ...)`
- `describe('isHistoricalSearch', ...)`
- `describe('WebSearch validation integration', ...)`

---

## Task Planning Approach

The `/cc-track:tasks` command will generate:

**Part 1 tasks (can be parallel):**
- Update commands/plan.md
- Update commands/specify.md
- Update commands/tasks.md
- Update commands/complete-task.md
- Update templates/*.md and *.json
- Update .cc-track/cc-track-workflow.md

**Part 2 tasks (sequential):**
1. Add `isMetadataFile()` function to hook
2. Add metadata protection logic to hook
3. Remove obsolete functions (isTaskFile, extractDiffInfo, buildValidationPrompt)
4. Remove Claude SDK validation code
5. Remove obsolete imports
6. Update tests - remove old, add new
7. Run tests to verify

**Final tasks:**
- Run full test suite
- Remove backlog items that are now addressed

---

## Progress Tracking

| Phase | Status | Notes |
|-------|--------|-------|
| Command naming updates | Pending | |
| Hook simplification | Pending | |
| Test updates | Pending | |
| Final validation | Pending | |

---

## Risk Assessment

**Low Risk:**
- Text replacement in markdown files - straightforward
- Hook simplification removes code - reduces complexity
- Tests will catch any regressions

**Considerations:**
- Ensure we don't break internal links in workflow guide
- Keep Claude SDK imports that ARE used (for spec file protection message)

Wait - actually looking at the hook again, the Claude SDK is only used for the task validation we're removing. The spec file protection message doesn't use SDK. Let me verify:

The `isSpecFile()` function (line 185-187) and its blocking logic (lines 438-461) don't use SDK - they just check the path and block directly. Good - we can remove the SDK import entirely from this hook.
