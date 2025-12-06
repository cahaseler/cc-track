---
allowed-tools: Bash, Edit, Read, Task, Skill
description: Prepare the current active task for completion (Phase 1 of task completion workflow)
---

# Prepare Task for Completion

Run validation checks and code review to ensure the task is ready for completion.

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
- Run code review if validation passes

## Step 3: Interpret Results

The script returns JSON output. Parse and present the results:

**If validation failed:**
- Show what failed with error counts from `data.validation`
- Provide specific fix instructions for each failure type
- Ask user to fix issues and run `/prepare-completion` again
- **STOP** - do not proceed

**If validation passed:**
- Confirm: "✅ All validation checks passed"
- If code review was generated, present `data.codeReview` results

## Step 4: Code Review Response (if review generated)

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