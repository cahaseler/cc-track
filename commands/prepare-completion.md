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

## Step 4: Launch Review Agents (Phase 1 - Find Issues)

Launch the multi-agent spec-focused code review using the Task tool.

**Identify Active Spec:**
- Read CLAUDE.md to find the active spec folder path
- Look for `## Active Task` section with `@.cc-track/specs/NNN-feature-name/` reference
- Note the full spec folder path (e.g., `.cc-track/specs/109-feature-name/`)

**Gather Context for Agents:**

Before launching agents, gather the following:
1. **Spec folder path**: From CLAUDE.md `## Active Task` section
2. **Modified files list**: Run `git diff main --name-only` to get list of changed files

**Context to Pass to All Agents:**

Every agent prompt MUST include:
1. **Spec folder path**: The full path to the spec folder
2. **Validation status**: "TypeScript, linting, and tests have all passed"
3. **Modified files**: The list of files changed (from git diff --name-only)

**Launch All 8 Review Agents in Parallel:**

Use the Task tool to launch these agents simultaneously. Include the context above in each prompt.

1. **spec-compliance-reviewer** (haiku)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Modified files: {file_list}. Review implementation against spec.md. Report all potential issues."

2. **plan-adherence-reviewer** (haiku)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Modified files: {file_list}. Review implementation against plan.md. Report all potential deviations."

3. **task-completion-reviewer** (haiku)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Modified files: {file_list}. Review task completion against tasks.md. Report all incomplete tasks."

4. **bug-scanner** (sonnet)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Modified files: {file_list}. Scan these files for bugs, silent failures, and security issues. Report all potential bugs."

5. **guidelines-reviewer** (haiku)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Modified files: {file_list}. Review code against CLAUDE.md and .cc-track/constitution.md guidelines. Read spec.md/plan.md/tasks.md for approved scope. Report all potential violations."

6. **comment-compliance-reviewer** (haiku)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Modified files: {file_list}. Review comments in these files for accuracy. Report all comment issues."

7. **duplication-detector** (haiku)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Modified files: {file_list}. Check if code duplicates existing functionality. Report all potential duplicates."

8. **dead-code-detector** (haiku)
   - Prompt: "The spec folder is at {spec_folder_path}. TypeScript, linting, and tests have all passed. Modified files: {file_list}. Check for dead, orphaned, or deprecated code. Report all potential dead code."

**IMPORTANT:** Launch all 8 agents in a single message with multiple Task tool calls for parallel execution.

## Step 5: Collect and Deduplicate Issues

After all agents complete:

1. **Collect all issues** from all 8 agents into a single list
2. **Deduplicate by location** - Multiple reviewers may flag the same file:line
   - If two issues have the same file:line, keep one and note which reviewers flagged it
   - Use exact file:line matching (conservative deduplication)
3. **Create unique issue list** with format:
   ```
   Issue N:
   - Reviewers: [list of agents that found this]
   - Description: [what the issue is]
   - Location: [file:line]
   - Observation: [evidence from reviewer]
   ```

**If no issues found by any reviewer:** Skip to Step 8 with "No issues found - clean review!"

## Step 6: Score Each Issue (Phase 2 - Validate Issues)

For each unique issue, launch a parallel **issue-scorer** agent (Haiku) to validate it.

**IMPORTANT:** Launch ALL scoring agents in a single message for parallel execution.

For each issue, prompt the scorer with:

```
Spec folder: {spec_folder_path}

Issue: {description}
Location: {file:line}
Reported by: {reviewer(s)}
Observation: {what the reviewer observed}
```

## Step 7: Filter and Present Results

After all scorers complete:

1. **Filter out issues with score < 50** (unverified/false positives)
2. **Sort remaining issues by score** (highest first)
3. **Present to user** in this format:

```markdown
# Code Review Results

## Validated Issues

| # | Score | Reviewer(s) | Issue | Location |
|---|-------|-------------|-------|----------|
| 1 | 100 | bug-scanner | SQL injection vulnerability | api/users.ts:42 |
| 2 | 75 | spec-compliance | FR-003 not fully implemented | lib/auth.ts:156 |
| 3 | 50 | comments | Outdated comment | utils/helper.ts:23 |

## Issue Details

### Issue 1: SQL injection vulnerability (Score: 100)
- **Location:** api/users.ts:42
- **Reported by:** bug-scanner
- **Observation:** User input concatenated directly into query
- **Scorer justification:** Confirmed - query uses string interpolation with unsanitized input

### Issue 2: FR-003 not fully implemented (Score: 75)
- **Location:** lib/auth.ts:156
- **Reported by:** spec-compliance
- **Observation:** Spec requires token refresh, but only token generation exists
- **Scorer justification:** Verified - refresh endpoint is mentioned in spec but not implemented

[Continue for all issues >= 50]

## Filtered Out (Score < 50)
- [N] issues were filtered as unverified or false positives
```

## Step 8: STOP - Wait for User Discussion

**CRITICAL:** After presenting the scored issues, STOP and wait for the user.

```
📋 Code review complete. Found [N] validated issues (scores >= 50).

Please review the issues above. You can:
- Ask me to fix specific issues
- Ask clarifying questions about any finding
- Dismiss findings you disagree with
- Proceed to /cc-track:complete-task if no fixes needed

What would you like to do?
```

**DO NOT:**
- Automatically implement fixes
- Assume which issues to address
- Proceed without user input

**The user decides what gets fixed.** This prevents "eager to please" auto-implementation.

## Step 9: After User Direction

Once the user provides direction:

1. **If user requests fixes:** Implement only the specific issues they identified
2. **If user dismisses all issues:** Note their decision and proceed
3. **If user asks questions:** Answer and wait for further direction
4. **After any fixes:** Remind user to re-run `/cc-track:prepare-completion` to verify

## Step 10: Documentation Updates (After Review Complete)

Once review feedback is addressed (or user proceeds without fixes):

1. **Task progress file** - Update with final implementation state
2. **`.cc-track/decision_log.md`** - Add entry for any architectural decisions made (if applicable)
3. **`.cc-track/system_patterns.md`** - Document any new patterns or conventions established (if applicable)
4. **Private journal** - Record technical insights and learnings (if private journal MCP available)

## Next Steps

**If validated issues remain unaddressed:**
```
⚠️ There are still [N] validated issues.

If you want to proceed anyway, run /cc-track:complete-task.
Otherwise, fix issues and run /cc-track:prepare-completion again.
```

**If all issues addressed or clean review:**
```
✅ Task is ready for completion! Run /cc-track:complete-task to finalize.
```

## Notes

- **Phase 1 (Review):** 8 specialized agents run in parallel, each focused on their domain
- **Deduplication:** Same file:line from multiple reviewers is consolidated before scoring
- **Phase 2 (Scoring):** Per-issue Haiku scorers validate each finding independently
- **Threshold 50:** Shows verified issues, filters false positives - user decides importance
- **Human gate:** System stops after presenting - no auto-fix behavior
- **Bug scanner uses Sonnet** for deeper analysis; all others use Haiku for speed
- **Scoring agents are isolated** - no conversation history, providing neutral validation
