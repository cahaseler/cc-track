# Claude Code Hook Output Visibility Bug - September 2025

## Issue Summary

As of September 17, 2025, Claude Code pushed an update that includes a change described as "Show condensed output for post-tool hooks to reduce visual clutter". This change has inadvertently broken the entire hook feedback system by hiding ALL hook outputs from both users and Claude, despite documentation claiming certain fields should remain visible.

## Impact

### User Impact
- **systemMessage fields are completely hidden** - Users no longer see hook status messages that previously appeared as bright yellow text in the UI
- **Hook feedback only visible in transcript mode** - Raw JSON output can be seen when toggling to transcript view, but this is not usable during normal workflow
- **Loss of real-time feedback** - Users have no visibility into whether their work is on track, has deviated, or needs correction

### Claude Impact
- **PostToolUse `reason` fields not delivered** - Claude no longer receives validation errors or review feedback that was designed to guide behavior
- **Loss of automated guidance** - Hooks can no longer prompt Claude to fix TypeScript errors, align with requirements, or verify claims
- **Breaking intended feedback loops** - The core purpose of hooks (providing automated feedback) is defeated

## Technical Details

### Expected Behavior (Per Documentation)

According to Claude Code documentation, hooks can return JSON with various fields:

```json
{
  "continue": true,
  "stopReason": "string",
  "suppressOutput": true,
  "systemMessage": "Optional warning message shown to the user"
}
```

The documentation explicitly states:
- `systemMessage` is "Optional warning message shown to the user"
- For PostToolUse hooks, `decision: "block"` should "automatically prompt Claude with reason"

### Actual Behavior

Testing reveals that:
1. **systemMessage fields are NOT shown to users** despite documentation claiming they should be
2. **reason fields from PostToolUse hooks are NOT delivered to Claude** despite being intended for automated prompting
3. **additionalContext fields are NOT delivered to Claude** even though docs say they provide "context for Claude to consider"
4. **suppressOutput field has no effect** - setting it to true or false makes no difference
5. **All hook outputs are hidden** unless viewing in transcript mode (raw JSON only)
6. **No hook feedback channels work** - all documented communication methods are broken

### Test Methodology

We tested by:
1. Creating TypeScript files with deliberate errors to trigger edit-validation hooks
2. Modifying stop-review hooks to include distinct test markers in `reason` vs `systemMessage` fields
3. Testing `suppressOutput` field with both `true` and `false` values
4. Testing `additionalContext` field in `hookSpecificOutput` object
5. Adding `[TEST]` prefixes to different fields to track which ones reach Claude
6. Monitoring what feedback reached Claude through various channels
7. Testing with VS Code open/closed to isolate file watcher effects

### Findings

1. **No hook feedback reaches Claude through intended channels** - Neither `reason`, `systemMessage`, nor `additionalContext` fields are delivered
2. **suppressOutput field is non-functional** - Has no effect whether set to `true` or `false`
3. **Transcript mode shows raw output** - Hook JSON is visible but only in read-only transcript view
4. **File modification workaround** - We inadvertently discovered Claude receives file modification notifications through VS Code, not hook outputs
5. **Complete feedback system failure** - Every documented communication channel is broken

## Workaround Implementation

We implemented a partial workaround using the statusline:

### Solution Architecture

1. **Hook writes status to file** (`hook-status.json`):
```typescript
const statusData = {
  timestamp: new Date().toISOString(),
  message: review.message,
  status: review.status,  // for emoji/color selection
  source: 'stop_review'
};
```

2. **Statusline reads and displays recent messages**:
- Checks if message is < 60 seconds old
- Displays as additional line with appropriate emoji/color
- Shows for brief period then disappears

3. **Result**:
```
✅ Project is on track                        <- Hook status (when recent)
🚅 Sonnet 💸 $134.44 today                   <- Technical info
🛤️ main | TASK_071: Hook Display Task        <- Project context
```

### Limitations of Workaround

- Only works for stop-review hook (not edit-validation)
- Requires statusline to be enabled
- Doesn't restore Claude's ability to see feedback
- Message only visible for 60 seconds
- No feedback for other hook types

## Implications

This bug effectively breaks the entire hook ecosystem's feedback mechanisms:

1. **Edit validation** - Claude no longer sees TypeScript/lint errors automatically
2. **Stop review** - Users don't know if work is on track or deviating
3. **Task validation** - No visible feedback when task requirements aren't met
4. **Branch protection** - No clear messaging when edits are blocked

The hooks still execute and can block actions, but their educational/guidance purpose is lost since neither party can see the explanatory messages.

## Recommendations

### For Anthropic

1. **Restore systemMessage visibility** as documented
2. **Ensure PostToolUse reason fields reach Claude** for automated guidance
3. **Provide migration path** if this is an intentional breaking change
4. **Update documentation** to reflect actual behavior
5. **Consider opt-in/opt-out** for "condensed output" mode

### For cc-track Users

1. **Enable statusline workaround** - Provides partial visibility for stop-review
2. **Monitor transcript mode** - Check raw output when hooks might be running
3. **Watch for updates** - This appears to be an unintended regression
4. **Report issues** - Add weight to the bug report

## References

- GitHub Issue: [#7530](https://github.com/anthropics/claude-code/issues/7530) (if one exists)
- Feedback submitted: September 17, 2025, ~14:52 UTC
- First observed: September 17, 2025
- Claude Code version: Not specified in update notes

## Testing Commands

To verify the issue:

```bash
# Create a file with TypeScript errors
echo 'const x: number = "string"' > test.ts

# Check if Claude receives feedback (it won't)

# Check transcript mode for raw output
# Toggle to transcript view in Claude Code UI

# Check statusline for workaround
echo '{"model":{"display_name":"Sonnet"}}' | ./dist/cc-track statusline
```

## Conclusion

A seemingly minor UI change ("reduce visual clutter") has completely broken the hook feedback system. This is likely an unintended consequence rather than intentional design, as it contradicts documentation and breaks core functionality. The statusline workaround provides minimal mitigation but doesn't address the fundamental issue of broken feedback channels.