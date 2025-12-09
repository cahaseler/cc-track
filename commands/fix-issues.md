---
allowed-tools: Read, Write, Edit, Glob, Grep, Task, AskUserQuestion, SlashCommand
description: Triage code review issues one-by-one with Fix/Defer/Dismiss/Discuss options
---

# Fix Issues - Structured Issue Triage

Walk through code review issues one-by-one with structured decision options. Creates an audit trail in `issue-log.md`.

## Step 1: Identify Active Spec

Read CLAUDE.md to find the active spec folder:
- Look for `## Active Task` section with `@.cc-track/specs/NNN-feature-name/` reference
- Extract the spec folder path (e.g., `.cc-track/specs/109-feature-name/`)
- Extract the feature name from the path

If no active spec found, inform the user and stop.

## Step 2: Gather Issues from Context

Check if issues are already in the conversation context (from `/cc-track:prepare-completion`).

**If issues are in context:** Use them directly - they should include:
- Issue number/title
- Score (0-100)
- Location (file:line)
- Reviewer(s) who found it
- Description and observation
- Scorer justification

**If no issues in context:** Inform user this command expects issues from a prior review:
```
This command expects code review issues in context. Please run /cc-track:prepare-completion first to generate issues, or describe the issues you want to triage.
```

## Step 3: Check Existing State

Read existing files to filter already-handled issues:

1. **Check issue-log.md** (if exists at `{spec_folder}/issue-log.md`):
   - Parse the Summary table
   - Note issues with Decision = "Fix" (already fixed)
   - Note issues with Decision = "Dismiss" (already dismissed)
   - Note issues with Decision = "Defer" (already deferred)

2. **Check backlog.md** (at `.cc-track/backlog.md`):
   - Look for items tagged with the current spec ID
   - These are deferred issues from previous triage

3. **Filter the issue list:**
   - Remove any issue matching a Fixed/Dismissed entry in issue-log.md (match by location)
   - Remove any issue matching a Deferred entry (match by location or description)
   - Keep only NEW issues that haven't been triaged

4. **If all issues already handled:**
   ```
   All {N} issues have already been triaged in previous runs.
   - Fixed: {X}
   - Dismissed: {Y}
   - Deferred: {Z}

   Ready to proceed to /cc-track:complete-task or re-run /cc-track:prepare-completion to check for new issues.
   ```
   Stop here. Inform the user that all reported issues were already addressed and they can proceed to task completion with /cc-track:complete-task

## Step 4: Create/Update Issue Log

**If issue-log.md doesn't exist:** Create it with this structure:

```markdown
# Issue Log: {Feature Name}

**Spec:** {NNN-feature-name}
**Generated:** {timestamp}
**Status:** in_progress

## Summary

| # | Score | Status | Location | Decision | Action |
|---|-------|--------|----------|----------|--------|

## Issues

```

**If issue-log.md exists:** Read it and prepare to append new issues.

Add each NEW issue to the file:
- Add row to Summary table with Status = "pending"
- Add detailed section for each issue

## Step 5: Initialize Todo List

Before starting triage, use the TodoWrite tool to set up tracking:

1. Add "Triage all review issues" as the first item (in_progress)
2. You'll add individual fix tasks to the end of the list as users choose "Fix"

This ensures the triage process is visible in the todo list and fixes are tracked.

## Step 6: "Just Fix It" Protocol

Before presenting issues to the user, scan for trivial fixes that don't need human decision-making.

**Criteria for "Just Fix It":**
- Trivial fix in only one place (single file change)
- Consequences of getting it wrong are reasonably small
- Unambiguous and obvious what needs to be done
- No architectural decisions or trade-offs involved

**Examples of "Just Fix It" candidates:**
- Fixing typos in comments or documentation
- Updating stale comments to match current code
- Removing obviously dead imports
- Fixing simple formatting issues
- Correcting minor documentation inaccuracies
- Adding missing punctuation or capitalization in user-facing strings

**Process:**

1. **Identify candidates:** Review all issues and identify any that meet the "Just Fix It" criteria
2. **Add to todo list:** Use TodoWrite to add each as "Just Fix It: {brief description}" with status "pending"
3. **Execute each fix:**
   - Mark the item as in_progress
   - Make the single file change
   - Mark as completed
4. **Update issue-log.md:** For each fixed issue, set:
   - Status = "resolved"
   - Decision = "Just Fix It"
   - Action = "{what was changed}"
5. **Notify user:** Present a brief summary before continuing to triage:

```
## Auto-Fixed Trivial Issues

The following {N} trivial issues were fixed under the "Just Fix It" protocol:

1. **{Issue title}** ({location})
   - Changed: {brief description of change}

2. **{Issue title}** ({location})
   - Changed: {brief description of change}

These were unambiguous, single-file fixes with low risk. Continuing to triage remaining issues...
```

**If no "Just Fix It" candidates:** Skip this step silently and proceed to triage.

**Important:** When in doubt, don't "Just Fix It" - present to the user instead. This protocol is for truly trivial fixes only.

## Step 7: Triage Loop

For each NEW issue (sorted by score, highest first):

### Present the Issue

```
## Issue {N} of {Total}: {Title}

**Score:** {score}/100
**Location:** {file:line}
**Reported by:** {reviewer(s)}

**Description:** {what's wrong}

**Observation:** {evidence from reviewer}

**Scorer justification:** {why this score}
```

### Ask for Decision

Use the AskUserQuestion tool with these options. **Always include a recommendation** as the first option based on your analysis:

**Choosing the recommended option:**
- **Fix (Recommended)** - When issue is verified, high-scoring (75+), and straightforward to address
- **Defer (Recommended)** - When issue is real but out of scope, low priority, or would require significant refactoring
- **Dismiss (Recommended)** - When issue appears to be a false positive, context-dependent acceptable, or already addressed
- **Discuss (Recommended)** - When issue is ambiguous, requires domain knowledge, or you need clarification

```
question: "How would you like to handle this issue?"
header: "Decision"
options:
  - label: "{Recommended option} (Recommended)"
    description: "{Standard description} - {Brief reason for recommendation}"
  - label: "Fix"
    description: "Add to fix list - will be implemented via subagent after triage"
  - label: "Defer"
    description: "Add to backlog for future work - not blocking completion"
  - label: "Dismiss"
    description: "False positive or acceptable as-is - no action needed"
  - label: "Discuss"
    description: "Investigate further before deciding"
multiSelect: false
```

**Example with recommendation:**
```
options:
  - label: "Fix (Recommended)"
    description: "Add to fix list - Score 100, clear security issue with straightforward fix"
  - label: "Defer"
    description: "Add to backlog for future work - not blocking completion"
  - label: "Dismiss"
    description: "False positive or acceptable as-is - no action needed"
  - label: "Discuss"
    description: "Investigate further before deciding"
```

### Handle Response

**If Fix:**
- Update issue-log.md: Status = "triaged", Decision = "Fix"
- Use TodoWrite to add this fix to the END of your todo list (after "Triage all review issues")
  - Format: "Fix: {brief issue description}" with status "pending"
- Continue to next issue

**If Defer:**
- Ask for brief rationale (optional)
- Update issue-log.md: Status = "triaged", Decision = "Defer"
- Add to `.cc-track/backlog.md` with format:
  ```
  - [{timestamp}] [From {spec-id}] {issue title} - {location} (Deferred: {rationale})
  ```
- Continue to next issue

**If Dismiss:**
- Ask for brief rationale (optional)
- Update issue-log.md: Status = "triaged", Decision = "Dismiss", Rationale = {user's reason}
- Continue to next issue

**If Discuss:**
- Pause triage loop
- **Prefer using subagents for investigation** rather than exploring yourself:
  - Use the Task tool with `subagent_type: "cc-track:researcher"` to investigate technical questions
  - Use `subagent_type: "Explore"` to search the codebase for related patterns or context
  - This keeps investigation efficient and focused
- Provide the user with findings and relevant context
- When user is ready, re-present the same issue with Fix/Defer/Dismiss options
- Use AskUserQuestion again (without Discuss option this time)

## Step 8: Action Summary

After all issues are triaged:

1. Mark "Triage all review issues" as completed in TodoWrite
2. Present summary:

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

Update issue-log.md Status from "in_progress" to "triaged".

## Step 9: Execute Fixes

**If no fixes needed:**
```
No fixes to execute. Ready to proceed to /cc-track:complete-task.
```

**If fixes exist:**
```
Ready to implement {N} fixes. Proceeding in order...
```

**Execution approach - prefer subagents for straightforward fixes:**

For each fix in your todo list:

1. **Mark the fix as in_progress** in TodoWrite
2. **Assess complexity:**
   - **Simple/straightforward fix** (clear location, well-defined change): Use the Task tool with `subagent_type: "cc-track:implementer"` to implement the fix
   - **Complex fix** (requires understanding broader context, architectural decisions, or user input): Implement directly yourself
3. **After fix is complete:**
   - Update issue-log.md: Status = "resolved" for that issue
   - Mark the fix as completed in TodoWrite
   - Brief confirmation of what was changed

**Subagent prompt for implementer:**
```
Fix this code review issue:
- Issue: {description}
- Location: {file:line}
- Observation: {evidence}
- Expected fix: {what needs to change}

Read the file, implement the fix, and confirm what was changed.
```

After all fixes:
```
All {N} fixes implemented. Issue log updated.
```

## Step 10: Post-Execution

Update issue-log.md Status to "resolved" if all Fix items are complete.

Remind user:
```
Fixes complete. Please re-run /cc-track:prepare-completion to verify:
- All fixes are correct
- No new issues introduced
- Ready for task completion
```

## Notes

- **"Just Fix It" first:** Trivial, unambiguous fixes are handled automatically before triage
- **One at a time:** Each remaining issue is presented individually to prevent overwhelm
- **Highest score first:** Critical issues (100) are triaged before minor ones (50)
- **Recommendations:** Always provide a recommended action with reasoning
- **Todo tracking:** Uses TodoWrite to track triage progress and individual fixes
- **Subagent-first:** Prefer cc-track:implementer subagents for straightforward fixes, cc-track:researcher for investigation
- **Audit trail:** Every decision is logged in issue-log.md with timestamp
- **Backlog integration:** Deferred items are properly tagged for future reference
- **Iterative safe:** Re-running filters out already-handled issues
