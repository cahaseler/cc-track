# Improve /complete-task Command with Smart Script

**Purpose:** Create a comprehensive TypeScript script that handles all programmatic aspects of task completion safely, with intelligent error handling and clear reporting to Claude for decision-making on edge cases.

**Status:** completed
**Started:** 2025-09-10 16:55
**Task ID:** 021

## Requirements

- [ ] Create `.claude/scripts/complete-task.ts` script with core operations
- [ ] Implement prerequisite validation (active task check, file existence)
- [ ] Add task status update functionality (in_progress → completed)
- [ ] Implement CLAUDE.md update (replace active task with no_active_task.md)
- [ ] Update no_active_task.md with completed task entry
- [ ] Add validation checks (TypeScript and Biome)
- [ ] Implement safe git operations (WIP commit squashing when appropriate)
- [ ] Add branching support for git_branching workflows
- [ ] Design comprehensive JSON output format for reporting
- [ ] Implement safety features (no force operations, graceful error handling)
- [ ] Update `.claude/commands/complete-task.md` to use the new script
- [ ] Remove addressed item from `.claude/backlog.md`

## Success Criteria

- Script executes once and reports all operations attempted
- Task file status changes from "in_progress" to "completed" reliably
- CLAUDE.md always gets updated to reference no_active_task.md
- Script handles edge cases gracefully (mixed commits, validation errors, missing files)
- Clear JSON output allows Claude to make informed decisions about follow-up actions
- No interactive prompts or forced operations
- All file modifications are safe and reversible

## Technical Approach

Create a single TypeScript script that performs all mechanical operations in sequence, with comprehensive error handling and reporting. The script will:

1. Validate prerequisites and extract task information
2. Update task file status and add completion date
3. Update CLAUDE.md reference
4. Add completed task to no_active_task.md
5. Run validation checks (continue on failure)
6. Handle git operations intelligently based on commit patterns
7. Support branch merging for git_branching workflows
8. Output structured JSON report for Claude to process

The updated command will execute the script and then prompt Claude to handle reflection, issue resolution, and documentation updates based on the script's output.

## Current Focus

Task completed on 2025-09-10

## Open Questions & Blockers

- Need to verify the exact structure of existing task files for proper parsing
- Should confirm the current git workflow patterns to ensure safe squashing logic
- May need to test with various edge cases (malformed files, mixed commits, etc.)

## Next Steps

1. Create the basic script structure with prerequisite validation
2. Implement task file and CLAUDE.md update logic
3. Add validation check integration
4. Build git operations with safety checks
5. Design and implement JSON output format
6. Update the complete-task command to use the script
7. Test with various scenarios and edge cases