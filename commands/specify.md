---
description: Create a feature specification through Socratic questioning and iterative refinement
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(git:*), Bash(gh:*), Bash(bun:*), Task, AskUserQuestion, WebSearch, WebFetch
---

# Creating Feature Specifications

**Goal**: Transform rough ideas into complete, tech-agnostic specifications through systematic questioning.

**Core Principle**: Create infrastructure FIRST, then gather understanding through questions. Documents come last.

## Pre-Check

!`ls .cc-track >/dev/null 2>&1 || echo "⚠️ STOP: .cc-track directory not found. Run /cc-track:setup-cc-track first."`

## Current Context

- Current branch: !`git branch --show-current`
- Existing specs: !`ls -1 .cc-track/specs/ 2>/dev/null || echo "No specs yet"`

---

## Step 1: Create Infrastructure FIRST

**CRITICAL**: Infrastructure must be created BEFORE any Socratic questioning or research begins. This prevents getting distracted before the branch/folder exist.

1. **Get task title**: Use from user's request and proceed to create infrastructure. Only ask for clarification if the title is genuinely unclear - do not ask for approval of the title itself.
2. **Run script**:
   ```bash
   bun "${CLAUDE_PLUGIN_ROOT}/skills/cc-track-tools/scripts/specify.ts" "{title}"
   ```
3. **Confirm results**: Branch created, spec directory ready, CLAUDE.md updated, GitHub issue created (if enabled)

If script fails, report error and stop.

---

## Step 2: Understanding (Socratic Questioning)

**Now** that infrastructure exists, build complete understanding through questions.

### Initial Questions
Start with high-level understanding (2-4 questions):
- **Purpose**: What problem does this solve? For whom?
- **Scope**: What's included? What's explicitly out of scope?
- **Success criteria**: How do we know it's working?
- **User flows**: Core happy path clear?

### Ambiguity Taxonomy
As understanding develops, systematically check these areas for gaps:

**Functional Scope & Behavior**
- Core user goals clear?
- Out-of-scope explicitly stated?
- User roles/personas defined?

**Domain & Data Model**
- Entities and attributes specified?
- Identity/uniqueness rules clear?
- Lifecycle/state transitions defined?
- Data volume/scale assumptions stated?

**Interaction & UX Flow**
- Critical user journeys documented?
- Error/empty/loading states defined?
- Accessibility considerations noted?

**Non-Functional Quality**
- Performance targets (latency, throughput)?
- Scalability expectations (users, data)?
- Reliability requirements (uptime, recovery)?
- Security/privacy needs (authN/authZ, data protection)?

**Integration & Dependencies**
- External services and failure modes?
- Data import/export formats?

**Edge Cases & Failures**
- Negative scenarios handled?
- Rate limiting/throttling defined?
- Conflict resolution (concurrent edits)?

**Constraints & Tradeoffs**
- Technical constraints stated?
- Explicit tradeoffs documented?

### Questioning Approach
- Group questions smartly (2-4 per batch), but only if early answers won't invalidate later ones
- Be specific: "What authentication method?" not "How will users log in?"
- Continue until complete - don't stop at "good enough", resolve all ambiguities

---

## Step 3: Complexity Assessment & Exploration

**After initial Purpose/Scope questions**, assess whether codebase exploration would improve the specification.

**Trigger exploration IF:**
- User mentioned modifying/extending existing functionality
- Feature must integrate with existing patterns (unclear which ones)
- You're uncertain about codebase conventions for this type of feature
- User referenced "like X" or "similar to how we do Y"

**Skip exploration IF:**
- Feature is entirely new (greenfield)
- No integration with existing code needed
- Requirements are precise and bounded

If needed, spawn 1-2 Explore agents (parallel via Task tool). Results inform your questions.

---

## Step 4: Artifact Creation (spec.md)

Once you have **complete** understanding (all taxonomy areas covered, no remaining ambiguities):

1. **Read** `templates/spec-template.md`
2. **Fill in** all sections from gathered information
3. **Write** to `.cc-track/specs/{taskId}-{featureName}/spec.md`

**Important**: The spec should be complete with NO `[NEEDS CLARIFICATION]` markers. If something is still unclear while writing, go back and ask before continuing.

---

## Step 5: Presentation

Show the user:
1. **Branch**: `{taskId}-{featureName}` (created in Step 1)
2. **Spec location**: `.cc-track/specs/{taskId}-{featureName}/spec.md`
3. **Content preview**: Show first 30-40 lines
4. **Next step**: "Ready to run `/cc-track:plan` for technical design?"

---

## Common Pitfalls

- **Don't** start research or questioning before running the specify script
- **Don't** stop questioning when you have "enough to start"
- **Don't** leave `[NEEDS CLARIFICATION]` markers in the spec
- **Don't** guess at requirements - ask when uncertain
- **Don't** include implementation details (tech stack, APIs, code) - focus on WHAT and WHY
