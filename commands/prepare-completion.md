---
allowed-tools: Bash, Edit, Read, Task
description: Prepare the current active task for completion (Phase 1 of task completion workflow)
---

# Prepare Task for Completion

Run validation checks and code review to ensure the task is ready for completion.

## Step 1: Run Validation Suite

Identify and run the appropriate validation tools for this project:

1. **Type checking** - Run TypeScript or other type checker if present
2. **Linting** - Run the project's linter (with auto-fix if available), then verify
3. **Tests** - Run the project's test suite
4. **Dead code detection** (optional) - Run tools like knip if configured

Track which checks pass/fail.

## Step 2: Report Validation Results

If any validation failed:
- Show what failed with error counts
- Provide specific fix instructions for each failure
- Ask user to fix issues and run `/prepare-completion` again
- **STOP** - do not proceed to code review

If all validation passed:
- Confirm: "✅ All validation checks passed"
- Proceed to Step 3

## Step 3: Code Review (if validation passed)

Use the code review tool configured for this project (Codex, CodeRabbit, or Claude SDK) to review the changes. Pass the entire active spec folder to the reviewer for context.

After review completes, present the review results to the user with these response guidelines:

**Code Review Response Principles:**
- **Verify first** - Check suggestions against codebase reality before agreeing
- **Question YAGNI violations** - If review suggests implementing unused features, push back
- **Check for breaking changes** - Verify suggestions don't break existing functionality
- **Technical evaluation only** - No performative agreement
- **No gratitude expressions** - Just fix issues or explain disagreement

**Required Analysis:**
1. **Issues to fix** - List each with exact approach and technical reasoning
2. **Issues to reject** - Identify with detailed technical justification
3. **Low-priority items** - Explain why non-critical
4. **Summary** - What must be fixed vs. what's incorrect/inapplicable

**IMPORTANT:** Present this analysis to the user and wait for their feedback before proceeding with fixes.

## Step 4: Update Documentation

Update the following documentation files:

1. **Task progress file** - Update with final implementation state
2. **`decision_log.md`** - Add entry for any architectural decisions made (if applicable)
3. **`system_patterns.md`** - Document any new patterns or conventions established (if applicable)
4. **Private journal** - Record technical insights and learnings (if private journal MCP available)

## Next Steps

If validation passed and review is addressed:
- Inform user: "✅ Task is ready for completion! Run `/complete-task` to finalize."

Note: If you have the private journal MCP available, consider using `mcp__private-journal__process_thoughts` to record insights about technical challenges and learnings.