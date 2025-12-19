# Autoflow Mode - Quick Start Guide

## What is Autoflow Mode?

Autoflow mode enables Claude Code to work autonomously with minimal user interaction. When activated:

- 🤖 Claude works through tasks without asking "should I continue?"
- 🚫 Permission requests are denied with "user not available, find a safe workaround"
- 🔁 Claude automatically continues when stopping to ask for confirmation
- 🛡️ Loop detection prevents infinite stop/continue cycles

## How to Use

### Activate Autoflow Mode

Simply type `autoflow` in your message to Claude:

```
Please implement the user authentication feature. autoflow
```

Claude will respond with:
```
🤖 Autoflow mode activated. Working autonomously until complete.
```

### What Happens in Autoflow Mode

1. **Permission Requests**: If Claude tries to do something requiring permission, it will be denied with a message:
   > "User is not available. Please find a safe alternative approach to accomplish this goal."

2. **Stop Events**: When Claude stops to ask "Should I continue?", the hook:
   - Reads recent conversation messages
   - Uses Claude SDK (haiku) to evaluate if really done or just asking
   - If asking to continue: Blocks stop with "Continue working according to the plan"
   - If genuinely done: Allows stop

3. **Loop Detection**: If Claude stops >2 times within 30 seconds:
   - Autoflow mode automatically deactivates
   - Claude is shown: "⚠️ Autoflow loop detected - stopping autonomous mode"

### Deactivate Autoflow Mode

Type `stop autoflow` or `exit autoflow`:

```
stop autoflow
```

Claude will respond with:
```
🛑 Autoflow mode deactivated.
```

## Prerequisites

Before using autoflow mode, you should:

1. **Configure Claude Code permissions** sensibly in `.claude/settings.json`:
   ```json
   {
     "allow": [
       "Read",
       "Grep",
       "Glob",
       "Edit",
       "Write",
       "Bash(git:*)",
       "Bash(npm:*)",
       "Bash(bun:*)"
     ],
     "ask": [
       "Bash(rm:*)",
       "Bash(curl:*)"
     ]
   }
   ```

2. **Have a clear plan** - Autoflow works best when there's a defined task list (e.g., `tasks.md`)

## How It Works (Technical)

### Hooks

Three hooks power autoflow mode:

1. **UserPromptSubmit** (`hooks/user-message.ts`):
   - Detects "autoflow" → writes `{active: true}` to `.cc-track/.autoflow-state.json`
   - Detects "stop autoflow" → writes `{active: false}`

2. **PermissionRequest** (`hooks/permission-request.ts`):
   - If autoflow active → DENY with helpful message
   - If not active → normal permission flow

3. **Stop** (`hooks/stop.ts`):
   - If autoflow active:
     - Read transcript to get recent messages
     - Call Claude SDK: "Is this agent done or asking to continue?"
     - If asking to continue → BLOCK (exit code 2) with continuation message
     - If really done → allow stop
   - Track stop count for loop detection

### State File

`.cc-track/.autoflow-state.json`:
```json
{
  "active": true,
  "sessionId": "abc123",
  "activatedAt": "2025-12-19T12:00:00.000Z",
  "stopCount": 1,
  "lastStop": "2025-12-19T12:05:00.000Z"
}
```

## Troubleshooting

### Autoflow keeps stopping

If Claude stops repeatedly:
- Loop detection will auto-deactivate after >2 stops in 30 seconds
- Check if there's a blocker preventing progress (missing file, unclear requirement)
- Review the task list - Claude might genuinely be done

### Permissions blocking progress

If a permission denial is blocking important work:
1. Type `stop autoflow` to deactivate
2. Manually approve the operation
3. Optionally add to your `.claude/settings.json` allow list
4. Type `autoflow` to re-activate

### Claude isn't continuing

The Stop hook uses Claude SDK to evaluate stops. If it's not working:
- Check logs in `~/.local/share/cc-track/logs/` (Linux) or platform equivalent
- Verify Claude SDK is installed: `bun pm ls @anthropic-ai/claude-agent-sdk`
- Check transcript is accessible at the path provided in hook input

## Examples

### Example 1: Feature Implementation

```
User: Please implement the shopping cart feature according to spec.md. autoflow

[Claude activates autoflow, reads spec, starts implementing]
[Claude encounters permission request for editing package.json]
[Permission denied with "find safe workaround" message]
[Claude continues using existing dependencies]
[Claude stops after completing all tasks]
```

### Example 2: Bug Fix

```
User: Fix the authentication bug described in issue #123. autoflow

[Claude activates autoflow, reads issue, investigates]
[Claude makes fixes, writes tests]
[Claude stops to ask "Should I run the test suite?"]
[Stop hook evaluates: Claude is asking to continue]
[Stop blocked with "Yes, continue working"]
[Claude runs tests, sees pass, genuinely done]
[Stop hook evaluates: Claude is done]
[Stop allowed]
```

## Limitations

- **Cannot override pre-configured permissions**: Only denies additional permission requests
- **Relies on Claude SDK**: Requires working Claude SDK installation for stop evaluation
- **Best with clear tasks**: Works best when there's a defined plan or task list
- **Loop detection is simple**: Time-based (30 seconds) may not catch all loops

## Configuration

Currently, autoflow mode uses hardcoded defaults:
- Loop detection: >2 stops in 30 seconds
- Claude SDK model: haiku (fast, cheap)
- Evaluation timeout: 10 seconds

Future versions may expose these in `track.config.json`.
