# Technical Implementation Plan: Autoflow Mode Hooks

**Feature ID**: 113
**Created**: 2025-12-19
**Status**: Draft

## Architecture Overview

Based on Claude Code's hook system capabilities, autoflow mode will be implemented using a **three-hook architecture**:

1. **UserPromptSubmit Hook** - Detects activation/deactivation, auto-injects continuation prompts
2. **PermissionRequest Hook** - Auto-approves safe operations, blocks unsafe ones
3. **Stop Hook** - Monitors completion state, detects infinite loops

**Key Insight from Research:** Hooks cannot make Claude continue without user input. Instead, we use **UserPromptSubmit** to intercept and replace user prompts with automated "continue" commands when in autoflow mode.

## State Management Architecture

### Autoflow State File: `.cc-track/.autoflow-state.json`

```typescript
interface AutoflowState {
  active: boolean;                    // Is autoflow mode currently active?
  activatedAt: string;                // ISO timestamp of activation
  sessionId: string;                  // Claude Code session ID
  stopEvents: StopEvent[];            // History of stop events for loop detection
  autoApprovals: AutoApproval[];      // History of auto-approved operations
  config: AutoflowConfig;             // User-configurable settings
}

interface StopEvent {
  timestamp: string;                  // ISO timestamp
  messagePattern: string;             // Hash of last assistant message
  toolName?: string;                  // Last tool attempted
}

interface AutoApproval {
  timestamp: string;
  toolName: string;
  toolInput: unknown;
  decision: 'approved' | 'blocked';
  reason: string;
}

interface AutoflowConfig {
  loopDetection: {
    maxStopsInWindow: number;         // Default: 3
    windowSeconds: number;            // Default: 30
    maxSamePattern: number;           // Default: 5
  };
  safetyRules: SafetyRules;
  maxDurationMinutes?: number;        // Optional timeout
}
```

### State Management Helper Library

**File**: `skills/cc-track-tools/lib/autoflow-state.ts`

```typescript
export class AutoflowStateManager {
  constructor(private projectRoot: string) {}

  // State operations
  isActive(): boolean
  activate(sessionId: string): void
  deactivate(): void

  // Stop event tracking
  recordStopEvent(event: StopEvent): void
  detectInfiniteLoop(): boolean

  // Auto-approval tracking
  recordApproval(approval: AutoApproval): void
  getApprovalHistory(): AutoApproval[]

  // Config
  getConfig(): AutoflowConfig
  updateConfig(config: Partial<AutoflowConfig>): void
}
```

## Hook Implementation Details

### 1. UserPromptSubmit Hook

**File**: `hooks/user-prompt-submit.ts`

**Purpose**:
- Detect "autoflow" keyword to activate mode
- Auto-inject continuation prompts when in autoflow mode
- Detect deactivation commands

**Implementation**:

```typescript
export async function userPromptSubmitHook(
  input: HookInput,
  deps: UserPromptSubmitDeps = {}
): Promise<HookOutput> {
  const userPrompt = input.user_message || '';
  const stateManager = new AutoflowStateManager(input.cwd);

  // Activation detection
  if (userPrompt.toLowerCase().includes('autoflow')) {
    stateManager.activate(input.session_id);
    return {
      continue: true,
      systemMessage: '🤖 Autoflow mode activated. I will work autonomously until complete.',
    };
  }

  // Deactivation detection
  if (userPrompt.toLowerCase().includes('stop autoflow') ||
      userPrompt.toLowerCase().includes('exit autoflow')) {
    stateManager.deactivate();
    return {
      continue: true,
      systemMessage: '🛑 Autoflow mode deactivated.',
    };
  }

  // Auto-continuation logic
  if (stateManager.isActive()) {
    // Check for infinite loop
    if (stateManager.detectInfiniteLoop()) {
      stateManager.deactivate();
      return {
        continue: true,
        systemMessage: '⚠️ Infinite loop detected. Autoflow mode deactivated.\n' +
                      'See .cc-track/logs/autoflow.log for diagnostics.',
      };
    }

    // If user submits empty or minimal prompt, inject continuation
    if (isMinimalPrompt(userPrompt)) {
      const continuationPrompt = await generateContinuationPrompt(input.cwd);
      return {
        continue: true,
        modifiedPrompt: continuationPrompt,
        systemMessage: '🤖 Autoflow: continuing work...',
      };
    }
  }

  return { continue: true };
}

function isMinimalPrompt(prompt: string): boolean {
  const normalized = prompt.toLowerCase().trim();
  const minimalPatterns = [
    '',                    // Empty
    'continue',
    'yes',
    'proceed',
    'go ahead',
    'ok',
    'k',
  ];
  return minimalPatterns.includes(normalized) || normalized.length < 3;
}

async function generateContinuationPrompt(cwd: string): Promise<string> {
  // Check if there's an active spec with tasks
  const activeSpec = getActiveSpecDirectory(cwd);
  if (activeSpec) {
    const tasksPath = join(activeSpec, 'tasks.md');
    if (existsSync(tasksPath)) {
      return 'Continue working through the task list in tasks.md. ' +
             'Mark tasks as completed as you finish them. ' +
             'If all tasks are complete, run /prepare-completion.';
    }
  }

  return 'Continue working according to the plan. ' +
         'If you think all work is complete, run validation (lint, typecheck, tests).';
}
```

**Hook Output Options**:
- `continue: true` - Allow the prompt
- `modifiedPrompt: string` - Replace user's prompt with generated one
- `systemMessage: string` - Show status to user (visible in UI)

**Registration** (`hooks/hooks.json`):
```json
{
  "UserPromptSubmit": [
    {
      "name": "autoflow-mode-control",
      "script": "bun run ${CLAUDE_PLUGIN_ROOT}/hooks/user-prompt-submit.ts",
      "description": "Manages autoflow mode activation and auto-continuation"
    }
  ]
}
```

### 2. PermissionRequest Hook

**File**: `hooks/permission-request.ts`

**Purpose**: Auto-approve safe operations, block unsafe ones

**Implementation**:

```typescript
export async function permissionRequestHook(
  input: HookInput,
  deps: PermissionRequestDeps = {}
): Promise<HookOutput> {
  const stateManager = new AutoflowStateManager(input.cwd);

  // Only auto-approve if in autoflow mode
  if (!stateManager.isActive()) {
    return { continue: true }; // Let normal permission flow happen
  }

  const safetyRules = stateManager.getConfig().safetyRules;
  const decision = evaluateSafety(input.tool_name, input.tool_input, safetyRules);

  // Record decision
  stateManager.recordApproval({
    timestamp: new Date().toISOString(),
    toolName: input.tool_name,
    toolInput: input.tool_input,
    decision: decision.safe ? 'approved' : 'blocked',
    reason: decision.reason,
  });

  if (decision.safe) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        permissionDecision: 'allow',
        permissionDecisionReason: `🤖 Autoflow: ${decision.reason}`,
      },
    };
  } else {
    // Pause autoflow for unsafe operation
    stateManager.deactivate();
    return {
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `🛑 Autoflow paused: ${decision.reason}\n\n` +
          `This operation requires manual approval. ` +
          `Approve manually or restart autoflow after reviewing.`,
      },
    };
  }
}

interface SafetyDecision {
  safe: boolean;
  reason: string;
}

function evaluateSafety(
  toolName: string,
  toolInput: unknown,
  rules: SafetyRules
): SafetyDecision {
  // Always safe tools
  if (['Read', 'Grep', 'Glob'].includes(toolName)) {
    return { safe: true, reason: 'Read-only operation' };
  }

  // File operations - check path
  if (['Edit', 'Write'].includes(toolName)) {
    const filePath = (toolInput as { file_path: string }).file_path;

    // Block system directories
    if (isSystemPath(filePath)) {
      return { safe: false, reason: 'System directory modification not allowed' };
    }

    // Block critical config files (unless configured otherwise)
    if (isCriticalFile(filePath) && !rules.allowCriticalFileEdits) {
      return { safe: false, reason: 'Critical configuration file - manual approval required' };
    }

    return { safe: true, reason: 'Project file edit' };
  }

  // Bash commands - analyze command
  if (toolName === 'Bash') {
    const command = (toolInput as { command: string }).command;
    return analyzeBashCommand(command, rules);
  }

  // Default: ask for permission
  return { safe: false, reason: 'Operation requires manual approval' };
}

function analyzeBashCommand(command: string, rules: SafetyRules): SafetyDecision {
  const cmd = command.trim().toLowerCase();

  // Safe git commands
  const safeGitCommands = ['git add', 'git commit', 'git status', 'git diff', 'git log'];
  if (safeGitCommands.some(safe => cmd.startsWith(safe))) {
    return { safe: true, reason: 'Safe git operation' };
  }

  // Safe package manager commands
  const safePkgCommands = ['npm test', 'npm run test', 'bun test', 'npm run lint', 'bun run lint'];
  if (safePkgCommands.some(safe => cmd.startsWith(safe))) {
    return { safe: true, reason: 'Test/lint command' };
  }

  // Unsafe commands
  const unsafePatterns = [
    /\brm\s+-rf/,                    // rm -rf
    /\brm\s+[^-]/,                   // rm without -rf is still risky
    /\bgit\s+push\s+.*--force/,      // Force push
    /\bsudo\b/,                      // Sudo
    /\bchmod\b/,                     // Permission changes
    /\bcurl.*\|\s*bash/,             // Piping to bash
    /\bwget.*\|\s*bash/,
    /\bdd\b/,                        // Disk operations
  ];

  for (const pattern of unsafePatterns) {
    if (pattern.test(cmd)) {
      return {
        safe: false,
        reason: `Unsafe command detected: ${pattern.source}`
      };
    }
  }

  // Default: ask
  return {
    safe: false,
    reason: 'Bash command requires manual review'
  };
}

function isSystemPath(path: string): boolean {
  const systemPaths = ['/etc', '/usr', '/bin', '/sbin', '/var', '/sys', '/proc'];
  return systemPaths.some(sys => path.startsWith(sys));
}

function isCriticalFile(path: string): boolean {
  const criticalFiles = [
    'package.json',
    'tsconfig.json',
    'biome.json',
    '.gitignore',
    'bun.lockb',
    'package-lock.json',
  ];
  return criticalFiles.some(file => path.endsWith(file));
}
```

**Registration** (`hooks/hooks.json`):
```json
{
  "PermissionRequest": [
    {
      "name": "autoflow-permission-handler",
      "script": "bun run ${CLAUDE_PLUGIN_ROOT}/hooks/permission-request.ts",
      "description": "Auto-approves safe operations in autoflow mode"
    }
  ]
}
```

### 3. Stop Hook Enhancement

**File**: `hooks/stop.ts`

**Purpose**: Monitor stop events for infinite loop detection

**Implementation**:

```typescript
export async function stopHook(
  input: HookInput,
  deps: StopHookDeps = {}
): Promise<HookOutput> {
  const stateManager = new AutoflowStateManager(input.cwd);

  // Only track if autoflow is active
  if (!stateManager.isActive()) {
    return { continue: true };
  }

  // Read transcript to get last assistant message
  const transcript = await readTranscript(input.transcript_path);
  const lastMessage = getLastAssistantMessage(transcript);

  // Record stop event
  stateManager.recordStopEvent({
    timestamp: new Date().toISOString(),
    messagePattern: hashMessage(lastMessage),
    toolName: input.tool_name,
  });

  // Check for infinite loop
  if (stateManager.detectInfiniteLoop()) {
    const log = createLogger('autoflow');
    log.warn('Infinite loop detected', {
      stopEvents: stateManager.getState().stopEvents.slice(-5),
    });

    // The actual deactivation will happen in UserPromptSubmit hook
    // This just logs the detection
  }

  return { continue: true };
}

async function readTranscript(path: string): Promise<TranscriptMessage[]> {
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content);
}

function getLastAssistantMessage(transcript: TranscriptMessage[]): string {
  for (let i = transcript.length - 1; i >= 0; i--) {
    if (transcript[i].role === 'assistant') {
      return transcript[i].content;
    }
  }
  return '';
}

function hashMessage(message: string): string {
  // Simple hash to detect repeated patterns
  return message.slice(0, 100).toLowerCase().replace(/\s+/g, ' ');
}
```

**Registration** (`hooks/hooks.json`):
```json
{
  "Stop": [
    {
      "name": "autoflow-stop-monitor",
      "script": "bun run ${CLAUDE_PLUGIN_ROOT}/hooks/stop.ts",
      "description": "Monitors stop events for infinite loop detection in autoflow mode"
    }
  ]
}
```

## Safety Rules System

### Default Safety Configuration

**File**: `skills/cc-track-tools/lib/autoflow-safety.ts`

```typescript
export interface SafetyRules {
  allowCriticalFileEdits: boolean;      // Default: false
  allowSystemPaths: boolean;            // Default: false
  allowNetworkRequests: boolean;        // Default: false
  allowDestructiveCommands: boolean;    // Default: false
  customSafeCommands: string[];         // User-defined safe commands
  customUnsafePatterns: RegExp[];       // User-defined unsafe patterns
}

export const DEFAULT_SAFETY_RULES: SafetyRules = {
  allowCriticalFileEdits: false,
  allowSystemPaths: false,
  allowNetworkRequests: false,
  allowDestructiveCommands: false,
  customSafeCommands: [],
  customUnsafePatterns: [],
};
```

### Configuration in `track.config.json`

Users can customize safety rules:

```json
{
  "features": {
    "autoflow": {
      "enabled": true,
      "loopDetection": {
        "maxStopsInWindow": 3,
        "windowSeconds": 30,
        "maxSamePattern": 5
      },
      "safetyRules": {
        "allowCriticalFileEdits": false,
        "customSafeCommands": ["npm run build", "bun run build"]
      }
    }
  }
}
```

## Infinite Loop Detection Algorithm

**File**: `skills/cc-track-tools/lib/autoflow-state.ts`

```typescript
export class AutoflowStateManager {
  detectInfiniteLoop(): boolean {
    const state = this.getState();
    const config = state.config.loopDetection;
    const events = state.stopEvents;

    if (events.length < config.maxStopsInWindow) {
      return false;
    }

    // Check 1: Too many stops in time window
    const windowStart = Date.now() - (config.windowSeconds * 1000);
    const recentStops = events.filter(e =>
      new Date(e.timestamp).getTime() > windowStart
    );

    if (recentStops.length >= config.maxStopsInWindow) {
      this.logger.warn('Loop detected: too many stops in time window', {
        stops: recentStops.length,
        window: config.windowSeconds,
      });
      return true;
    }

    // Check 2: Repeated message patterns
    const lastN = events.slice(-config.maxSamePattern);
    const patterns = lastN.map(e => e.messagePattern);
    const uniquePatterns = new Set(patterns);

    if (uniquePatterns.size === 1 && lastN.length >= config.maxSamePattern) {
      this.logger.warn('Loop detected: repeated message pattern', {
        pattern: patterns[0],
        count: lastN.length,
      });
      return true;
    }

    return false;
  }
}
```

## Statusline Integration

Update `scripts/statusline.ts` to show autoflow status:

```typescript
function getAutoflowStatus(cwd: string): string {
  const stateManager = new AutoflowStateManager(cwd);
  if (stateManager.isActive()) {
    const duration = getAutoflowDuration(stateManager.getState().activatedAt);
    return `🤖 Autoflow (${duration})`;
  }
  return '';
}

// Example output: "🤖 Autoflow (2m 34s)"
```

## Testing Strategy

### Unit Tests

1. **AutoflowStateManager Tests** (`lib/autoflow-state.test.ts`)
   - State persistence and loading
   - Activation/deactivation
   - Loop detection algorithm
   - Config management

2. **Safety Rules Tests** (`lib/autoflow-safety.test.ts`)
   - Command classification (safe vs unsafe)
   - Path validation
   - Custom rule handling

3. **Hook Tests**
   - `hooks/user-prompt-submit.test.ts` - Activation, continuation, deactivation
   - `hooks/permission-request.test.ts` - Auto-approval logic
   - `hooks/stop.test.ts` - Stop event recording

### Integration Tests

1. **End-to-End Autoflow Flow**
   - Activate autoflow → make edits → auto-approve → auto-continue → complete
   - Activate autoflow → unsafe operation → pause → manual approval

2. **Loop Detection**
   - Trigger rapid stops → verify deactivation
   - Trigger repeated message pattern → verify deactivation

3. **Safety Boundary Tests**
   - Attempt unsafe commands → verify blocking
   - Attempt safe commands → verify approval

## Implementation Phases

### Phase 1: State Management (2-3 hours)
- [ ] Implement AutoflowStateManager
- [ ] Create `.autoflow-state.json` schema
- [ ] Add state file to `.gitignore`
- [ ] Write unit tests
- [ ] Update `track.config.json` schema

### Phase 2: Safety System (3-4 hours)
- [ ] Implement safety rules evaluation
- [ ] Create DEFAULT_SAFETY_RULES
- [ ] Implement bash command analysis
- [ ] Write comprehensive safety tests
- [ ] Document safety rules in user docs

### Phase 3: Hook Implementation (4-5 hours)
- [ ] Implement UserPromptSubmit hook
- [ ] Implement PermissionRequest hook
- [ ] Implement Stop hook enhancement
- [ ] Register hooks in `hooks/hooks.json`
- [ ] Write hook unit tests

### Phase 4: Loop Detection (2-3 hours)
- [ ] Implement loop detection algorithm
- [ ] Add configurable thresholds
- [ ] Test with various loop scenarios
- [ ] Add diagnostic logging

### Phase 5: Statusline Integration (1-2 hours)
- [ ] Add autoflow status to statusline
- [ ] Show duration and activity indicator
- [ ] Update statusline tests

### Phase 6: Documentation & Polish (2-3 hours)
- [ ] User guide for activating autoflow
- [ ] Safety rules documentation
- [ ] Troubleshooting guide
- [ ] Configuration examples

**Total Estimated Effort**: 14-20 hours

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| UserPromptSubmit hook doesn't support modifiedPrompt | Test early, fall back to SessionStart injection approach |
| Loop detection too aggressive | Make thresholds configurable, err on side of caution |
| Safety rules miss edge cases | Start conservative, add safe patterns incrementally |
| User can't interrupt stuck autoflow | Provide multiple escape hatches (command, timeout, signal) |
| State file corruption | Graceful fallback to defaults, backup on write |

## Open Questions & Decisions Needed

1. **Should autoflow state persist across sessions?**
   - Recommendation: No - require explicit activation per session for safety

2. **Default timeout for autoflow mode?**
   - Recommendation: No timeout by default, but allow users to configure one

3. **Should we support "autoflow until validation passes" mode?**
   - Recommendation: Yes - add as a variant that auto-retries fixes

4. **Integration with existing hooks (edit-validation, pre-tool-validation)?**
   - Recommendation: Autoflow runs AFTER existing hooks, respects their decisions

## Dependencies

- Existing hook system (PreToolUse, PostToolUse, Stop, UserPromptSubmit, PermissionRequest)
- State management (`spec-helpers.ts`)
- Logger (`logger.ts`)
- Claude SDK (for transcript parsing, optional)
- Config system (`config.ts`)

## Success Criteria

- [ ] User can activate autoflow with "autoflow" in message
- [ ] Safe operations auto-approved without user interaction
- [ ] Unsafe operations pause work and wait
- [ ] Infinite loop detection prevents token waste
- [ ] User can deactivate at any time
- [ ] All decisions logged for audit
- [ ] Statusline shows autoflow status
- [ ] 90%+ test coverage for autoflow components
