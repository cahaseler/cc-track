# Technical Plan: Improve Review Agents and Prepare-Completion

**Spec**: 108-improve-review-agents-and-prepare-completion
**Created**: 2025-12-06
**Status**: Draft

---

## Summary

Fix review agent permission restrictions (which are currently ignored due to wrong field name) and add development context to agent prompts. The root cause is that agents use `allowed-tools` (for commands/skills) instead of `tools` (for agents), causing all permission restrictions to be ignored.

---

## Technical Context

| Aspect | Value |
|--------|-------|
| Language | Markdown (agent definitions) |
| Files to Modify | 8 agent files + 1 command file |
| New Dependencies | None |
| Testing | Manual verification via agent invocation |
| Risk Level | Low - configuration changes only |

---

## Constitution Check

| Guardrail | Status | Notes |
|-----------|--------|-------|
| Max Runtime Dependencies (5) | ✅ Pass | No new dependencies |
| Max File Size (500 lines) | ✅ Pass | Agent files ~200 lines |
| Plugin-Native Architecture | ✅ Pass | Editing existing plugin files |
| Complexity Limits | ✅ Pass | Simple field name + prompt updates |

**No violations. No justifications required.**

---

## Design

### Change 1: Fix Permission Field Name

**Current (broken)**:
```yaml
---
name: bug-scanner
model: sonnet
allowed-tools:
  - Read
  - Grep
  - Glob
  - LS
  - Bash(git diff:*)
---
```

**Fixed**:
```yaml
---
name: bug-scanner
model: sonnet
tools: Read, Grep, Glob, LS, Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git show:*), Bash(bunx knip:*)
---
```

**Key changes**:
- `allowed-tools:` (YAML list) → `tools:` (inline comma-separated)
- Follows Anthropic's feature-dev plugin pattern
- Keeps git commands and knip, blocks Write/Edit/general Bash

### Change 2: Standard Tool Whitelist

All 8 review agents will use identical tool restrictions:

```
tools: Read, Grep, Glob, LS, Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git show:*), Bash(bunx knip:*)
```

**Allowed**:
- `Read` - Read files for review
- `Grep` - Search file contents
- `Glob` - Find files by pattern
- `LS` - List directories (native tool, not bash)
- `Bash(git diff:*)` - View changes
- `Bash(git log:*)` - View commit history
- `Bash(git status:*)` - Check repo state
- `Bash(git show:*)` - View specific commits
- `Bash(bunx knip:*)` - Dead code detection

**Blocked (by omission)**:
- `Write` - No file creation
- `Edit` - No file modification
- `Bash` (general) - No arbitrary commands
- `Task` - No spawning sub-agents
- `WebFetch`, `WebSearch` - Not needed for code review

### Change 3: Development Context Section

Add to ALL 8 review agent prompts (after the frontmatter, before existing content):

```markdown
## Development Context

**Important**: You are reviewing code in an active development environment.

- **Validation Status**: TypeScript type checking, linting, and tests have ALREADY PASSED before this review was requested
- **Working Directory**: Unstaged and uncommitted changes are EXPECTED - this is normal development state
- **Change Scope**: Use `git diff main` to see changes against the main branch
- **Spec Context**: If a spec folder path is provided, read spec.md, plan.md, and tasks.md to understand what changes were approved

Do not flag:
- Unstaged changes as "incomplete work"
- Passing validation issues (they've been verified)
- Changes that are within the approved spec scope
```

### Change 4: Guidelines-Reviewer Scope Awareness

Add additional instructions to guidelines-reviewer.md:

```markdown
## Scope Validation

Before flagging any change as "unauthorized" or "outside guidelines":

1. **Read the spec folder** (path provided in your prompt)
   - `spec.md` - What was requested
   - `plan.md` - How it was planned to be implemented
   - `tasks.md` - Specific tasks that were approved

2. **Check if the change is in scope**
   - Does it implement a requirement from spec.md?
   - Does it follow the approach in plan.md?
   - Is it listed as a task in tasks.md?

3. **Only flag as unauthorized if**:
   - The change is NOT related to any spec requirement
   - The change contradicts the approved plan
   - The change was explicitly marked out of scope

Changes that implement spec requirements are NOT guideline violations, even if they modify significant code.
```

### Change 5: Dead-Code-Detector Context

Add to dead-code-detector.md:

```markdown
## Spec-Aware Detection

When a spec folder path is provided:

1. **Read spec.md** to understand what's being deprecated or replaced
2. **Check tasks.md** for cleanup tasks that may be in progress
3. **Consider plan.md** for migration strategies

Code may appear "dead" but actually be:
- Intentionally deprecated (replacement in progress)
- Part of a phased migration
- Temporarily unused pending integration

Flag as dead code only if it's clearly orphaned and NOT mentioned in the spec context.
```

### Change 6: Prepare-Completion Command Update

Update `commands/prepare-completion.md` to instruct Claude to pass context to agents:

```markdown
When launching review agents, include in each agent's prompt:

1. **Spec folder path**: "The spec folder is at `.cc-track/specs/108-feature-name/`"
2. **Validation status**: "TypeScript, linting, and tests have all passed"
3. **Diff target**: "Compare changes against main branch using `git diff main`"
```

---

## Files to Modify

| File | Change |
|------|--------|
| `agents/bug-scanner.md` | Fix `tools` field, add dev context |
| `agents/comment-compliance-reviewer.md` | Fix `tools` field, add dev context |
| `agents/dead-code-detector.md` | Fix `tools` field, add dev context + spec awareness |
| `agents/duplication-detector.md` | Fix `tools` field, add dev context |
| `agents/guidelines-reviewer.md` | Fix `tools` field, add dev context + scope validation |
| `agents/plan-adherence-reviewer.md` | Fix `tools` field, add dev context |
| `agents/spec-compliance-reviewer.md` | Fix `tools` field, add dev context |
| `agents/task-completion-reviewer.md` | Fix `tools` field, add dev context |
| `commands/prepare-completion.md` | Add agent context instructions |

---

## Task Planning Approach

Tasks will be organized as:
1. Update all 8 agent frontmatter (tools field fix) - can be parallelized
2. Add development context section to all 8 agents - can be parallelized
3. Add scope-specific instructions to guidelines-reviewer and dead-code-detector
4. Update prepare-completion.md command
5. Manual testing to verify permissions work correctly

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `tools` field doesn't work as expected | Low | Medium | Test with one agent first |
| Agents lose needed functionality | Low | Medium | Tool list matches current + proven pattern |
| Silent failure too silent | Low | Low | Agents can report when they can't complete review |

---

## Verification Plan

Testing will be done in real usage after publishing the updated plugin. On the next task:

1. **Permission Test**: Verify no escalation prompts during prepare-completion review
2. **Functionality Test**: Verify agents can still run git diff and knip
3. **Context Test**: Check agent output references validation status
4. **Scope Test**: Verify guidelines-reviewer doesn't flag in-scope changes

If issues arise, we'll address them in a follow-up task.
