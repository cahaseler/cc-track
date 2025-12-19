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
  "stopCount": number,
  "lastStop": "ISO timestamp"
}
```

That's it. No complex interfaces, no arrays of events, just the essentials:
- Is autoflow active?
- When did it start?
- How many stops happened recently? (for loop detection)
- When was the last stop? (for 30-second window)

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
  return { continue: true }; // Normal stop flow
}

// Check loop detection
const timeSinceLastStop = now() - lastStop();
const newStopCount = timeSinceLastStop < 30 ? state.stopCount + 1 : 1;

if (newStopCount > 2) {
  writeState({ ...state, active: false }); // Deactivate
  process.stderr.write('⚠️  Autoflow loop detected - stopping autonomous mode');
  process.exit(2); // Block stop with error message
}

// Update stop tracking
writeState({ ...state, stopCount: newStopCount, lastStop: now() });

// Use Claude SDK to evaluate
const transcript = readTranscript(input.transcript_path);
const lastMessages = getLastMessages(transcript, 5);

const evaluation = await ClaudeSDK.prompt(`
  Is this assistant genuinely finished with all work, or asking for confirmation to continue?

  Last messages:
  ${lastMessages}

  Respond: DONE: [reason] or CONTINUE: [reason]
`, 'haiku', { timeoutMs: 10000 });

if (evaluation.text.startsWith('CONTINUE')) {
  // Block stop and tell Claude to continue
  process.stderr.write(`🤖 Continue working\n\n${evaluation.text}`);
  process.exit(2); // Block stop
}

// Allow stop - work complete
return { continue: true };
```

**Why Claude SDK?** Because detecting "should I continue?" vs "work is done" requires understanding context. Pattern matching ("should i continue?") is too brittle. Claude SDK gives intelligent evaluation.

**Why block (exit 2)?** Because when Claude stops to ask "should I continue?", we want to tell Claude "no, keep working". The Stop hook can only block stops (prevent them), not inject responses. When we block with exit code 2, stderr becomes feedback shown to Claude.

## Loop Detection Algorithm

**Simple time-window approach:**

```
if (stops > 2 within 30 seconds) {
  deactivate autoflow
  show warning
}
```

Tracks:
- `stopCount`: How many stops in current window
- `lastStop`: When last stop happened
- If `now - lastStop > 30 seconds`: Reset count to 1
- If `stopCount > 2`: Loop detected

**Why this is enough:** If Claude stops 3+ times in 30 seconds, something is wrong. Either:
1. Claude is stuck in a loop (can't make progress)
2. There's a blocker (missing file, unclear requirement)
3. Work is actually done (but evaluation is wrong)

In all cases, stopping autoflow and getting user input is the right move.

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

**Note:** The `skills/cc-track-tools/lib/autoflow-state.ts` file (344 lines) was created during initial development but is **not used**. The simple hooks don't need a complex state manager class. Can be deleted or kept as reference.

## Testing Strategy

**Manual Testing Required (Desktop Claude Code):**

1. **Activation:**
   - Type "autoflow" in message
   - Verify state file created at `.cc-track/.autoflow-state.json`
   - Verify message shown: "🤖 Autoflow mode activated"

2. **Permission Denial:**
   - Trigger a permission request (e.g., edit a critical file)
   - Verify permission denied
   - Verify message includes "User is not available"

3. **Stop Evaluation:**
   - Let Claude stop naturally
   - Verify hook reads transcript
   - Verify Claude SDK is called
   - Verify correct decision (continue vs allow stop)

4. **Loop Detection:**
   - Force >2 stops in <30 seconds (e.g., by creating a blocker)
   - Verify autoflow deactivates
   - Verify warning message shown

5. **Deactivation:**
   - Type "stop autoflow"
   - Verify state file updated (active: false)
   - Verify message shown: "🛑 Autoflow mode deactivated"

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

## Future Enhancements (Out of Scope)

- ❌ Configurable thresholds in `track.config.json`
- ❌ Statusline indicator for active autoflow mode
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
