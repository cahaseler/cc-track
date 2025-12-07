# Tasks: Improve Review Agents and Prepare-Completion

**Feature ID**: `108`
**Branch**: `108-improve-review-agents-and-prepare-completion`

---

## Phase 1: Fix Permission Field (Root Cause)

All 8 agents need the `allowed-tools:` YAML list changed to `tools:` inline format.

- [x] T001 [P] Fix tools field in `agents/bug-scanner.md`
- [x] T002 [P] Fix tools field in `agents/comment-compliance-reviewer.md`
- [x] T003 [P] Fix tools field in `agents/dead-code-detector.md`
- [x] T004 [P] Fix tools field in `agents/duplication-detector.md`
- [x] T005 [P] Fix tools field in `agents/guidelines-reviewer.md`
- [x] T006 [P] Fix tools field in `agents/plan-adherence-reviewer.md`
- [x] T007 [P] Fix tools field in `agents/spec-compliance-reviewer.md`
- [x] T008 [P] Fix tools field in `agents/task-completion-reviewer.md`

**Standard tools line for all agents:**
```
tools: Read, Grep, Glob, LS, Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git show:*), Bash(bunx knip:*)
```

---

## Phase 2: Add Development Context

Add the "Development Context" section to all 8 agents (after frontmatter, before existing content).

- [x] T009 [P] Add dev context to `agents/bug-scanner.md`
- [x] T010 [P] Add dev context to `agents/comment-compliance-reviewer.md`
- [x] T011 [P] Add dev context to `agents/dead-code-detector.md`
- [x] T012 [P] Add dev context to `agents/duplication-detector.md`
- [x] T013 [P] Add dev context to `agents/guidelines-reviewer.md`
- [x] T014 [P] Add dev context to `agents/plan-adherence-reviewer.md`
- [x] T015 [P] Add dev context to `agents/spec-compliance-reviewer.md`
- [x] T016 [P] Add dev context to `agents/task-completion-reviewer.md`

---

## Phase 3: Agent-Specific Enhancements

- [x] T017 Add "Scope Validation" section to `agents/guidelines-reviewer.md`
- [x] T018 Add "Spec-Aware Detection" section to `agents/dead-code-detector.md`

---

## Phase 4: Command Update

- [x] T019 Update `commands/prepare-completion.md` to pass spec folder path and context to agents

---

## Dependencies

- Phase 1 (T001-T008): All parallel, no dependencies
- Phase 2 (T009-T016): All parallel, no dependencies
- Phase 3 (T017-T018): Parallel, no dependencies
- Phase 4 (T019): No dependencies

Note: Phases can be done in any order since they modify different parts of the files. However, it makes sense to do the frontmatter fix (Phase 1) before adding content (Phase 2-3).

---

## Parallel Execution

All tasks within each phase are parallel-safe (different files).

**Recommended approach**: Do all changes to each file in one pass rather than multiple edits:
- For each agent file: Fix tools field + add dev context + add agent-specific sections (if applicable)
- Then update command file

This reduces to effectively 9 sequential edits (8 agents + 1 command).

---

## Validation Checklist

- [x] All 8 agents have `tools:` field (not `allowed-tools:`)
- [x] All 8 agents have Development Context section
- [x] guidelines-reviewer has Scope Validation section
- [x] dead-code-detector has Spec-Aware Detection section
- [x] prepare-completion.md instructs Claude to pass context to agents
- [x] No syntax errors in YAML frontmatter
