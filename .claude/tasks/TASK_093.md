# TASK_093: Fix Statusline Token Tracking for Sonnet 4.5

## Purpose
Fix statusline reliability issues (wrong numbers, not updating properly) that occurred since Sonnet 4.5 release. Investigation revealed Claude Code doesn't provide context percentage in statusline JSON, so we implement a pragmatic workaround.

## Status
in_progress

## Requirements
- [x] Update ccusage dependency from 16.2.3 to latest 17.1.1
- [x] Keep ccusage statusline call but pass full Claude Code JSON (session_id, transcript_path, etc.)
- [x] Keep regex parsing of ccusage output for tokens/rate/window
- [x] Add static overhead adjustment (61k) to account for Claude Code's reserved + system tokens
- [x] Calculate adjusted percentage based on 200K window
- [x] Keep `getTodaysCost()` function for daily cost calculations
- [x] Maintain model name, branch, and task extraction functionality
- [x] Preserve API timer configuration logic
- [x] Update tests to match new implementation
- [x] Test with actual Claude Code session to verify accuracy

## Success Criteria
- Statusline shows reasonably accurate context percentage (within ~10% of actual)
- Token calculations account for Claude Code overhead not visible in transcript
- ccusage 17.1.1 fixes memory leak and process spawning issues
- Daily cost tracking still works via ccusage
- Statusline updates reliably and shows correct numbers
- No performance regression

## Technical Approach
1. **Dependency Update**: Upgrade ccusage to 17.1.1 for bug fixes (memory leaks, process spawning)
2. **Full JSON Integration**: Pass complete Claude Code JSON to ccusage (not just model name)
3. **Overhead Adjustment**: Add 61k static overhead to ccusage token count:
   - System prompt + tools: ~16k
   - Reserved for autocompact + output: 45k
   - These tokens don't appear in transcript but Claude Code counts them
4. **Selective Retention**: Keep ccusage for what it does well (transcript parsing, daily costs)

## Recent Progress

**Discovery Phase (2025-10-03):**
- Investigated Claude Code's actual statusline JSON input
- Found that `cost` object does NOT include `context_usage_percent` field
- Only available fields: `total_cost_usd`, `total_duration_ms`, `total_api_duration_ms`, `total_lines_added`, `total_lines_removed`
- Confirmed ccusage v17.1.1 works when passed full Claude Code JSON

**Implementation (2025-10-03):**
- Updated ccusage dependency to 17.1.1 (fixes memory leaks and process spawning bugs)
- Modified `getUsageInfo()` to pass complete Claude Code JSON to ccusage
- Added 61k static overhead adjustment to account for:
  - System prompt + tools (~16k)
  - Reserved tokens for autocompact + output (45k)
- Updated tests to validate overhead adjustment approach
- Verified accuracy: shows 69% when actual is 78% (vs 39% before fix)

**Key Discovery:**
The original approach (using Claude Code's native context data) is **impossible** because Claude Code doesn't provide context percentage in statusline JSON. This is a limitation of Claude Code's API, not our implementation.

**Started:** 2025-10-03 20:55
**Completed:** 2025-10-03 21:15

<!-- github_issue: 130 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/130 -->
<!-- issue_branch: 130-task_093-simplify-statusline-to-use-native-claude-code-context-data -->