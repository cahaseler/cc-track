---
allowed-tools: Bash(/home/ubuntu/projects/cc-pars/dist/cc-track prepare-completion), Edit, Read, mcp__private-journal__process_thoughts
description: Validate and prepare task for completion
---

# Prepare Task Completion

## Validation Report
!`/home/ubuntu/projects/cc-pars/dist/cc-track prepare-completion`

## Your Task

Based on the validation report above:

### 1. Fix Any Validation Issues

**If validation errors exist:**

#### TypeScript Errors
- Review the TypeScript errors in the report
- Fix each error systematically
- Common fixes: add type annotations, fix imports, resolve type mismatches

#### Biome/Linting Issues  
- Address linting issues

#### Test Failures
- Review failing test output
- Fix broken tests or implementation issues
- Ensure all tests pass

#### Knip/Unused Code (Warnings Only)
- These are non-blocking but should be addressed if possible
- Remove truly unused files, exports, or dependencies
- Keep items that are intentionally unused (e.g., public API exports)

### 2. Reflect in Journal (Once, Idempotent)

**Only if you haven't already reflected on this task:**
- Technical insights learned during this task
- Challenges faced and how they were overcome
- Patterns or mistakes discovered
- Implementation approaches that worked well
- Skip if you've already journaled about this task

### 3. Update Task Documentation (If Not Already Done)

**Check if the task file already has a "## Completion Summary" section.**

If it doesn't exist, add it with:
- What was actually delivered (bullet points)
- Key implementation details
- Any deviations from original requirements  
- Testing results summary
- Technical decisions made

**Note:** The stop-review hook will automatically commit any documentation changes when you stop.

### 4. Exit Criteria

**Ready for completion when:**
- ✅ All TypeScript errors resolved
- ✅ All Biome/linting issues fixed
- ✅ All tests passing
- ✅ Task documentation updated with completion summary
- ✅ Journal reflection done (if new insights)
- ⚠️ Knip warnings acknowledged (not blockers)

**If all validation passes and documentation is complete:**
- Report: "Task is ready for completion. Run `/complete-task` to finalize."

**If validation still has errors:**
- Continue fixing issues
- As the user to run `/prepare-completion` again to verify all issues resolved

## Important Notes

- **Idempotent:** This command can be run multiple times safely
- **Auto-commit:** Stop-review hook handles documentation commits automatically
- **Focus on fixes:** Primary goal is to ensure clean validation before completion
- **Documentation once:** Don't duplicate completion summaries if they already exist