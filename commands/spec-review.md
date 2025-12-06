---
description: "Multi-agent spec-focused code review for task completion"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Task"]
---

# Spec-Focused Code Review

Run a comprehensive code review using multiple specialized agents, each checking a different aspect of your implementation against the cc-track spec folder.

## Review Workflow:

### 1. Identify Active Spec

Read CLAUDE.md to find the active spec folder path:
- Look for `## Active Task` section
- Extract the `@.cc-track/specs/NNN-feature-name/` path
- Verify the spec folder exists

If no active spec:
```
No active spec found. This review requires a cc-track spec folder with:
- spec.md (requirements)
- plan.md (technical design)
- tasks.md (task breakdown)

Run /specify to create a spec first, or ensure CLAUDE.md points to an active spec.
```

### 2. Load Spec Files

From the spec folder, check for:
- `spec.md` - Requirements specification
- `plan.md` - Technical design
- `tasks.md` - Task breakdown
- `progress.md` - Implementation progress
- `.metadata.json` - Task metadata

### 3. Get Changes to Review

Run `git diff` to identify what code has changed.

### 4. Launch Review Agents

Launch all applicable agents **in parallel** using the Task tool. Each agent needs:
- The spec folder path
- Instructions to review the git diff

**Always launch these agents:**

```
Task: spec-compliance-reviewer
Prompt: "Review the implementation against spec.md at [spec folder path].
        Run git diff to see changes. Check all requirements are met.
        Report issues with confidence >= 80."

Task: plan-adherence-reviewer
Prompt: "Review the implementation against plan.md at [spec folder path].
        Run git diff to see changes. Check technical design was followed.
        Report deviations with confidence >= 80."

Task: task-completion-reviewer
Prompt: "Review task completion against tasks.md at [spec folder path].
        Run git diff to see changes. Verify all tasks are actually done.
        Report incomplete tasks with confidence >= 80."

Task: bug-scanner
Prompt: "Scan the changed files for bugs, silent failures, and security issues.
        Run git diff to see changes. Focus on error handling and edge cases.
        Report bugs with confidence >= 80."

Task: guidelines-reviewer
Prompt: "Review code against CLAUDE.md and .cc-track/constitution.md guidelines.
        Run git diff to see changes. Check project conventions are followed.
        Report violations with confidence >= 80."

Task: comment-compliance-reviewer
Prompt: "Review comments in changed files for accuracy and completeness.
        Run git diff to see changes. Check TODOs and documentation accuracy.
        Report issues with confidence >= 80."

Task: duplication-detector
Prompt: "Check if the AI-generated code duplicates existing functionality.
        Run git diff to see new code. Search codebase for similar implementations.
        Check dependencies for features that may already exist.
        Report duplicates with confidence >= 80."

Task: dead-code-detector
Prompt: "Check for dead, orphaned, or deprecated code after the AI's changes.
        Run git diff to see what changed. Look for orphaned files, stale imports,
        unused exports, and incomplete cleanup from refactoring.
        Report dead code with confidence >= 80."
```

### 5. Aggregate Results

After all agents complete, combine their findings:

```markdown
# Spec-Focused Code Review

**Spec:** [spec folder path]
**Reviewed:** [timestamp]

## Summary

| Agent | Critical | Important | Minor |
|-------|----------|-----------|-------|
| spec-compliance | X | Y | Z |
| plan-adherence | X | Y | Z |
| task-completion | X | Y | Z |
| bug-scanner | X | Y | Z |
| guidelines | X | Y | Z |
| comments | X | Y | Z |
| duplication | X | Y | Z |
| dead-code | X | Y | Z |
| **Total** | **X** | **Y** | **Z** |

## Critical Issues (Confidence 90-100)

### From spec-compliance-reviewer:
[Issues if any]

### From plan-adherence-reviewer:
[Issues if any]

### From bug-scanner:
[Issues if any]

[...other agents with critical issues...]

## Important Issues (Confidence 80-89)

[Grouped by agent]

## Minor Notes (Confidence 50-79)

[Brief table of minor issues from all agents]

## What's Working Well

- [Positive findings from agents]

## Recommended Actions

1. **Fix critical issues first** - These block completion
2. **Address important issues** - Should be fixed before PR
3. **Consider minor notes** - Optional improvements
4. **Re-run review after fixes** - Verify issues resolved
```

### 6. Provide Next Steps

Based on results:

**If critical issues found:**
```
❌ Critical issues must be addressed before task completion.

Top priorities:
1. [Most critical issue]
2. [Second most critical]

Fix these issues, then run /cc-track:spec-review again to verify.
```

**If only minor issues:**
```
✅ No critical issues found. Minor improvements suggested.

You can proceed with /cc-track:complete-task or address minor notes first.
```

**If clean:**
```
✅ All checks passed. Implementation matches spec.

Ready to run /cc-track:complete-task to finalize.
```

## Notes:

- All 8 agents run in parallel for speed
- Each agent uses confidence scoring (threshold: 80)
- Agents read spec files directly - no need to pass content
- Results are actionable with specific file:line references
- Use this during /prepare-completion or standalone
