---
allowed-tools: Read, Edit, Glob, Grep, Bash(git:*), Bash(bun:*), Task
description: Prepare the current active task for completion (Phase 1 of task completion workflow)
---

# Prepare Task for Completion

Run validation checks and multi-agent spec-focused code review to ensure the task is ready for completion.

## Current Context

- Current branch: !`git branch --show-current`
- Changes to review: !`git diff --stat`
- Design system (DESIGN.md) exists: !`ls DESIGN.md 2>/dev/null | head -1`
- UI files in diff: !`git diff main --name-only 2>/dev/null | grep -E '\.(tsx|jsx|vue|svelte|astro|css|scss|sass|less|html)$' | head -20`

## Step 1: Run Validation Script

Run the prepare-completion script:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/skills/cc-track-tools/scripts/prepare-completion.ts"
```

The script will:
- Run TypeScript type checking
- Run linting with auto-fix
- Run test suite
- Run dead code detection (knip)

**Note:** The script no longer runs code review - that's handled by the multi-agent review in Step 2.

## Step 2: Interpret Validation Results

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
- Proceed to Step 3 for multi-agent code review

## Step 3: Launch Review Agents (Phase 1 - Find Issues)

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

**Execution mode:** Use **foreground parallel** (do NOT use `run_in_background: true`):
- Launch all 8 agents in a single message without the `run_in_background` parameter
- Orchestrator suspends until ALL agents complete
- All results return together in the response
- Deduplication in Step 4 has access to all findings at once

This is different from the pipeline pattern in `/cc-track:tasks` - here we need ALL results before proceeding to deduplication, so foreground parallel is correct.

## Step 4: Collect and Deduplicate Issues

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

**If no issues found by any reviewer:** Skip to Step 7 with "No issues found - clean review!"

## Step 5: Score Each Issue (Phase 2 - Validate Issues)

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

## Step 6: Filter and Present Results

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

## Step 6.5: UI Design Check (Optional)

**Skip this step entirely if `DESIGN.md` does not exist at the project root** (see Current Context block).

**Skip this step if no UI files appear in the diff** (Current Context shows the matched files).

**If `DESIGN.md` exists AND UI files were modified**:

The project uses [Impeccable](https://impeccable.style/) and/or the [DESIGN.md](https://github.com/google-labs-code/design.md) format. Surface this advisory to the user (in addition to whatever Step 7 would say):

```
🎨 UI changes detected with a DESIGN.md present.

Before running /cc-track:complete-task, consider running:
  - /impeccable audit    — technical UI quality (a11y, performance, theming,
                            responsive, anti-patterns) scored P0–P3
  - /impeccable critique — subjective design quality ("does this feel right")

Findings map onto cc-track's triage:
  - P0 (blocks release)  → Fix
  - P1 (this sprint)     → Fix or Defer
  - P2 (next cycle)      → Defer
  - P3 (polish)          → Dismiss/Defer

Re-run /cc-track:prepare-completion afterwards if /impeccable audit surfaces
significant new issues. Skip this if the UI changes are trivial (typo,
copy edit, etc.).
```

This is advisory — it does **not** block Step 7 routing. The user decides whether to run the audit before or after the existing review agents' findings.

---

## Step 7: Route Based on Issue Count

After filtering and scoring, route based on how many validated issues were found:

### If 0 validated issues:

```
✅ Clean review! No issues found with score >= 50.

Task is ready for completion. Run /cc-track:complete-task to finalize.
```

Remind about documentation updates:
- Update task progress file with final implementation state
- Add to `.cc-track/decision_log.md` for any architectural decisions
- Update `.cc-track/system_patterns.md` for new patterns established

### If exactly 1 validated issue:

Present the single issue inline:

```
📋 Found 1 validated issue:

### {Issue Title} (Score: {score})
- **Location:** {file:line}
- **Reported by:** {reviewer(s)}
- **Observation:** {evidence}
- **Scorer justification:** {justification}

Would you like me to fix this issue, or proceed to /cc-track:complete-task?
```

Wait for user direction before proceeding. If they want it fixed, implement the fix and remind them to re-run `/cc-track:prepare-completion` to verify.

### If >1 validated issues:

```
📋 Found {N} validated issues. Invoking /cc-track:fix-issues for structured triage.
```

Then invoke the `/cc-track:fix-issues` command using the SlashCommand tool. The fix-issues command will:
- Create/update `issue-log.md` in the spec folder
- Walk through each issue one-by-one
- Ask user to Fix/Defer/Dismiss/Discuss each issue
- Execute fixes after triage is complete
- Remind to re-run prepare-completion to verify

## Notes

- **Phase 1 (Review):** 8 specialized agents run in parallel, each focused on their domain
- **Deduplication:** Same file:line from multiple reviewers is consolidated before scoring
- **Phase 2 (Scoring):** Per-issue Haiku scorers validate each finding independently
- **Threshold 50:** Shows verified issues, filters false positives - user decides importance
- **Human gate:** System stops after presenting - no auto-fix behavior
- **Bug scanner uses Sonnet** for deeper analysis; all others use Haiku for speed
- **Scoring agents are isolated** - no conversation history, providing neutral validation
- **No relevance filtering:** Do NOT filter issues based on whether they seem "related to the current spec" or "pre-existing". All discovered issues with score >= 50 must be presented to the human. Relevance is a factor in the triage decision (Fix/Defer/Dismiss), not a reason to hide issues.
