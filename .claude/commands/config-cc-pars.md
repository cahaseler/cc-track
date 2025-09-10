---
shortname: config-cc-pars
---

# Config CC-PARS Command

When the user runs `/config-cc-pars`, help them configure the cc-pars system settings.

## Instructions for Claude

### When called with parameters

If the user provides parameters like `/config-cc-pars disable task creation` or `/config-cc-pars enable stop review`:

1. Parse the user's intent from the parameters
2. Map keywords to config settings:
   - "task creation", "capture plan", "plan capture" → `capture_plan` hook
   - "error extraction", "pre compact", "learned mistakes" → `pre_compact` hook  
   - "post compact", "context restore" → `post_compact` hook
   - "stop review", "auto commit", "deviation detection" → `stop_review` hook
   - "status line", "statusline" → `statusline` feature
3. Update the configuration file at `.claude/cc-pars.config.json`
4. Confirm the change to the user

### When called without parameters

Show the current configuration and ask what they'd like to adjust:

1. Read `.claude/cc-pars.config.json`
2. Display the current settings in a readable format
3. Ask the user what they'd like to configure

## Configuration File Structure

The configuration file is located at `.claude/cc-pars.config.json` with this structure:

```json
{
  "hooks": {
    "capture_plan": {
      "enabled": true,
      "description": "Captures plans from ExitPlanMode and creates task files"
    },
    "pre_compact": {
      "enabled": true,
      "description": "Extracts error patterns before compaction"
    },
    "post_compact": {
      "enabled": true,
      "description": "Restores context after compaction"
    },
    "stop_review": {
      "enabled": true,
      "description": "Reviews changes and auto-commits with [wip]"
    }
  },
  "features": {
    "statusline": {
      "enabled": true,
      "description": "Custom status line showing costs and task info"
    }
  }
}
```

## Examples

### Example 1: Disable a hook
User: `/config-cc-pars disable stop review`
Claude: 
1. Updates the config file to set `hooks.stop_review.enabled` to `false`
2. Confirms: "I've disabled the stop review hook. It will no longer review changes and auto-commit when you stop a session."

### Example 2: Enable a feature
User: `/config-cc-pars enable task creation`
Claude:
1. Updates the config file to set `hooks.capture_plan.enabled` to `true`
2. Confirms: "I've enabled the task creation hook. Plans will now be captured when you exit planning mode."

### Example 3: Show configuration
User: `/config-cc-pars`
Claude:
1. Reads the current configuration
2. Shows: "Here's your current cc-pars configuration:
   - **Task Creation** (capture_plan): ✅ Enabled
   - **Error Extraction** (pre_compact): ✅ Enabled
   - **Context Restore** (post_compact): ✅ Enabled
   - **Stop Review** (stop_review): ❌ Disabled
   - **Status Line**: ✅ Enabled
   
   What would you like to configure?"

## Important Notes

- Changes take effect immediately for new hook invocations
- Disabling a hook makes it exit silently without performing any actions
- The configuration file persists across sessions
- If the config file doesn't exist, hooks default to enabled