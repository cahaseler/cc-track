---
allowed-tools: Read, Edit, Glob, Grep, Bash(git:*), Bash(bun:*), Task, Skill
description: Prepare the current active task for completion (Phase 1 of task completion workflow)
---

# Prepare Task for Completion

Run validation checks and multi-agent spec-focused code review to ensure the task is ready for completion.

## Current Context

- Current branch: !`git branch --show-current`
- Changes to review: !`git diff --stat`

## Step 1: Get Script Path via Skill

First, invoke the `cc-track:cc-track-tools` skill to get the base directory for cc-track scripts.

Note the base directory provided (e.g., `/path/to/skills/cc-track-tools`).

## Step 2: Run Validation Script

Run the prepare-completion script using the base directory from Step 1:

```bash
bun {base_directory}/scripts/prepare-completion.ts
```

The script will:
- Run TypeScript type checking
- Run linting with auto-fix
- Run test suite
- Run dead code detection (knip)

**Note:** The script no longer runs code review - that's handled by the multi-agent review in Step 3.

## Step 3: Interpret Validation Results

The script returns JSON output. Parse and present the results:

**If validation failed:**
- Show what failed with error counts from `data.validation`
- Provide specific fix instructions for each failure type:
  - **TypeScript errors**: Fix type mismatches, missing imports
  - **Lint errors**: Run `bunx biome check --write` or fix manually
  - **Test failures**: Debug and fix failing tests
  - **Dead code (knip)**: Remove unused exports or update knip config
- Ask user to fix issues and run `/cc-track:prepare-completion` again
- **STOP** - do not proceed to code review

**If validation passed:**
- Confirm: "✅ All validation checks passed"
- Proceed to Step 4 for multi-agent code review

## Step 4: Run Spec-Focused Code Review

Launch the multi-agent spec-focused code review using the Task tool.

**Identify Active Spec:**
- Read CLAUDE.md to find the active spec folder path
- Look for `## Active Task` section with `@.cc-track/specs/NNN-feature-name/` reference
- Note the full spec folder path (e.g., `.cc-track/specs/108-feature-name/`)

**Context to Pass to All Agents:**

Every agent prompt MUST include this context:
1. **Spec folder path**: The full path to the spec folder
2. **Validation status**: "TypeScript, linting, and tests have all passed"
3. **Diff target**: "Compare changes against main branch using `git diff main`"

**Launch All 8 Review Agents in Parallel:**

Use the Task tool to launch these agents simultaneously. Include the context above in each prompt:

1. **spec-compliance-reviewer** (haiku)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Review implementation against spec.md. Use `git diff main` to see changes against main branch. Check all requirements from spec.md are implemented. Report issues with confidence >= 80."

2. **plan-adherence-reviewer** (haiku)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Review implementation against plan.md. Use `git diff main` to see changes against main branch. Check technical design was followed. Report deviations with confidence >= 80."

3. **task-completion-reviewer** (haiku)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Review task completion against tasks.md. Use `git diff main` to see changes against main branch. Verify all tasks are actually complete. Report incomplete tasks with confidence >= 80."

4. **bug-scanner** (sonnet)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Scan changed files for bugs, silent failures, and security issues. Use `git diff main` to see changes against main branch. Focus on error handling, null checks, and edge cases. Report bugs with confidence >= 80."

5. **guidelines-reviewer** (haiku)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Review code against CLAUDE.md and .cc-track/constitution.md guidelines. Use `git diff main` to see changes against main branch. Read spec.md/plan.md/tasks.md to understand approved scope before flagging unauthorized changes. Report violations with confidence >= 80."

6. **comment-compliance-reviewer** (haiku)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Review comments in changed files for accuracy. Use `git diff main` to see changes against main branch. Check for stale comments, misleading docs, and unresolved TODOs. Report issues with confidence >= 80."

7. **duplication-detector** (haiku)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Check if the AI-generated code duplicates existing functionality. Use `git diff main` to see new code. Search codebase for similar implementations. Check dependencies for features that may already exist. Report duplicates with confidence >= 80."

8. **dead-code-detector** (haiku)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Check for dead, orphaned, or deprecated code. Use `git diff main` to see changes against main branch. Read spec.md/tasks.md to understand what may be intentionally deprecated. Report dead code with confidence >= 80."

**IMPORTANT:** Launch all 8 agents in a single message with multiple Task tool calls for parallel execution.

## Step 5: Aggregate Review Results

After all agents complete, combine their findings:

```markdown
# Spec-Focused Code Review Summary

## Overview
| Agent | Critical (90-100) | Important (80-89) | Minor (50-79) |
|-------|-------------------|-------------------|---------------|
| spec-compliance | X | Y | Z |
| plan-adherence | X | Y | Z |
| task-completion | X | Y | Z |
| bug-scanner | X | Y | Z |
| guidelines | X | Y | Z |
| comments | X | Y | Z |
| duplication | X | Y | Z |
| dead-code | X | Y | Z |

## Critical Issues (must fix)
[List from all agents]

## Important Issues (should fix)
[List from all agents]

## Minor Notes (optional)
[Brief summary]
```

## Step 6: Code Review Response

**Code Review Response Principles:**
- **Verify first** - Check suggestions against codebase reality before agreeing
- **Question YAGNI violations** - If review suggests implementing unused features, push back
- **Check for breaking changes** - Verify suggestions don't break existing functionality
- **Technical evaluation only** - No performative agreement
- **No gratitude expressions** - Just fix issues or explain disagreement

**Required Analysis:**
1. **Issues to fix** - List each with exact approach and technical reasoning
2. **Issues to reject** - Identify with detailed technical justification (false positives, context issues)
3. **Low-priority items** - Explain why non-critical
4. **Summary** - What must be fixed vs. what's incorrect/inapplicable

**IMPORTANT:** Present this analysis to the user and wait for their feedback before proceeding with fixes.

## Step 7: Update Documentation

After addressing review feedback, update the following:

1. **Task progress file** - Update with final implementation state
2. **`.cc-track/decision_log.md`** - Add entry for any architectural decisions made (if applicable)
3. **`.cc-track/system_patterns.md`** - Document any new patterns or conventions established (if applicable)
4. **Private journal** - Record technical insights and learnings (if private journal MCP available)

## Next Steps

**If critical issues found:**
```
❌ Critical issues must be addressed before task completion.

Fix these issues, then run /cc-track:prepare-completion again to verify.
```

**If only minor issues or clean:**
```
✅ Task is ready for completion! Run /cc-track:complete-task to finalize.
```

## Notes

- The 8 review agents run in parallel for faster review
- Each agent uses confidence scoring (threshold: 80) to reduce false positives
- Agents check against the full spec folder (spec.md, plan.md, tasks.md)
- Bug scanner uses Sonnet model for deeper analysis; others use Haiku for speed
- Duplication detector catches reimplementation of existing code/dependencies
- Dead code detector catches incomplete cleanup after refactoring
