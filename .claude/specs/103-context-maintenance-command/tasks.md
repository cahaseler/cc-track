# Tasks: Context Maintenance Command

**Feature ID**: `103`
**Branch**: `103-context-maintenance-command`
**Prerequisites**: plan.md, spec.md
**Input**: Design documents from `.claude/specs/103-context-maintenance-command/`

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in task descriptions
- Tasks are numbered sequentially (T001, T002, etc.)

## Path Conventions
This feature creates a single markdown command file:
- **Command location**: `commands/context-maintenance.md`
- **No code files**: Static markdown only

## Task Execution Rules
1. **Sequential Execution**: All tasks must be completed in order (no parallelization for single-file feature)
2. **Testing**: Manual testing by running command and following instructions
3. **Commit Frequency**: Commit after completing each task

---

## Phase 1: Research

- [ ] T001 Analyze existing context files in cc-track project for bloat patterns
  - Review `.claude/system_patterns.md` for deprecated patterns and verbose Update Log
  - Review `.claude/decision_log.md` for superseded decisions and low-impact entries
  - Review `.claude/progress_log.md` for redundant task updates
  - Document common bloat patterns found
  - Identify 3-5 concrete examples of each bloat type

---

## Phase 2: Design

- [ ] T002 Draft complete instruction set for context maintenance command
  - Create outline following structure from plan.md (Introduction → General Principles → File-Specific Guidance → Workflow → Checklist)
  - Write explicit cleanup rules for common cases (duplicates, outdated refs, superseded decisions)
  - Write judgment principles for edge cases (preserve "why", active patterns, rationale)
  - Include concrete examples from T001 research
  - Draft file-specific sections for system_patterns.md, decision_log.md, progress_log.md, and other context files
  - Add sequential workflow (system_patterns → decision_log → progress_log → others)
  - Include completion checklist

---

## Phase 3: Implementation

- [ ] T003 Create context-maintenance.md command file in commands/ directory
  - Add YAML frontmatter with description: "Clean up and reduce bloat in context files"
  - Implement Introduction section (purpose, when to run, safety reminder)
  - Implement General Principles section (explicit rules + judgment principles)
  - Implement file-specific guidance for system_patterns.md
  - Implement file-specific guidance for decision_log.md
  - Implement file-specific guidance for progress_log.md
  - Implement file-specific guidance for other context files (product_context.md, code_index.md, user_context.md, backlog.md)
  - Implement Workflow section (sequential file order)
  - Implement Completion Checklist
  - Verify file is <300 lines (constitution limit is 500)

---

## Phase 4: Testing

- [ ] T004 Test command with system_patterns.md cleanup
  - Run `/context-maintenance` command
  - Follow instructions to clean up system_patterns.md
  - Verify outdated patterns removed
  - Verify Update Log trimmed aggressively
  - Verify active patterns preserved
  - Verify instructions were clear and actionable
  - Document any unclear guidance for revision

- [ ] T005 Test command with decision_log.md cleanup
  - Run `/context-maintenance` command
  - Follow instructions to clean up decision_log.md
  - Verify superseded decisions marked or consolidated
  - Verify verbose explanations trimmed
  - Verify major architectural decisions preserved
  - Verify instructions were clear and actionable
  - Document any unclear guidance for revision

- [ ] T006 Test command with progress_log.md cleanup
  - Run `/context-maintenance` command
  - Follow instructions to clean up progress_log.md
  - Verify session-by-session details removed
  - Verify major milestones preserved
  - Verify redundant status updates consolidated
  - Verify instructions were clear and actionable
  - Document any unclear guidance for revision

---

## Phase 5: Polish

- [ ] T007 Refine instructions based on testing feedback
  - Address any unclear guidance identified in T004-T006
  - Add concrete examples where instructions were ambiguous
  - Clarify any edge case handling
  - Verify all bloat patterns from T001 are covered

- [ ] T008 Update documentation to reference new command
  - Add `/context-maintenance` to workflow guide if appropriate
  - Update backlog.md to mention command (if related items exist)
  - Ensure command is discoverable by users

---

## Dependencies Graph

```
T001 (Research) → T002 (Design) → T003 (Implementation) → T004-T006 (Testing) → T007 (Refinement) → T008 (Documentation)

Specific dependencies:
- T001 blocks T002 (need bloat patterns to design instructions)
- T002 blocks T003 (need complete design to implement)
- T003 blocks T004-T006 (need command file to test)
- T004-T006 block T007 (need testing feedback to refine)
- T007 blocks T008 (finalize command before documenting)
```

---

## Validation Checklist
*Verify before starting implementation*

- ✅ No tests needed (static markdown, no code logic)
- ✅ Single file implementation (commands/context-maintenance.md)
- ✅ Sequential execution (no parallel tasks)
- ✅ File path specified (commands/context-maintenance.md)
- ✅ Constitution compliance verified in plan.md
- ✅ All bloat patterns from spec addressed in design

---

## Implementation Notes

### Success Criteria
Each task is complete when:
1. Task deliverables created as specified
2. Changes committed with conventional commit message
3. No blockers for next task

### Testing Approach
- **Manual testing only**: Run command and follow instructions
- **Test on real files**: Use actual cc-track context files with bloat
- **Success metric**: Files are leaner, important context preserved, instructions felt clear

### Key Patterns to Follow
- Match existing command format from other .md files in commands/
- Clear section headers for easy navigation
- Concrete examples for ambiguous cases
- Reminder about git safety net
- Checklist at end for completion verification

---

## Task Progress Tracking
*Updated during implementation - see progress.md for detailed updates*

**Phase Completion**:
- [ ] Phase 1: Research (T001)
- [ ] Phase 2: Design (T002)
- [ ] Phase 3: Implementation (T003)
- [ ] Phase 4: Testing (T004-T006)
- [ ] Phase 5: Polish (T007-T008)

**Overall Progress**: 0/8 tasks complete
