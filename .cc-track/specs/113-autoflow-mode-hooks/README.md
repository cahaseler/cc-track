# Autoflow Mode - Quick Start Guide

## What is Autoflow Mode?

Autoflow mode enables Claude Code to work autonomously with minimal user interaction. When activated:

- 🤖 Claude works through tasks without asking "should I continue?"
- 🚫 Permission requests are denied with "user not available, find a safe workaround"
- 🔁 Claude automatically continues when stopping to ask for confirmation
- 🛡️ Throttle detection prevents runaway sessions (3 continues per 5 minutes)

**Key design:** Autoflow is **per-message opt-in**, not a persistent mode. Each user message must include "autoflow" to keep the mode active. This gives you natural control - just send a message without "autoflow" to regain manual control.

## How to Use

### Activate Autoflow Mode

Include `autoflow` anywhere in your message to Claude:

```
Please implement the user authentication feature. autoflow
```

Claude will respond with:
```
🤖 Autoflow mode active for this task.
```

### Keeping Autoflow Active

If Claude completes the task and you want to continue autonomously:
```
Great, now add the tests. autoflow
```

### Regaining Manual Control

Simply send any message without "autoflow":
```
Wait, let me review what you did first.
```

Autoflow silently deactivates and Claude waits for your input normally.

### What Happens in Autoflow Mode

1. **Permission Requests**: If Claude tries to do something requiring permission, it will be denied with a message:
   > "User is not available. Please find a safe alternative approach to accomplish this goal."

2. **Stop Events**: When Claude stops to ask "Should I continue?", the hook:
   - Reads recent conversation messages
   - Uses Claude SDK (haiku) to evaluate if really done or just asking
   - If asking to continue: Blocks stop with "Continue working according to the plan"
   - If genuinely done: Allows stop

3. **Throttle Detection**: If Claude auto-continues 3 times within 5 minutes:
   - Autoflow mode automatically deactivates
   - Claude is shown: "⚠️ Autoflow throttle limit reached"

### Deactivating Autoflow Mode

Autoflow deactivates automatically when:

1. **You send a message without "autoflow"** - Most natural way
2. **Throttle limit reached** - 3 auto-continues in 5 minutes triggers safety stop
3. **Work is genuinely complete** - Claude finishes and the Stop hook allows it

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
  "continueCount": 1,
  "windowStart": "2025-12-19T12:00:00.000Z"
}
```

## Troubleshooting

### Autoflow keeps stopping

If Claude stops repeatedly:
- Throttle detection will auto-deactivate after 3 auto-continues in 5 minutes
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
- **Throttle-based safety**: 3 continuations per 5-minute window before auto-deactivation

## Configuration

Currently, autoflow mode uses hardcoded defaults:
- Throttle limit: 3 continuations per 5-minute window (from double-shot-latte testing)
- Claude SDK model: haiku (fast, cheap)
- Evaluation timeout: 15 seconds

Future versions may expose these in `track.config.json`.

## Activation Patterns

The keyword detection is smart about negations:

**Will activate:**
- "implement the feature autoflow"
- "autoflow please"
- "let's go autoflow"

**Will NOT activate (negations):**
- "don't use autoflow"
- "no autoflow"
- "without autoflow"
- "not autoflow"

**Will deactivate (any message without "autoflow"):**
- "looks good, what's next?"
- "wait, let me check something"
- Any follow-up question or comment
