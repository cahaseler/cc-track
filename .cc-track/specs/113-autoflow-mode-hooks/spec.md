# Feature Specification: Autoflow Mode Hooks

**Feature ID**: `113`
**Created**: 2025-12-19
**Status**: Draft

## Overview

Implement an **autoflow mode** system for cc-track that enables Claude Code to work autonomously with minimal user intervention. When activated, autoflow mode:

1. **Auto-approves safe operations** - Intercepts permission requests and makes safe decisions automatically
2. **Auto-continues work** - Detects when Claude is asking "should I continue?" and responds affirmatively if work remains
3. **Smart completion detection** - Recognizes when all work is truly complete and triggers quality checks (lint, typecheck, tests)
4. **Escape hatch** - Provides safety mechanisms to prevent infinite loops or stuck states

This feature is designed for scenarios where the user wants Claude to "run to completion" on a well-defined task without constant interaction.

## User Stories

### Story 1: Unattended Task Completion
**As a** developer
**I want** Claude to complete a task from start to finish while I'm away
**So that** I can come back to completed work instead of a conversation waiting for "yes, continue"

**Acceptance Criteria:**
- User can activate autoflow mode with a simple trigger phrase
- Claude works through the entire task plan without stopping for permission
- Safe operations are auto-approved
- Unsafe operations pause work and wait for user
- User receives clear explanation of why work stopped (if it did)

### Story 2: Safe vs Unsafe Decision Making
**As a** developer
**I want** autoflow mode to make safe decisions automatically but pause for risky ones
**So that** I maintain control over destructive operations while reducing friction

**Acceptance Criteria:**
- File edits within the project are auto-approved
- Git operations (commit, push) are auto-approved
- Destructive operations (rm, force push) require user approval
- External API calls require user approval
- Clear logging of all automated decisions

### Story 3: Work Completion Detection
**As a** developer
**I want** Claude to recognize when all planned work is complete
**So that** I get properly validated, tested code instead of "I think I'm done, continue?"

**Acceptance Criteria:**
- Detects when task breakdown is fully implemented
- Automatically runs validation suite (lint, typecheck, tests)
- Only declares completion after validation passes
- Provides summary of what was accomplished

### Story 4: Infinite Loop Prevention
**As a** developer
**I want** autoflow mode to detect when Claude is stuck
**So that** I don't waste tokens on repeated failed attempts

**Acceptance Criteria:**
- Detects when Claude stops/continues more than 2 times in 30 seconds
- Automatically exits autoflow mode when loop detected
- Provides diagnostic info about why it got stuck
- User can manually trigger escape hatch

## Requirements

### Functional Requirements

#### FR1: Autoflow Mode Activation
- **FR1.1**: Detect "autoflow" keyword in user messages
- **FR1.2**: Set autoflow state in `.cc-track/.autoflow-state.json`
- **FR1.3**: Notify user that autoflow mode is active
- **FR1.4**: Provide deactivation command/trigger

#### FR2: Permission Auto-Approval
- **FR2.1**: Intercept PreToolUse permission requests
- **FR2.2**: Apply safety rules to determine if operation is safe
- **FR2.3**: Auto-approve safe operations with logging
- **FR2.4**: Block unsafe operations and pause work with explanation
- **FR2.5**: Track auto-approval history for diagnostics

**Safety Rules (Safe Operations):**
- Read, Grep, Glob (always safe)
- Edit, Write within project directory
- Bash commands: git add, git commit, git push, npm/bun commands
- Test execution commands

**Unsafe Operations (Require User Approval):**
- Bash commands: rm, force push, dd, chmod, sudo
- Write to system directories
- Network requests (curl, wget)
- Edit to critical files (package.json, tsconfig.json) - configurable

#### FR3: Auto-Continue on Stop Events
- **FR3.1**: Detect Stop events during autoflow mode
- **FR3.2**: Read recent assistant messages to determine intent
- **FR3.3**: Auto-respond "continue working" if work remains
- **FR3.4**: Auto-respond "run validation" if work appears complete
- **FR3.5**: Track stop event frequency and timing

**Detection Patterns:**
- "Should I continue?" → Yes, continue
- "Ready to proceed?" → Yes, proceed
- "All tasks complete" → Run validation suite
- "Validation passed" → Exit autoflow, notify user

#### FR4: Infinite Loop Prevention
- **FR4.1**: Track stop events with timestamps
- **FR4.2**: Detect >2 stops within 30 seconds (configurable)
- **FR4.3**: Detect >5 stops with same message pattern
- **FR4.4**: Exit autoflow mode when loop detected
- **FR4.5**: Provide diagnostic report of loop behavior

#### FR5: Work Completion Detection
- **FR5.1**: Parse active spec's tasks.md to track progress
- **FR5.2**: Detect when all tasks marked complete
- **FR5.3**: Trigger `/prepare-completion` command
- **FR5.4**: If validation fails, continue fixing
- **FR5.5**: If validation passes, exit autoflow and notify

### Non-Functional Requirements

#### NFR1: Performance
- Autoflow state checks must complete in <100ms
- Permission decisions must not add >200ms latency to tool execution
- Stop hook processing must complete in <5 seconds

#### NFR2: Reliability
- Autoflow state persists across Claude Code restarts
- Failures in autoflow hooks must not break normal operation
- All decisions must be logged for audit trail

#### NFR3: Safety
- Default to asking permission when uncertain
- Never auto-approve operations that could cause data loss
- Provide immediate escape hatch (user can type "stop autoflow")

#### NFR4: Observability
- Log every auto-approval decision with reasoning
- Log every auto-continue decision
- Provide real-time status in statusline
- Generate summary report when autoflow session ends

## Constraints

### Technical Constraints
- Must work within Claude Code's existing hook system
- Cannot modify Claude Code core behavior
- Must use existing file-based state management
- Must maintain backward compatibility with existing hooks

### Safety Constraints
- MUST pause for any operation that could:
  - Delete files or data
  - Modify system configuration
  - Make external network requests
  - Change permissions or ownership
  - Force-push to git remotes
- MUST provide escape hatch that stops immediately

### User Experience Constraints
- Activation must be simple (single phrase trigger)
- Status must be visible in statusline
- User must be able to interrupt at any time
- Logs must be human-readable for debugging

## Success Criteria

### Minimum Viable Product (MVP)
- [ ] User can activate autoflow mode with "autoflow" in message
- [ ] Safe file operations are auto-approved
- [ ] Unsafe operations pause and wait for user
- [ ] Claude auto-continues on "should I continue?" stops
- [ ] Infinite loop detection (>3 stops in 30 seconds)
- [ ] User can deactivate with "stop autoflow"
- [ ] All decisions logged to `.cc-track/logs/autoflow.log`

### Complete Success
- [ ] All MVP criteria met
- [ ] Statusline shows autoflow status (🤖 active, 🔍 waiting for user)
- [ ] Work completion detection from tasks.md
- [ ] Auto-triggers validation when work complete
- [ ] Generates summary report at end of session
- [ ] Configurable safety rules in track.config.json
- [ ] User documentation with examples

### Exceptional Success
- [ ] All Complete Success criteria met
- [ ] Learns from user overrides (if user approves blocked operation, remember)
- [ ] Integration with GitHub workflow (auto-creates PRs)
- [ ] Time-based escape hatch (max N minutes in autoflow)
- [ ] Token budget awareness (pause if approaching limits)

## Out of Scope

The following are explicitly NOT part of this feature:

- **Multi-session autoflow** - Sessions are independent, no cross-session state
- **Autoflow by default** - Users must explicitly activate
- **Complex AI decision making** - Simple rule-based safety checks only
- **Integration with external services** - Beyond basic git/GitHub
- **Autoflow recording/replay** - No macro/recording system
- **Multi-agent coordination** - Single Claude instance only

## Open Questions

1. **Should autoflow state persist across compaction?**
   - Pro: User doesn't have to re-activate after compaction
   - Con: User might forget it's active after long session
   - Recommendation: TBD based on user feedback

2. **What's the right threshold for infinite loop detection?**
   - Current proposal: >2 stops in 30 seconds
   - Alternative: >5 stops regardless of timing
   - Recommendation: Make configurable, default to 3 stops / 30 seconds

3. **How to handle validation failures during auto-completion?**
   - Option A: Exit autoflow and wait for user
   - Option B: Auto-fix if errors are clear, exit if ambiguous
   - Recommendation: Start with Option A (safer), iterate to Option B

4. **Should critical file edits be auto-approved or require confirmation?**
   - Files like package.json, tsconfig.json can break builds
   - Option A: Always require confirmation
   - Option B: Auto-approve if tests would catch issues
   - Recommendation: Configurable per project, default to requiring confirmation

## Dependencies

- Existing PreToolUse hook system
- Existing Stop hook support (verify this exists)
- UserMessage hook support (verify this exists)
- Claude Agent SDK for auto-response generation
- File-based state management (`spec-helpers.ts`)
- Logging system (`logger.ts`)

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Infinite loop drains tokens | High | Medium | Strict loop detection, token budget awareness |
| Auto-approval causes data loss | Critical | Low | Conservative safety rules, audit logging |
| UserMessage hook doesn't exist in Claude Code | High | Medium | Research hook types, fallback to manual activation |
| Stop hook can't inject responses | High | Medium | Use Claude SDK to continue conversation programmatically |
| User can't interrupt stuck autoflow | High | Low | Multiple escape hatches (message, timeout, signal) |
| Autoflow conflicts with other hooks | Medium | Medium | Coordinate with pre-tool-validation, edit-validation |

## Notes

- This feature takes inspiration from GitHub Copilot's "auto-apply" mode and autonomous agent frameworks
- The key innovation is **selective autonomy** - autonomous for safe operations, manual for risky ones
- Success depends on accurate "safe vs unsafe" classification
- Consider adding telemetry to learn which operations users approve/reject
