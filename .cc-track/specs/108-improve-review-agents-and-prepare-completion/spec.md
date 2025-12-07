# Feature Specification: Improve Review Agents and Prepare-Completion

**Feature ID**: `108`
**Branch**: `108-improve-review-agents-and-prepare-completion`
**Created**: 2025-12-06
**Status**: Draft

## Quick Guidelines
- Focus on WHAT users need and WHY
- Avoid HOW to implement (no tech stack, APIs, code structure)
- Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
As a developer using cc-track, I want the code review agents to have properly restricted permissions and understand my development context (that validation has passed, changes may be unstaged, and what scope was approved) so that I get relevant, actionable feedback without false positives or unnecessary permission escalation prompts.

### Acceptance Scenarios
1. **Given** a developer runs `/cc-track:prepare-completion`, **When** review agents are spawned, **Then** each agent understands that TypeScript/lint/tests have already passed
2. **Given** review agents are running, **When** they encounter unstaged or uncommitted changes, **Then** they treat this as expected development state (not an issue)
3. **Given** the guidelines-reviewer agent runs, **When** it finds changes to files, **Then** it checks spec.md/plan.md first to determine if those changes are within approved scope
4. **Given** a review agent attempts to write files (e.g., to /tmp), **When** the action is attempted, **Then** it is blocked without prompting the user for permission
5. **Given** a review agent needs to list directory contents, **When** it uses the LS tool, **Then** the action succeeds without permission prompts
6. **Given** a review agent needs to run git diff, **When** it uses the allowed git commands, **Then** the action succeeds without permission prompts

### Edge Cases
- What happens when spec folder doesn't exist? Agent reports it cannot validate scope
- What happens when agent attempts a disallowed tool? Action fails silently (no escalation to user)
- What happens when agent needs detailed directory listing (`ls -la`)? Must use native LS tool, not Bash

---

## Requirements

### Functional Requirements

#### Root Cause Fix - Permission Field
- **FR-001**: All review agents MUST use the correct permission field name so restrictions are actually applied (currently restrictions are ignored due to wrong field name)

#### Agent Permission Restrictions
- **FR-002**: Review agents MUST NOT be able to write files (prevents /tmp pollution and unintended modifications)
- **FR-003**: Review agents MUST NOT be able to edit files
- **FR-004**: Review agents MUST NOT be able to run arbitrary bash commands
- **FR-005**: Review agents MUST be able to run specific git commands: diff, log, status, show
- **FR-006**: Review agents MUST be able to run knip for dead code detection
- **FR-007**: Review agents MUST have access to: Read, Grep, Glob, LS
- **FR-008**: When agents attempt disallowed actions, they MUST fail silently (no permission escalation prompts to user)

#### Agent Context Awareness
- **FR-009**: All review agents MUST receive context that type checking, linting, and tests have passed before review
- **FR-010**: All review agents MUST understand they are running in a development working directory where unstaged/uncommitted changes are expected
- **FR-011**: All review agents MUST compare changes against the main branch (via git diff), not just working directory state
- **FR-012**: The guidelines-reviewer agent MUST read spec.md, plan.md, and tasks.md to understand approved scope before flagging "unauthorized changes"
- **FR-013**: The dead-code-detector agent MUST read spec context to understand what may be intentionally deprecated

#### Prepare-Completion Command Updates
- **FR-014**: The prepare-completion command MUST instruct Claude to pass the spec folder path to each review agent
- **FR-015**: The prepare-completion command MUST instruct Claude to tell agents that validation (TypeScript, linting, tests) has already passed

### Non-Functional Requirements
- **NFR-001**: Permission restrictions should follow the pattern used by Anthropic's feature-dev plugin
- **NFR-002**: Changes should not significantly increase review time
- **NFR-003**: Agent prompts should remain concise (context section, not verbose)

---

## Success Criteria
- [ ] No permission escalation prompts during code review (no "agent wants to use X" dialogs)
- [ ] No /tmp files created during review process
- [ ] Guidelines-reviewer stops flagging in-scope changes as "unauthorized"
- [ ] All 8 review agents have consistent development context in their prompts
- [ ] Prepare-completion command passes spec folder path to agents
- [ ] Agents can still run git diff/log/status/show and knip without issues

---

## Scope & Boundaries

### In Scope
- Fixing the permission field name in all agent definitions (root cause of permission issues)
- Updating tool restrictions to remove Write/Edit while keeping git commands and knip
- Adding development context section to all review agent prompts
- Updating guidelines-reviewer to read spec/plan/tasks for scope context
- Updating dead-code-detector to read spec context
- Updating prepare-completion.md command to pass context to agents

### Out of Scope
- Anthropic reviewer pattern with scoring agent (future task)
- Changes to the validation script (prepare-completion.ts)
- Adding new review agents
- Restructuring the overall review workflow
- Changes to other commands

---

## Clarifications

### Session 2025-12-06
- Q: Why are agents escalating permissions for /tmp writes? → A: **Root cause identified**: Agents use `allowed-tools` field but should use `tools` field. Wrong field name means restrictions are ignored and agents inherit all parent permissions.
- Q: What's the difference between `tools` and `allowed-tools`? → A: `tools` is for agents (subagents), `allowed-tools` is for commands/skills. Using wrong field = restrictions ignored.
- Q: Should we remove all Bash access? → A: No, keep specific git commands (diff, log, status, show) and knip. Remove general Bash and Write/Edit.
- Q: How should agents get spec context? → A: Prepare-completion command tells Claude to pass spec folder path. Agent prompts tell them to read spec/plan/tasks from that folder.
- Q: What about LS vs Bash(ls)? → A: LS is a native Claude Code tool. Agents should use LS. Bash(ls:*) is different and not needed.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All sections completed or marked N/A

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified
- [x] Edge cases documented

---

## Dependencies & Assumptions
- Assumes changing from `allowed-tools` to `tools` will enable permission restrictions
- Assumes the `tools` whitelist provides silent failure behavior (based on Anthropic plugin patterns)
- Depends on existing 8 agent definition files in agents/ directory
- Depends on existing prepare-completion.md command

---

## Open Questions
None - root cause identified during specification.
