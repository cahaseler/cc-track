# Progress Log: Autoflow Mode Hooks

## 2025-12-19

### Implementation Complete (Simplified Approach)

After initial research suggested a complex three-hook architecture with safety rules, the user clarified the actual requirements were much simpler:

**What was built:**

1. **Simple state management** (`.cc-track/.autoflow-state.json`):
   ```json
   {
     "active": boolean,
     "sessionId": string,
     "activatedAt": ISO timestamp,
     "stopCount": number,
     "lastStop": ISO timestamp
   }
   ```

2. **UserPromptSubmit Hook** (`hooks/user-message.ts`):
   - Detects "autoflow" in user message → activates mode
   - Detects "stop autoflow" → deactivates mode
   - Simple file read/write for state

3. **PermissionRequest Hook** (`hooks/permission-request.ts`):
   - If autoflow active → DENY permission
   - Message: "User is not available. Find a safe alternative approach."
   - No complex safety rules - user pre-configures Claude's permissions

4. **Stop Hook** (`hooks/stop.ts`):
   - If autoflow active → read transcript
   - Use Claude SDK (haiku) to evaluate: "Is Claude done or asking to continue?"
   - If asking to continue → BLOCK (exit 2) with "Continue working"
   - Loop detection: >2 stops in 30 seconds → deactivate autoflow
   - If really done → allow stop

**Key simplifications from original plan:**

- ❌ No complex AutoflowStateManager class
- ❌ No safety rules evaluation system
- ❌ No auto-approval logic
- ✅ Simple bun scripts reading/writing JSON file
- ✅ Claude SDK for intelligent stop evaluation
- ✅ DENY permissions (don't approve them)
- ✅ BLOCK stops with continuation message

**Files created:**
- `hooks/user-message.ts` - Activation/deactivation control
- `hooks/permission-request.ts` - Permission denial with helpful message
- `hooks/stop.ts` - Stop evaluation using Claude SDK
- `hooks/hooks.json` - Registered all three hooks
- `skills/cc-track-tools/lib/autoflow-state.ts` - Complex state manager (not used, kept for reference)

**Added to gitignore:**
- `.cc-track/.autoflow-state.json`

### Testing Status

- [ ] Test activation via "autoflow" message
- [ ] Test permission denial when active
- [ ] Test stop evaluation and continuation
- [ ] Test loop detection (>2 stops in 30 seconds)
- [ ] Test deactivation via "stop autoflow"

### Next Steps

1. Test hooks in desktop Claude Code environment
2. Refine Claude SDK evaluation prompt based on real usage
3. Add configuration options to track.config.json (optional)
4. Update user documentation
5. Consider adding statusline indicator for active autoflow mode
