# Fix Statusline Display and Task Creation Hook

**Purpose:** Fix statusline regex to show correct token percentage, simplify display, add git branch, and prevent premature task creation

**Status:** completed
**Started:** 2025-09-10 23:20
**Task ID:** 006

## Requirements
- [x] Fix regex in statusline.sh to extract percentage (42%) instead of token count (84,339)
- [x] Remove block cost and timing displays from statusline
- [x] Reduce emoji usage (keep minimal indicators)
- [x] Add git branch display to statusline
- [x] Fix task detection to parse CLAUDE.md for active task reference
- [x] Change capture_plan hook from PreToolUse to PostToolUse
- [x] Clean up abandoned TASK_005.md file
- [x] Update CLAUDE.md to reference no_active_task.md (kept TASK_006 as current)

## Success Criteria
- Statusline correctly displays token usage as percentage
- Git branch name appears in statusline
- Task detection properly identifies active task from CLAUDE.md
- New tasks only created after plan approval (not before)
- No orphaned task files in the system
- Cleaner, more readable statusline without excessive information

## Technical Approach
Fix the ccusage output parsing regex to capture the percentage value correctly, simplify the statusline output by removing unnecessary cost calculations, add git branch detection using git symbolic-ref, parse CLAUDE.md to find @.claude/tasks/TASK_XXX.md references, and modify capture_plan hook timing to prevent premature task creation.

## Completion Summary
Successfully fixed all statusline and hook issues:
- Rewrote statusline.sh to parse ccusage output correctly and extract individual fields
- Removed redundant percentage extraction (ccusage already provides it properly formatted)
- Simplified output: Model | $X.XX today | $X/hr | tokens (%) | branch | task title
- Task title now extracted from CLAUDE.md reference and reads actual task file heading
- Moved capture_plan hook from PreToolUse to PostToolUse with success check
- Cleaned up abandoned TASK_005 that was created before plan rejection

The statusline now shows clean, useful information without duplication or excessive emojis.