# Tasks: Add Scoring Agent Pattern to Code Review Process

**Feature ID**: `109`
**Branch**: `109-add-scoring-agent-pattern-to-code-review-process`

---

## Phase 1: Create Scoring Agent

- [x] T001 Create issue-scorer agent in `agents/issue-scorer.md`
  - Haiku model for cost efficiency
  - Full codebase tools: Read, Grep, Glob, LS
  - Scoring rubric (0/25/50/75/100)
  - Structured output format: score + justification

## Phase 2: Modify Review Agents (can parallelize)

- [x] T002 [P] Update `agents/spec-compliance-reviewer.md`
  - Remove confidence scoring rubric
  - Remove "Only report >= 80" filter
  - Update output format to structured issue list
  - Keep all investigation logic intact

- [x] T003 [P] Update `agents/plan-adherence-reviewer.md`
  - Same changes as T002

- [x] T004 [P] Update `agents/task-completion-reviewer.md`
  - Same changes as T002

- [x] T005 [P] Update `agents/bug-scanner.md`
  - Same changes as T002

- [x] T006 [P] Update `agents/guidelines-reviewer.md`
  - Same changes as T002

- [x] T007 [P] Update `agents/comment-compliance-reviewer.md`
  - Same changes as T002

- [x] T008 [P] Update `agents/duplication-detector.md`
  - Same changes as T002

- [x] T009 [P] Update `agents/dead-code-detector.md`
  - Same changes as T002

## Phase 3: Update Orchestrator Command

- [x] T010 Update `commands/prepare-completion.md` with new flow
  - Step 5: Deduplicate issues by file:line
  - Step 6: Launch parallel scoring agents (one per issue)
  - Step 7: Filter issues < 50
  - Step 8: Present sorted results (highest first)
  - Step 9: STOP and wait for user discussion

## Phase 4: Validation (on Task 110)

- [ ] T011 Deploy plugin and test on real task
  - Run `/cc-track:prepare-completion` on Task 110
  - Verify review agents output issue lists
  - Verify scoring agents run in parallel
  - Verify filtering at threshold 50
  - Verify system stops after presenting
  - Document any issues in progress.md

---

## Validation Checklist

- [x] Issue-scorer agent created with correct rubric
- [x] All 8 review agents output issue lists
- [x] prepare-completion.md has deduplication logic
- [x] prepare-completion.md launches parallel scorers
- [x] prepare-completion.md filters at threshold 50
- [x] prepare-completion.md explicitly STOPs after presenting

## Notes

- This is markdown/prompt engineering work - no traditional unit tests
- Real validation happens when we test on Task 110 after deployment
- All changes are to markdown files in `agents/` and `commands/` directories
