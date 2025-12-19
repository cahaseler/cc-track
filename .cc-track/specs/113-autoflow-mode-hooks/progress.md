# Progress Log: Autoflow Mode Hooks

## 2025-12-19

### Initial Implementation (Claude Mobile)

Initial brainstorm/proof-of-concept created with three hooks:
- UserPromptSubmit for activation/deactivation
- PermissionRequest for denying permissions when active
- Stop hook for evaluating whether to continue

### Refinement Session (Desktop)

Reviewed double-shot-latte project for battle-tested patterns. Key learnings:
1. Their evaluation prompt has been tested against 60+ scenarios
2. 3 continuations per 5-minute window is better than 2 in 30 seconds
3. Absolute rules trump context-based rationalization
4. Safe default: if evaluation fails, allow stop

**Changes made:**

1. **Fixed TypeScript errors** - Stop hook had wrong import pattern (`default` export instead of named export for ClaudeSDK)

2. **Adopted battle-tested evaluation prompt** from double-shot-latte:
   - CONTINUE only if assistant explicitly states next steps
   - STOP for task completion, questions, or blockers
   - Key principle: "If waiting for user, that means STOP"
   - Default to STOP when uncertain

3. **Improved throttling** - Changed from "2 stops in 30 seconds" to "3 continuations per 5-minute window" (from double-shot-latte's tested values)

4. **Better keyword detection** - Now handles negations properly:
   - "don't use autoflow" → does NOT activate
   - "no autoflow" → does NOT activate
   - "stop autoflow" → deactivates (priority over activation)

5. **Fixed Biome lint issues** - Import ordering, formatting

6. **Per-message opt-in** - Autoflow is not persistent; any user message without "autoflow" silently deactivates it. This gives natural control and prevents runaway sessions.

**Current state:**
```json
{
  "active": boolean,
  "sessionId": string,
  "activatedAt": ISO timestamp,
  "continueCount": number,
  "windowStart": ISO timestamp
}
```

**Files:**
- `hooks/user-message.ts` - Activation control with negation handling
- `hooks/permission-request.ts` - Permission denial (forces Claude to use safe alternatives)
- `hooks/stop.ts` - Stop evaluation with battle-tested prompt
- `hooks/hooks.json` - Hook registration

### Unit Test Coverage

Comprehensive unit tests added for all three hooks:

**user-message.test.ts (21 tests)**
- Activation patterns (`autoflow`, `AUTOFLOW`, case variations)
- Negation patterns (`don't autoflow`, `no autoflow`, `without autoflow`)
- Per-message opt-in/out behavior
- State management (session ID, continue count reset)
- Edge cases (empty message, missing fields)

**permission-request.test.ts (8 tests)**
- Permission denial when autoflow active
- Normal flow when autoflow inactive
- Message content verification
- Safe alternative suggestion

**stop.test.ts (24 tests)**
- `getLastMessages()` utility function
- `buildEvaluationPrompt()` construction
- Throttling (3 per 5-minute window)
- Window expiration and reset
- Evaluation flow (continue vs allow)
- State updates on block/allow
- Edge cases (inactive, no transcript)

### Testing Status

- [x] Test activation via "autoflow" message
- [x] Test negation patterns ("don't autoflow" should NOT activate)
- [x] Test permission denial when active
- [x] Test stop evaluation and continuation
- [x] Test throttle limit (3 continuations per 5-minute window)
- [x] Test deactivation (per-message: any message without "autoflow")

### Validation Results

All validation passes:
- TypeScript: ✅
- Biome: ✅
- Unit Tests: 53 tests pass (user-message: 21, permission-request: 8, stop: 24)
- Full Suite: 433 tests pass

### Local Configuration

Hooks connected in `.claude/settings.json`:
```json
{
  "hooks": {
    "UserPromptSubmit": [...user-message.ts],
    "PermissionRequest": [...permission-request.ts],
    "Stop": [...stop.ts]
  }
}
```

Ready for real-world testing in desktop Claude Code.

### Real-World Testing Session

**Issues Found and Fixed:**

1. **Wrong field name in UserPromptSubmit hook**
   - Used claude-code-guide agent to look up correct field: `prompt` (not `user_message`)
   - Fixed in `hooks/user-message.ts` and updated tests

2. **Improved activation message**
   - Now provides clearer guidance to Claude about what autoflow means
   - Emphasizes: work autonomously, but don't take shortcuts or dangerous workarounds
   - If genuinely need user input, clearly state the problem and stop

3. **Improved permission denial message**
   - Tells Claude to clearly state the problem and STOP if no safe alternative
   - Not implying automatic behavior

4. **Fixed TypeError in stop hook**
   - Added null check for `msg.content` before calling `.find()`
   - Some messages have undefined or non-array content

5. **Fixed Claude SDK stale fnm path issue**
   - Root cause: fnm multishell paths become invalid when terminal session ends
   - Log showed: `ENOENT: no such file or directory, uv_spawn 'C:\Users\cahaseler\AppData\Local\fnm_multishells\358316_...\claude'`
   - Initial fix (insufficient): Added `existsSync()` check - but fnm shims still exist on disk, they just fail to spawn
   - Final fix: Skip any path containing `fnm_multishells` - these are session-specific shims
   - Now correctly finds stable path: `C:\Users\cahaseler\.local\bin\claude.exe`

6. **Added autoflow state to statusline**
   - Shows `🤖 Autoflow (N/3)` when autoflow mode is active
   - N indicates continuation count within the 5-minute window
   - Displayed at the start of the second line (before branch and task)
   - Added `getAutoflowState()` function with full test coverage
   - 6 new tests for autoflow state detection and statusline integration

7. **Fixed transcript message parsing for SDK format**
   - Claude Code transcripts can use two formats:
     - Simple: `{ role: 'user', content: [...] }`
     - SDK: `{ type: 'user', message: { role: 'user', content: [...] } }`
   - Updated `getLastMessages()` to check for `message` wrapper and extract content from either format
   - Added 2 new tests for SDK format handling
   - This fixes the "empty undefined entries" issue where evaluator saw no content

8. **Filter invalid messages instead of injecting garbage**
   - Some transcript entries are tool results, system messages, or tool-use-only messages
   - These were being included with placeholder text like `[no text content]`
   - Updated `getLastMessages()` to filter out messages that:
     - Don't have valid role (user/assistant)
     - Don't have array content
     - Don't have text content
   - Updated tests to expect filtered output (empty string) instead of placeholders
   - 26 stop hook tests pass

9. **SDK model verification**
   - Stop hook uses `ClaudeSDK.prompt(prompt, 'haiku', {...})`
   - SDK maps `'haiku'` to `--model haiku` for Claude CLI
   - Same approach as double-shot-latte project
   - Claude CLI resolves `haiku` to latest (currently haiku-4.5)
