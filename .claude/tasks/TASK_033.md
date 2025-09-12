# Split Task Completion into Two-Phase Workflow

**Purpose:** Create `/prepare-completion` and enhanced `/complete-task` commands that separate validation/preparation from mechanical completion, leveraging existing automation and improving task workflow efficiency.

**Status:** completed
**Started:** 2025-09-12 08:06
**Task ID:** 033

## Requirements

### Phase 1: `/prepare-completion` Command
- [x] Create `src/commands/prepare-completion.ts` script component
- [x] Implement validation checks (TypeScript, Biome, tests, Knip)
- [x] Add git status reporting (uncommitted changes, modified files, WIP commits, branch check)
- [x] Add task verification (active task exists, status is in_progress, extract ID/title)
- [x] Return structured JSON report with all issues
- [x] Create `.claude/commands/prepare-completion.md` Claude command
- [x] Implement issue fixing logic in Claude command (TypeScript, linting, tests, unused code)
- [x] Add idempotent journal reflection capability
- [x] Add documentation updates (completion summary, deliverables, implementation details)
- [x] Leverage stop-review hook for automatic commits

### Phase 2: Enhanced `/complete-task` Command
- [ ] Update `src/commands/complete-task.ts` with pre-flight validation checks
- [ ] Add PR existence check to prevent duplicates
- [ ] Implement safety commit for uncommitted changes
- [ ] Add WIP commit squashing functionality
- [ ] Add automatic PR creation with basic title format
- [ ] Add automatic branch switching and pull from origin
- [ ] Return comprehensive completion report
- [ ] Update `.claude/commands/complete-task.md` for minimal Claude responsibilities
- [ ] Add PR enhancement using `gh pr edit`
- [ ] Add post-merge documentation updates

### Integration & Setup
- [ ] Register prepare-completion command in CLI (commander setup)
- [ ] Update existing complete-task command registration if needed
- [ ] Test PR duplicate prevention logic
- [ ] Test automatic branch management
- [ ] Test idempotent documentation updates

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

**Phase 1 Complete:** Successfully implemented the prepare-completion command with:
- Full TypeScript validation with proper config type exports
- Biome validation with auto-formatting (`--write` flag) 
- Test runner integration
- Knip unused code detection
- Git status reporting (uncommitted changes, WIP commits, branch info)
- Task verification and status checking
- Structured JSON output for Claude processing
- Claude instructions for fixing issues idempotently

Key improvements made:
- Fixed TypeScript config types by properly exporting `EditValidationConfig` interface
- Added auto-formatting to Biome check to reduce manual fixes
- Comprehensive error reporting with counts and truncated details

## Current Focus

Task completed on 2025-09-12

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