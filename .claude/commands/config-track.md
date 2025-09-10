---
shortname: config-track
---

# Config cc-track Command

When the user runs `/config-track`, help them configure the cc-track system settings.

## Instructions for Claude

### When called with parameters

If the user provides parameters like `/config-track disable task creation` or `/config-track enable stop review`:

1. Parse the user's intent from the parameters
2. Map keywords to config settings:
   - "task creation", "capture plan", "plan capture" → `capture_plan` hook
   - "error extraction", "pre compact", "learned mistakes" → `pre_compact` hook  
   - "post compact", "context restore" → `post_compact` hook
   - "stop review", "auto commit", "deviation detection" → `stop_review` hook
   - "edit validation", "typecheck", "linting" → `edit_validation` hook
   - "status line", "statusline" → `statusline` feature
   - "git branching", "feature branches", "task branches" → `git_branching` feature
3. Update the configuration file at `.claude/track.config.json`
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
    },
    "edit_validation": {
      "enabled": false,
      "description": "Runs TypeScript and Biome checks on edited files",
      "typecheck": {
        "enabled": true,
        "command": "bunx tsc --noEmit"
      },
      "lint": {
        "enabled": true,
        "command": "bunx biome check"
      }
    }
  },
  "features": {
    "statusline": {
      "enabled": true,
      "description": "Custom status line showing costs and task info"
    },
    "git_branching": {
      "enabled": false,
      "description": "Create feature branches for tasks and merge on completion"
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

### Example 3: Enable git branching
User: `/config-cc-pars enable git branching`
Claude:
1. Updates the config file to set `features.git_branching.enabled` to `true`
2. Confirms: "I've enabled git branching. New tasks will now create feature branches and merge them back on completion."

### Example 4: Enable edit validation
User: `/config-cc-pars enable edit validation`
Claude:
1. Updates the config file to set `hooks.edit_validation.enabled` to `true`
2. Confirms: "I've enabled edit validation. TypeScript and Biome checks will now run automatically after editing .ts/.tsx files, providing immediate feedback on any errors."

### Example 5: Show configuration
User: `/config-cc-pars`
Claude:
1. Reads the current configuration
2. Shows: "Here's your current cc-pars configuration:
   - **Task Creation** (capture_plan): ✅ Enabled
   - **Error Extraction** (pre_compact): ✅ Enabled
   - **Context Restore** (post_compact): ✅ Enabled
   - **Stop Review** (stop_review): ❌ Disabled
   - **Edit Validation** (edit_validation): ❌ Disabled
   - **Status Line**: ✅ Enabled
   - **Git Branching**: ❌ Disabled
   
   What would you like to configure?"

## Important Notes

- Changes take effect immediately for new hook invocations
- Disabling a hook makes it exit silently without performing any actions
- The configuration file persists across sessions
- If the config file doesn't exist, hooks default to enabled

## Edit Validation Configuration

The `edit_validation` hook has additional configuration options:

- **typecheck.enabled**: Enable/disable TypeScript type checking
- **typecheck.command**: Command to run for type checking (default: `bunx tsc --noEmit`)
- **lint.enabled**: Enable/disable Biome linting
- **lint.command**: Command to run for linting (default: `bunx biome check`)

You can customize these by directly editing `.claude/cc-pars.config.json`. For example, to use a different linter:

```json
"edit_validation": {
  "enabled": true,
  "description": "Runs TypeScript and Biome checks on edited files",
  "typecheck": {
    "enabled": true,
    "command": "npx tsc --noEmit"
  },
  "lint": {
    "enabled": true,
    "command": "npx eslint"
  }
}
```

Performance notes:
- TypeScript checking takes ~1.3-1.4 seconds per file
- Biome checking takes ~60-160ms per file
- Only .ts/.tsx/.mts/.cts files are validated
- Checks run in parallel for speed
- 5 second timeout for the entire hook execution