# Technical Implementation Plan: Autoflow Mode Hooks

**Feature ID**: 113
**Created**: 2025-12-19
**Status**: Implemented

## Architecture Overview

Autoflow mode is implemented using **three simple hook scripts** with minimal state management:

1. **UserPromptSubmit Hook** - Detects "autoflow" to activate/deactivate
2. **PermissionRequest Hook** - Denies permissions with "user unavailable" message
3. **Stop Hook** - Uses Claude SDK to evaluate if Claude should continue

**Key Design Principle:** Keep it simple - hooks are standalone bun scripts, state is a simple JSON file, no complex classes or safety rules needed.

## State Management

### Simple JSON State File: `.cc-track/.autoflow-state.json`

```json
{
  "active": boolean,
  "sessionId": string,
  "activatedAt": "ISO timestamp",
  "continueCount": number,
  "windowStart": "ISO timestamp"
}
```

That's it. No complex interfaces, no arrays of events, just the essentials:
- Is autoflow active?
- When did it start?
- How many auto-continues in current window? (for throttle detection)
- When did the 5-minute window start? (for window expiration)

## Hook Implementations

### 1. UserPromptSubmit Hook (`hooks/user-message.ts`)

**Purpose:** Detect activation/deactivation keywords

**Logic:**
```typescript
if (message.includes('autoflow')) {
  writeState({ active: true, sessionId, activatedAt: now(), stopCount: 0 });
  return { systemMessage: '🤖 Autoflow mode activated' };
}

if (message.includes('stop autoflow')) {
  writeState({ ...state, active: false });
  return { systemMessage: '🛑 Autoflow mode deactivated' };
}
```

**That's it.** No prompt injection, no auto-continue logic. Just activation/deactivation.

### 2. PermissionRequest Hook (`hooks/permission-request.ts`)

**Purpose:** Deny permissions when autoflow active

**Logic:**
```typescript
const state = readState();

if (!state?.active) {
  return { continue: true }; // Normal permission flow
}

// Autoflow active - deny with helpful message
return {
  hookSpecificOutput: {
    hookEventName: 'PermissionRequest',
    decision: {
      behavior: 'deny',
      message: '🤖 Autoflow Mode: User is not available.\n\n' +
               'Please find a safe alternative approach to accomplish this goal.'
    }
  }
};
```

**Why deny, not auto-approve?** Because the user has already configured Claude's safe operations in `.claude/settings.json`. The only permissions that reach this hook are ones the user hasn't pre-approved. In autoflow mode, Claude should work around these, not get them approved.

### 3. Stop Hook (`hooks/stop.ts`)

**Purpose:** Evaluate if Claude should continue working

**Logic:**
```typescript
const state = readState();

if (!state?.active) {
  return { action: 'allow' }; // Normal stop flow
}

// Check throttle limit (3 continuations per 5-minute window)
const windowExpired = isWindowExpired(state.windowStart, WINDOW_DURATION_MS);
const continueCount = windowExpired ? 0 : state.continueCount;

if (continueCount >= MAX_CONTINUES_PER_WINDOW) {
  writeState({ ...state, active: false }); // Deactivate
  return { action: 'throttle', message: '⚠️ Autoflow throttle limit reached' };
}

// Use Claude SDK to evaluate
const transcript = readTranscript(input.transcript_path);
const lastMessages = getLastMessages(transcript, 10);
const prompt = buildEvaluationPrompt(lastMessages);

const evaluation = await claudeSDK.sendMessage(prompt);

if (evaluation.shouldContinue) {
  // Block stop and tell Claude to continue
  writeState({
    ...state,
    continueCount: continueCount + 1,
    windowStart: windowExpired ? now() : state.windowStart
  });
  return { action: 'block', message: '🤖 Continue working...' };
}

// Allow stop - work complete
return { action: 'allow' };
```

**Why Claude SDK?** Because detecting "should I continue?" vs "work is done" requires understanding context. Pattern matching ("should i continue?") is too brittle. Claude SDK gives intelligent evaluation.

**Why block (exit 2)?** Because when Claude stops to ask "should I continue?", we want to tell Claude "no, keep working". The Stop hook can only block stops (prevent them), not inject responses. When we block with exit code 2, stderr becomes feedback shown to Claude.

## Throttle Algorithm

**5-minute window approach (from double-shot-latte testing):**

```
if (continuations >= 3 within 5 minutes) {
  deactivate autoflow
  show warning
}
```

Tracks:
- `continueCount`: How many auto-continues in current window
- `windowStart`: When the 5-minute window started
- If window expired (>5 minutes): Reset count to 0
- If `continueCount >= 3`: Throttle limit reached

**Why 3 per 5 minutes?** Tested by double-shot-latte project across 60+ scenarios:
1. Allows legitimate multi-step work (not too aggressive)
2. Catches loops before burning excessive tokens
3. Gives enough time for real progress between stops

The key insight: counting *continuations* (when we tell Claude to keep going) rather than *stops* is more meaningful for detecting stuck states.

## Implementation Phases

### Phase 1: State Management ✅
- Simple JSON read/write functions
- No complex classes needed

### Phase 2: UserPromptSubmit Hook ✅
- Keyword detection
- State file creation/updates
- User feedback messages

### Phase 3: PermissionRequest Hook ✅
- State check
- Deny with helpful message

### Phase 4: Stop Hook ✅
- Loop detection logic
- Transcript reading
- Claude SDK evaluation
- Block vs allow decision

### Phase 5: Hook Registration ✅
- Update `hooks/hooks.json`
- Make scripts executable

### Phase 6: Documentation ✅
- User guide (README.md)
- Progress tracking
- Testing checklist

## Files Created

```
hooks/
├── user-message.ts           89 lines - Activation control
├── permission-request.ts      66 lines - Permission denial
├── stop.ts                   176 lines - Stop evaluation
└── hooks.json                 +21 lines - Hook registration

.cc-track/specs/113-autoflow-mode-hooks/
├── spec.md                   Full requirements specification
├── plan.md                   This file - technical plan
├── progress.md               Implementation progress log
└── README.md                 User guide with examples

.gitignore
└── +1 line                   Ignore .autoflow-state.json
```

**Note:** State management is intentionally inline in each hook. No separate state manager class - the simple JSON read/write functions are sufficient.

## Testing Strategy

### Unit Tests (Implemented)

Comprehensive unit tests covering all hooks with dependency injection for testability:

**user-message.test.ts (21 tests)**
- Activation pattern detection
- Negation pattern handling
- Per-message opt-in/out behavior
- State management and session handling
- Edge cases

**permission-request.test.ts (8 tests)**
- Permission denial when active
- Normal flow when inactive
- Message content verification

**stop.test.ts (26 tests)**
- `getLastMessages()` utility (with SDK format and filtering)
- `buildEvaluationPrompt()` construction
- Throttle limit enforcement
- Window expiration logic
- Evaluation flow
- State updates

### Manual Testing (Desktop Claude Code)

1. **Activation:**
   - Type "autoflow" in message
   - Verify state file created at `.cc-track/.autoflow-state.json`
   - Verify message shown: "🤖 Autoflow mode active for this task."

2. **Permission Denial:**
   - Trigger a permission request (e.g., edit a critical file)
   - Verify permission denied
   - Verify message includes "User is not available"

3. **Stop Evaluation:**
   - Let Claude stop naturally
   - Verify hook reads transcript
   - Verify Claude SDK is called
   - Verify correct decision (continue vs allow stop)

4. **Throttle Detection:**
   - Force 3+ auto-continues within 5-minute window
   - Verify autoflow deactivates
   - Verify warning message shown

5. **Per-Message Deactivation:**
   - Send any message without "autoflow"
   - Verify state file updated (active: false)
   - Verify silent deactivation (no message)

**Log Inspection:**
- Check `~/.local/share/cc-track/logs/` for hook execution logs
- Verify Claude SDK calls are logged
- Check for errors

## Assumptions

1. **User has pre-configured Claude permissions** in `.claude/settings.json` with sensible defaults (allow Read/Edit/Write, ask for destructive commands)

2. **Claude SDK is installed and working** - The stop hook imports `@anthropic-ai/claude-agent-sdk`

3. **Transcript is accessible** - Hook receives `transcript_path` in input

4. **Haiku model is available** - Stop evaluation uses haiku for speed/cost

## Potential Issues & Solutions

**Issue:** Claude SDK evaluation takes too long (>10s timeout)
**Solution:** Increase timeout or fall back to allowing stop

**Issue:** Loop detection too sensitive (legitimate stops)
**Solution:** Increase threshold or time window (currently hardcoded)

**Issue:** Permission denial blocks critical operations
**Solution:** User types "stop autoflow", approves, then re-activates

**Issue:** Transcript not available or malformed
**Solution:** Hook gracefully falls back to allowing stop

**Issue:** State file corruption
**Solution:** Hooks handle parse errors and default to inactive state

## Implemented Beyond MVP

- ✅ Statusline indicator for active autoflow mode (`🤖 Autoflow (N/3)`)

## Future Enhancements (Out of Scope for Now)

- ❌ Configurable thresholds in `track.config.json`
- ❌ Detailed analytics (approval history, stop patterns)
- ❌ Smart learning from user overrides
- ❌ Session persistence across compaction
- ❌ Multiple autoflow profiles (aggressive, conservative)

**Why out of scope?** The MVP is intentionally minimal. These can be added if users find autoflow valuable.

## Success Criteria

✅ **All implemented:**
- [x] User can activate with "autoflow" keyword
- [x] Permissions denied with helpful message when active
- [x] Claude SDK evaluates stops intelligently
- [x] Loop detection prevents infinite cycles
- [x] User can deactivate with "stop autoflow"
- [x] Simple state management (JSON file)
- [x] Comprehensive user documentation

**Ready for desktop testing and refinement.**
