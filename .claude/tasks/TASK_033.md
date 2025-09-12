# Split Task Completion into Two-Phase Workflow

**Purpose:** Create `/prepare-completion` and enhanced `/complete-task` commands that separate validation/preparation from mechanical completion, leveraging existing automation and improving task workflow efficiency.

**Status:** in_progress
**Started:** 2025-09-12 08:06
**Task ID:** 033

## Requirements

### Phase 1: `/prepare-completion` Command
- [x] Create `src/commands/validation-checks.ts` that returns structured JSON
- [x] Implement validation checks (TypeScript, Biome, tests, Knip)
- [x] Add git status reporting (uncommitted changes, modified files, WIP commits, branch check)
- [x] Add task verification (active task exists, status is in_progress, extract ID/title)
- [x] Return structured JSON report with all issues
- [x] Create `src/commands/prepare-completion.ts` wrapper that generates dynamic instructions
- [x] Create `.claude/commands/prepare-completion.md` Claude command
- [x] Add documentation update instructions (shown regardless of validation status)
- [x] Add journal reflection reminders
- [x] Leverage stop-review hook for automatic commits

### Phase 2: Enhanced `/complete-task` Command
- [x] Update `src/commands/complete-task.ts` with pre-flight validation checks
- [x] Add early exits with clear error messages for missing prerequisites
- [x] Add PR existence check to prevent duplicates
- [x] Implement safety commit for uncommitted changes
- [x] WIP commit squashing functionality (already existed)
- [x] Add automatic PR creation with basic title format
- [x] Add automatic branch switching and pull from origin
- [x] Generate dynamic instructions based on results
- [x] Update `.claude/commands/complete-task.md` for minimal Claude responsibilities
- [x] Add PR enhancement instructions using `gh pr edit`
- [x] Simplify post-completion documentation to just progress log

### Integration & Setup
- [x] Register validation-checks command in CLI
- [x] Register prepare-completion command in CLI
- [x] Build and compile successfully
- [ ] Test PR duplicate prevention logic
- [ ] Test automatic branch management
- [ ] Test the complete two-phase workflow end-to-end

## Success Criteria

1. **Two-phase workflow operational:** Users can run `/prepare-completion` to fix issues and prepare, then `/complete-task` to execute mechanical completion
2. **Validation integration:** All validation checks (TypeScript, Biome, tests, Knip) work correctly in prepare phase
3. **PR management:** Smart PR handling prevents duplicates, creates with proper title, enhances with detailed description
4. **Automatic branch management:** Complete phase automatically switches to default branch and pulls latest
5. **Idempotent operations:** Both commands can be safely re-run without side effects
6. **Existing automation leveraged:** Stop-review hook handles documentation commits automatically

## Technical Approach

- **Leverage existing automation:** Use stop-review hook for commits, build on current validation logic
- **Separation of concerns:** Prepare phase handles fixes/validation, complete phase handles mechanical operations
- **Smart PR handling:** Check for existing PRs using `gh pr list --head [branch]` before creating new ones
- **Structured data flow:** Scripts return JSON for Claude to process, clear handoff points between phases
- **Safety mechanisms:** Pre-flight checks, safety commits, automatic fallbacks

## Recent Progress

**Revised Architecture Implemented:** Instead of having prepare-completion do everything, we split it into:
1. **validation-checks command**: Returns JSON with validation results (TypeScript, Biome, tests, Knip, git status)
2. **prepare-completion wrapper**: Calls validation-checks and generates dynamic instructions based on results
3. **complete-task enhancements**: Added early exits with clear error messages, pre-flight validation check

**Phase 1 Complete:** 
- Created `validation-checks` command that runs all validation and returns structured JSON
- Created new `prepare-completion` wrapper that generates context-specific instructions
- Instructions now always include documentation/journal reminders regardless of validation status
- Fixed complete-task.ts to have proper early exits when prerequisites fail

**Phase 2 Complete:**
- Enhanced complete-task with pre-flight validation (calls validation-checks)
- Added PR duplicate prevention and creation
- Implemented automatic branch switching after completion
- Added safety commits for uncommitted changes
- WIP commit squashing already existed and works

## Current Focus

Testing and finalizing the two-phase workflow. All major functionality is implemented.

## Open Questions & Blockers

- Need to verify `gh pr list --head [branch]` syntax for PR existence checking
- ~~Confirm Knip integration approach and error handling~~ ✓ Implemented and working
- ~~Validate that stop-review hook will properly handle documentation commits in prepare phase~~ ✓ Leveraging existing automation
- ~~Test behavior when task file doesn't exist or is malformed~~ ✓ Handled with appropriate error messages

## Next Steps

1. ~~Create `src/commands/prepare-completion.ts` with validation logic~~ ✓ Complete
2. ~~Test validation checks individually (TypeScript, Biome, tests, Knip)~~ ✓ Complete
3. ~~Create `.claude/commands/prepare-completion.md` with issue fixing logic~~ ✓ Complete
4. Register prepare-completion command in CLI (add to src/cli/index.ts)
5. Update `src/commands/complete-task.ts` with enhanced functionality (Phase 2)
6. Update `.claude/commands/complete-task.md` for minimal Claude responsibilities
7. Test prepare phase end-to-end with stop-review hook
8. Test complete phase with PR creation and branch management

<!-- branch: feature/task-completion-enhancement-033 -->