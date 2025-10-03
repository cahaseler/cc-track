# TASK_093: Simplify Statusline to Use Native Claude Code Context Data

## Purpose
Replace unreliable ccusage statusline calls with Claude Code's native context data to fix statusline reliability issues (wrong numbers, not updating properly) that have occurred since Sonnet 4.5 release.

## Status
in_progress

## Requirements
- [ ] Update ccusage dependency from 16.2.3 to latest 17.1.1
- [ ] Remove `getUsageInfo()` function that calls `bunx ccusage statusline`
- [ ] Remove regex parsing of ccusage output for tokens/rate/window
- [ ] Parse `cost` object from Claude Code input JSON for context percentage
- [ ] Calculate tokens from context percentage (multiply by 200K window)
- [ ] Keep `getTodaysCost()` function for daily cost calculations
- [ ] Maintain model name, branch, and task extraction functionality
- [ ] Preserve API timer configuration logic
- [ ] Update tests to match new implementation
- [ ] Test with actual Claude Code session to verify accuracy

## Success Criteria
- Statusline shows accurate context percentage from Claude Code
- Token calculations are correct (context % × 200K)
- No more infinite spawning or memory leaks from ccusage statusline calls
- Daily cost tracking still works via ccusage
- Statusline updates reliably and shows correct numbers
- Performance improvement from eliminating subprocess call

## Technical Approach
1. **Dependency Update**: Upgrade ccusage to 17.1.1 for better cost tracking reliability
2. **Native Data Integration**: Parse Claude Code's `cost` object directly from statusline JSON input
3. **Code Simplification**: Remove ccusage statusline subprocess calls and regex parsing
4. **Selective Retention**: Keep working ccusage functionality for daily costs while switching context data source

## Current Focus
Analyzing existing statusline.ts implementation to understand current ccusage integration points and Claude Code JSON input structure.

## Next Steps
1. Examine src/commands/statusline.ts to map out current `getUsageInfo()` implementation
2. Identify Claude Code's `cost` object structure in statusline JSON input
3. Update package.json ccusage version
4. Refactor statusline.ts to use native context data
5. Update corresponding tests
6. Validate with live Claude Code session

**Started:** 2025-10-03 20:55

<!-- github_issue: 130 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/130 -->
<!-- issue_branch: 130-task_093-simplify-statusline-to-use-native-claude-code-context-data -->