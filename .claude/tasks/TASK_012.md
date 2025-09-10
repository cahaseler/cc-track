# Debug Capture Plan Approval Issue

**Purpose:** Debug intermittent capture_plan hook failures and fix the logging issue preventing proper debugging of plan approval detection logic.

**Status:** planning
**Started:** 2025-09-10 10:17
**Task ID:** 012

## Requirements
- [x] Analyze the 5 existing capture_plan log entries to understand current behavior
- [ ] **Fix capture_plan hook logging issue** - hook works but doesn't log
- [ ] Identify why logger fails in capture_plan context vs other hooks
- [ ] Examine real ExitPlanMode tool response structure vs test data expectations
- [ ] Test both approval methods: "approve with manual edits" vs "approve with automatic edits"
- [ ] Review the approval detection condition in capture_plan.ts:48 for intermittent failures
- [ ] Trigger actual planning session to capture real tool_response structure
- [ ] Fix detection logic based on real response format if needed
- [ ] Add robust logging to capture edge cases for future debugging
- [ ] Test the fix with another planning session
- [ ] Verify rejected plans still don't create tasks
- [ ] Update related documentation

## Success Criteria
- **Capture_plan hook logging is fully functional** - all hook events are logged properly
- Plan approval detection works correctly for real ExitPlanMode responses
- Tasks are created when plans are approved (both manual and automatic edit methods)
- Tasks are NOT created when plans are rejected
- Comprehensive logging captures all response variations for future debugging of intermittent failures
- Fix is validated with at least one successful real planning session

## Technical Approach
1. Evidence analysis of existing logs to identify patterns
2. Live testing with actual Claude Code planning sessions
3. Response structure comparison between test data and real responses  
4. Conditional logic refinement in capture_plan hook
5. Enhanced logging for edge case detection

## Current Focus
Start with analyzing the existing capture_plan log entries to understand what's currently happening vs expected behavior

## Open Questions & Blockers
- What do real ExitPlanMode tool responses look like compared to test data?
- Are there differences between the two approval methods that affect response structure?
- Is the current `tool_response.plan` condition the correct detection method?

## Next Steps
1. Review existing capture_plan logs for patterns
2. Test actual planning session to capture real response structure
3. Compare real vs expected response formats
4. Update detection logic if needed