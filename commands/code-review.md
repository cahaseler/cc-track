---
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git:*), Bash(bun:*), Bash(mkdir:*), Task, AskUserQuestion, TodoWrite
description: Code review a pull request
---

# Standalone Code Review

Run validation checks and multi-agent code review without requiring a spec folder. Use this for general code review outside the cc-track workflow.

## Current Context

- Current branch: !`git branch --show-current`
- Changes to review: !`git diff --stat`

## Step 1: Run Validation Script

Run the code-review script:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/skills/cc-track-tools/scripts/code-review.ts"
```

The script will:
- Run TypeScript type checking
- Run linting with auto-fix
- Run test suite
- Run dead code detection (knip)

## Step 2: Interpret Validation Results

The script returns JSON output. Parse and present the results:

**If validation failed:**
- Show what failed with error counts from `data.validation`
- Provide specific fix instructions for each failure type:
  - **TypeScript errors**: Fix type mismatches, missing imports
  - **Lint errors**: Run `bunx biome check --write` or fix manually
  - **Test failures**: Debug and fix failing tests
  - **Dead code (knip)**: Remove unused exports or update knip config
- Ask user to fix issues and run `/cc-track:code-review` again
- **STOP** - do not proceed to code review

**If validation passed:**
- Confirm: "✅ All validation checks passed"
- Proceed to Step 3 for multi-agent code review

## Step 3: Launch Review Agents

Launch the multi-agent code review using the Task tool.

**Gather Context for Agents:**

Before launching agents, gather the following:
1. **Default branch**: Run `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main"` to detect default branch
2. **Modified files list**: Run `git diff {default_branch} --name-only` to get list of changed files

**Context to Pass to All Agents:**

Every agent prompt MUST include:
1. **Validation status**: "TypeScript, linting, and tests have all passed"
2. **Modified files**: The list of files changed (from git diff --name-only)
3. **No spec folder**: "No spec folder for this review - this is standalone code review"

**Launch All 6 Review Agents in Parallel:**

Use the Task tool to launch these agents simultaneously. Include the context above in each prompt.

1. **bug-scanner** (sonnet)
   - Prompt: "No spec folder for this review - this is standalone code review. TypeScript, linting, and tests have all passed. Modified files: {file_list}. Scan these files for bugs, silent failures, and security issues. Report all potential bugs."

2. **guidelines-reviewer** (sonnet)
   - Prompt: "No spec folder for this review - this is standalone code review. TypeScript, linting, and tests have all passed. Modified files: {file_list}. Review code against CLAUDE.md and .cc-track/constitution.md (if they exist). Report all potential guideline violations."

3. **comment-compliance-reviewer** (haiku)
   - Prompt: "No spec folder for this review - this is standalone code review. TypeScript, linting, and tests have all passed. Modified files: {file_list}. Review comments in these files for accuracy. Report all comment issues."

4. **duplication-detector** (haiku)
   - Prompt: "No spec folder for this review - this is standalone code review. TypeScript, linting, and tests have all passed. Modified files: {file_list}. Check if code duplicates existing functionality. Report all potential duplicates."

5. **dead-code-detector** (haiku)
   - Prompt: "No spec folder for this review - this is standalone code review. TypeScript, linting, and tests have all passed. Modified files: {file_list}. Check for dead, orphaned, or deprecated code. Report all potential dead code."

6. **altitude-reviewer** (sonnet)
   - Prompt: "No spec folder for this review - this is standalone code review. TypeScript, linting, and tests have all passed. Modified files: {file_list}. Check whether changes are implemented at the right altitude - flag symptom-fixes, wrong-layer patches, narrow bandaids, and fallbacks that silently mask failures. Report all potential altitude issues."

**IMPORTANT:** Launch all 6 agents in a single message with multiple Task tool calls for parallel execution.

**Execution mode:** Use **foreground parallel** (do NOT use `run_in_background: true`):
- Launch all 6 agents in a single message without the `run_in_background` parameter
- Orchestrator suspends until ALL agents complete
- All results return together in the response
- Deduplication in Step 4 has access to all findings at once

## Step 4: Collect and Deduplicate Issues

After all agents complete:

1. **Collect all issues** from all 6 agents into a single list
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

## Step 5: Score Each Issue

For each unique issue, launch a parallel **issue-scorer** agent (Haiku) to validate it.

**IMPORTANT:** Launch ALL scoring agents in a single message for parallel execution.

For each issue, prompt the scorer with:

```
This is a standalone code review (no spec folder).

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
| 2 | 75 | guidelines | Naming convention violation | lib/auth.ts:156 |
| 3 | 50 | comments | Outdated comment | utils/helper.ts:23 |

## Issue Details

### Issue 1: SQL injection vulnerability (Score: 100)
- **Location:** api/users.ts:42
- **Reported by:** bug-scanner
- **Observation:** User input concatenated directly into query
- **Scorer justification:** Confirmed - query uses string interpolation with unsanitized input

### Issue 2: Naming convention violation (Score: 75)
- **Location:** lib/auth.ts:156
- **Reported by:** guidelines
- **Observation:** Function name doesn't follow camelCase convention
- **Scorer justification:** Verified - function uses snake_case instead of camelCase

[Continue for all issues >= 50]

## Filtered Out (Score < 50)
- [N] issues were filtered as unverified or false positives
```

## Step 7: Route Based on Issue Count

After filtering and scoring, route based on how many validated issues were found:

### If 0 validated issues:

```
✅ Clean review! No issues found with score >= 50.

Code review complete. No issues to address.
```

### If exactly 1 validated issue:

Present the single issue inline:

```
📋 Found 1 validated issue:

### {Issue Title} (Score: {score})
- **Location:** {file:line}
- **Reported by:** {reviewer(s)}
- **Observation:** {evidence}
- **Scorer justification:** {justification}

Would you like me to fix this issue, or skip it?
```

Wait for user direction before proceeding. If they want it fixed, implement the fix and remind them to re-run `/cc-track:code-review` to verify.

### If >1 validated issues:

```
📋 Found {N} validated issues. Starting structured triage...
```

Proceed to Step 8 for inline fix-issues flow.

## Step 8: Inline Fix-Issues Flow

For >1 validated issues, handle triage directly (don't call `/cc-track:fix-issues` which requires a spec folder).

### 8a: Create Review File

1. Ensure `.cc-track/reviews/` directory exists:
   ```bash
   mkdir -p .cc-track/reviews
   ```

2. Create a date-stamped review file:
   - Filename: `YYYY-MM-DD.md`
   - If that file exists, use `YYYY-MM-DD-HH-MM.md`

3. Initialize with this structure:
   ```markdown
   # Code Review: {date} {time}

   **Branch:** {current_branch}
   **Generated:** {timestamp}
   **Status:** in_progress

   ## Summary

   | # | Score | Status | Location | Decision | Action |
   |---|-------|--------|----------|----------|--------|

   ## Issues
   ```

4. Add each issue to the file with Status = "pending"

### 8b: Check Existing State

Read existing files to filter issues that were already triaged:

1. **Check previous review files** (in `.cc-track/reviews/`):
   - Note issues with Decision = "Fix" (already fixed)
   - Note issues with Decision = "Dismiss" (already dismissed)
   - Note issues with Decision = "Defer" (already deferred)

2. **Check backlog.md** (at `.cc-track/backlog.md`):
   - Look for items that match current issues by location

3. **Filter the issue list:**
   - Remove any issue matching a Fixed/Dismissed entry (match by location)
   - Remove any issue matching a Deferred entry (match by location or description)
   - Keep all other issues for triage

### 8c: "Just Fix It" Protocol

Before presenting issues to the user, scan for trivial fixes that don't need human decision-making.

**Criteria for "Just Fix It":**
- Trivial fix in only one place (single file change)
- Consequences of getting it wrong are reasonably small
- Unambiguous and obvious what needs to be done
- No architectural decisions or trade-offs involved

**Examples:**
- Fixing typos in comments or documentation
- Updating stale comments to match current code
- Removing obviously dead imports
- Fixing simple formatting issues

**Process:**
1. Identify candidates meeting criteria
2. Make the fix directly
3. Update review file with Decision = "Just Fix It"
4. Notify user briefly before continuing to triage

### 8d: Triage Loop

For each remaining issue (sorted by score, highest first):

**Present the Issue:**
```
## Issue {N} of {Total}: {Title}

**Score:** {score}/100
**Location:** {file:line}
**Reported by:** {reviewer(s)}

**Description:** {what's wrong}

**Observation:** {evidence from reviewer}

**Scorer justification:** {why this score}
```

**Ask for Decision using AskUserQuestion:**

Always include a recommendation as the first option based on your analysis:

```
question: "How would you like to handle this issue?"
header: "Decision"
options:
  - label: "{Recommended option} (Recommended)"
    description: "{Standard description} - {Brief reason for recommendation}"
  - label: "Fix"
    description: "Add to fix list - will be implemented after triage"
  - label: "Defer"
    description: "Add to backlog for future work - not blocking"
  - label: "Dismiss"
    description: "False positive or acceptable as-is - no action needed"
  - label: "Discuss"
    description: "Investigate further before deciding"
multiSelect: false
```

**Handle Response:**

- **Fix:** Update review file with Decision = "Fix", add to todo list
- **Defer:** Update review file, add to `.cc-track/backlog.md`:
  ```
  - [{timestamp}] {issue title} - {location} (Deferred from code review)
  ```
- **Dismiss:** Update review file with Decision = "Dismiss" and rationale
- **Discuss:** Investigate using Explore agent, then re-present with Fix/Defer/Dismiss

### 8e: Action Summary

After all issues are triaged:

```
## Triage Complete

**Issues to Fix ({N}):**
1. {Issue title} - {location}
2. {Issue title} - {location}
...

**Deferred to Backlog ({N}):**
- {Issue title} - {rationale}
...

**Dismissed ({N}):**
- {Issue title} - {rationale}
...
```

Update review file Status to "triaged".

### 8f: Execute Fixes

**If no fixes needed:**
```
No fixes to execute. Code review complete.
```

**If fixes exist:**

For each fix:
1. Mark fix as in_progress in TodoWrite
2. Use cc-track:implementer subagent for straightforward fixes
3. Implement complex fixes directly
4. Update review file with Action taken
5. Mark fix as completed in TodoWrite

After all fixes:
```
All {N} fixes implemented. Review file updated.

Please re-run /cc-track:code-review to verify all fixes are correct and no new issues were introduced.
```

## Notes

- **6 agents** focus on code quality, not spec compliance (no spec folder)
- **Deduplication** by exact file:line matching before scoring
- **Threshold 50** shows verified issues, filters false positives
- **Review files** persist in `.cc-track/reviews/` with date stamps
- **Deferred items** go to backlog without spec ID tag
- **No relevance filtering** - all discovered issues >= 50 are presented
- **Reasoning-heavy reviewers use Sonnet** (bug-scanner, altitude-reviewer, guidelines-reviewer); the rest use Haiku for speed
