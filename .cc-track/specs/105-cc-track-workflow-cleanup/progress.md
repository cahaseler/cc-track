# Progress: cc-track Workflow Cleanup

## Implementation Complete

### Part 1: Pre-tool-validation Hook Simplification

**Changes made:**
- Added `isMetadataFile()` function to detect `.cc-track/specs/NNN-feature-name/.metadata.json` files
- Implemented blocking logic for metadata file edits with helpful error message
- Removed obsolete code:
  - `isTaskFile()` function
  - `extractDiffInfo()` function
  - `buildValidationPrompt()` function
  - Claude SDK validation logic (~90 lines)
  - `ClaudeSDK` import
  - `claudeSDK` from dependencies interface
- Updated tests:
  - Added `isMetadataFile()` unit tests
  - Added metadata protection integration tests
  - Removed obsolete test blocks for removed functions

**Net result:** ~150 lines removed, ~20 lines added. Much simpler hook.

### Part 2: Command Naming Standardization

**Updated files with `/cc-track:` prefix:**
- `commands/plan.md` - references to `/specify`, `/tasks`
- `commands/specify.md` - references to `/plan`
- `commands/tasks.md` - references to `/plan`
- `commands/complete-task.md` - references to `/prepare-completion`
- `commands/prepare-completion.md` - references to `/complete-task`
- `commands/context-maintenance.md` - general references
- `commands/constitution.md` - references to `/plan`
- `templates/CLAUDE.md` - reference to `/complete-task`
- `templates/no_active_task.md` - references to `/specify`
- `templates/metadata-example.json` - references to `/specify`, `/migrate`
- `templates/constitution-template.md` - references to `/plan`
- `templates/plan-template.md` - references to `/tasks`
- `.cc-track/cc-track-workflow.md` - all command references

### Validation

- ✅ 37 pre-tool-validation tests passing
- ✅ 330 total tests passing
- ✅ TypeScript check passing
- ✅ Biome lint passing

### Backlog Cleanup

Removed addressed items:
- "Update the commands that mention other commands to use their cc-track names"
- "Revisit pre-tool-validation hook to verify it still functions correctly"

### Code Review Fixes (2025-12-06)

Fixed path corruption issues from overly aggressive sed replacement:
- Reverted `.cc-track/cc-track:constitution.md` → `.cc-track/constitution.md` (5 locations)
- Reverted `.claude/cc-track:tasks/` → `.claude/tasks/` (6 locations)
- Fixed file references `spec/cc-track:plan/cc-track:tasks` → `spec/plan/tasks` (2 locations)
- Updated module docstring to reflect metadata protection instead of task validation
