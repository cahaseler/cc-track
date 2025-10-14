# TASK_072: Fix Missing settings.json Creation During Setup

## Purpose
Fix the bug where the Claude Code setup process never creates the required `settings.json` file, which prevents hooks from actually running even when enabled in `track.config.json`.

## Status
- **Current State**: in_progress
- **Started**: 2025-09-17 14:35
- **Priority**: High (Critical bug blocking proper setup)

## Requirements
- [ ] Update `src/commands/init.ts` to add Step 5 for settings.json creation
- [ ] Create dynamic settings.json generation based on enabled features in track.config.json
- [ ] Map each track.config.json feature to corresponding settings.json hooks:
  - [ ] `capture_plan` → ExitPlanMode hook
  - [ ] `stop_review` → Stop hook
  - [ ] `edit_validation` → PostToolUse hook for Edit/MultiEdit
  - [ ] `pre_tool_validation` → PreToolUse hook for Edit/MultiEdit
  - [ ] `pre_compact` → PreCompact hook
  - [ ] `statusline` → statusLine configuration
  - [ ] `code_review` → validation-passed hook
- [ ] Use correct command paths with `cc-track hook` format
- [ ] Test the complete setup flow to verify settings.json is created properly
- [ ] Verify hooks actually execute after setup completion

## Success Criteria
1. Setup process creates a properly configured `settings.json` file
2. All enabled features in `track.config.json` have corresponding hooks in `settings.json`
3. Hooks execute correctly in Claude Code after setup
4. Setup flow is seamless and requires no manual intervention for settings.json

## Technical Approach
1. **Modify setup template** in `src/commands/init.ts` to include explicit Step 5
2. **Create conditional logic** for settings.json generation based on feature flags
3. **Use proper hook command format**: `cc-track hook [hook-type] [options]`
4. **Ensure file paths and permissions** are correct for Claude Code integration

## Current Focus

Task completed on 2025-09-17

## Next Steps
1. Examine current `src/commands/init.ts` structure
2. Add Step 5 template with conditional settings.json creation logic
3. Map all track.config.json features to their corresponding hooks
4. Test the updated setup flow end-to-end
5. Verify hook execution in Claude Code environment

<!-- github_issue: 88 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/88 -->
<!-- issue_branch: 88-task_072-fix-missing-settingsjson-creation-during-setup -->