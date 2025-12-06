---
description: Create a feature specification through Socratic questioning and iterative refinement
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(git:*), Bash(gh:*), Bash(mkdir:*), Bash(ls:*), Task, AskUserQuestion, WebSearch, WebFetch
---

# Creating Feature Specifications

**Goal**: Transform rough ideas into complete, tech-agnostic specifications through systematic questioning.

**Core Principle**: Gather complete understanding through questions. Continue until all ambiguities are resolved. Documents come last.

## Pre-Check

!`ls .cc-track >/dev/null 2>&1 || echo "⚠️ STOP: .cc-track directory not found. This project needs migration to the new cc-track format. Please run /cc-track:migrate first, then run /cc-track:specify again."`

## Current Context

- Current branch: !`git branch --show-current`
- Existing specs: !`ls -1 .cc-track/specs/ 2>/dev/null || echo "No specs yet"`

---

## Phase 1: Understanding (Socratic Questioning)

**DO NOT create any files yet.** First, build complete understanding through questions.

### Initial Questions:
Start with high-level understanding (2-4 questions):
- **Purpose**: What problem does this solve? For whom?
- **Scope**: What's included? What's explicitly out of scope?
- **Success criteria**: How do we know it's working?
- **User flows**: Core happy path clear?

### Ambiguity Taxonomy:
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

### Questioning Approach:
1. **Use AskUserQuestion tool** - Provides clean UI for multiple questions at once
2. **Group questions smartly** - Ask 2-4 questions per batch, but only if early answers won't invalidate later ones
3. **Always prefer multiple choice** - Tool presents these cleanly (2-4 options per question)
4. **Include "Other" for flexibility** - Auto-provided by tool for free-form responses
5. **Be specific** - "What authentication method?" not "How will users log in?"
6. **Continue until complete** - Don't stop at "good enough", resolve all ambiguities

### Question Prioritization:
- **Impact**: Would answer change architecture/data model/UX significantly?
- **Uncertainty**: How ambiguous is this area?
- **Coverage**: Balance across taxonomy categories

### Examples Using AskUserQuestion Tool:

**Single question batch (if answer might affect follow-ups):**
```typescript
AskUserQuestion({
  questions: [{
    question: "What's the primary purpose of this feature?",
    header: "Purpose",
    multiSelect: false,
    options: [
      { label: "User management", description: "Handle user accounts, profiles, permissions" },
      { label: "Data processing", description: "Transform, analyze, or export data" },
      { label: "Integration", description: "Connect with external services/APIs" },
      { label: "UI enhancement", description: "Improve user interface or experience" }
    ]
  }]
})
```

**Multiple question batch (when independent):**
```typescript
AskUserQuestion({
  questions: [
    {
      question: "Who are the primary users?",
      header: "Users",
      multiSelect: true,
      options: [
        { label: "End users", description: "Regular application users" },
        { label: "Admins", description: "System administrators" },
        { label: "API clients", description: "External systems via API" }
      ]
    },
    {
      question: "What's the expected scale?",
      header: "Scale",
      multiSelect: false,
      options: [
        { label: "Small", description: "<100 users, <1000 records" },
        { label: "Medium", description: "100-10K users, <1M records" },
        { label: "Large", description: ">10K users, >1M records" }
      ]
    }
  ]
})
```

### When User Says "I Don't Know":
```typescript
AskUserQuestion({
  questions: [{
    question: "We need to define [the unclear aspect]. How should we proceed?",
    header: "Approach",
    multiSelect: false,
    options: [
      { label: "Research standards", description: "Look up industry best practices" },
      { label: "Make configurable", description: "Allow runtime configuration" },
      { label: "Use sensible default", description: "Pick reasonable value, document assumption" }
    ]
  }]
})
```

### Research Support:
If you need background research on a domain, technology, or pattern:
```
Task: "Research [domain/pattern] to inform feature specification for [feature]"
Subagent: researcher
Output: .cc-track/specs/research-[topic].md
```

---

## Phase 1.5: Complexity Assessment & Exploration

**After initial Purpose/Scope questions (Round 1-2)**, assess whether codebase exploration would improve the specification.

### Assess Exploration Need

**Trigger exploration IF any of these are true:**
- User mentioned modifying/extending existing functionality
- Feature must integrate with existing patterns (unclear which ones)
- You're uncertain about codebase conventions for this type of feature
- User referenced "like X" or "similar to how we do Y"
- Domain model or business logic context is needed

**Skip exploration IF all of these are true:**
- Feature is entirely new (greenfield)
- No integration with existing code needed
- Requirements are precise and bounded
- You already have sufficient codebase context from the conversation

### Decision Communication

**If simple** (skip exploration):
```
"This is well-defined. Proceeding to specification."
```

**If complex** (trigger exploration):
```
"This feature involves existing code patterns. Let me quickly explore the codebase
to inform our specification discussion..."
```

### If Exploration Needed

Spawn 1-2 Explore agents (parallel via Task tool) based on request type:

**For features modifying existing code:**
```
Task: "Explore codebase for features similar to [requested feature].
       Find 2-3 examples showing file organization, naming patterns, and test structure.
       Focus on: [relevant directories from initial answers]"
Subagent: Explore
```

**For features integrating with existing systems:**
```
Task: "Identify integration points for a new [feature type].
       Where would this feature connect? What files/modules need awareness?
       Look for: hooks, configuration, dependency injection, event systems"
Subagent: Explore
```

**For domain-specific features:**
```
Task: "Research how [domain concept] is currently handled in this codebase.
       Find existing models, validation rules, terminology used.
       Document any constraints or patterns that must be followed."
Subagent: Explore
```

### Use Exploration Results

Do NOT dump raw exploration results into the spec. Instead:

1. **Inform your questions**: Reference discovered patterns when asking about requirements
2. **Surface constraints**: "I found you require X for all Y features - should this follow that?"
3. **Suggest options**: "I see two patterns you use: A and B. Which fits better?"
4. **Note in spec**: Add brief references in spec.md Clarifications section

**Example informed question:**
```
I explored your codebase and found similar features in src/features/.
They all follow a pattern of [pattern description].

Should this feature:
A) Follow the same pattern
B) Use a different approach because [reason]
C) Let me explain the context first
```

### Continue Questioning

After exploration (or if skipped), continue with Phase 1 questioning until all taxonomy areas are covered.

---

## Phase 2: Artifact Creation

Once you have **complete** understanding (all taxonomy areas covered, no remaining ambiguities):

### Step 1: Generate Task ID and Feature Name
**Find next task ID**:
- List `.cc-track/specs/` directory
- Find directories matching pattern `NNN-*` (e.g., `001-feature`, `002-another`)
- Extract highest number, add 1, pad to 3 digits
- If no directories exist, use `001`

**Generate feature name** from title:
- Convert to lowercase
- Replace non-alphanumeric with dashes
- Remove leading/trailing dashes
- Limit to 50 chars
- Example: "Add User Authentication" → "add-user-authentication"

### Step 2: Create Git Branch
```bash
git checkout -b ${taskId}-${featureName}
```

### Step 3: Create Spec Directory
```bash
mkdir -p .cc-track/specs/${taskId}-${featureName}
```
Example: `.cc-track/specs/001-add-user-authentication/`

### Step 4: Generate spec.md from Template
**Read** `templates/spec-template.md` and fill in:
- **Feature ID**: `${taskId}`
- **Title**: Extracted from understanding phase
- **User Scenarios**: From gathered information
- **Functional Requirements**: As specific FR-XXX items
- **Non-Functional Requirements**: Performance, security, etc.
- **Key Entities**: Data model from questioning
- **Edge Cases**: From edge case discussions

**Write** to `.cc-track/specs/${taskId}-${featureName}/spec.md`

**Important**: The spec should be complete with NO `[NEEDS CLARIFICATION]` markers. If you realize something is still unclear while writing, go back and ask before continuing.

### Step 5: Create Metadata
**Write** `.cc-track/specs/${taskId}-${featureName}/.metadata.json`:
```json
{
  "task_id": "001",
  "feature_name": "add-user-authentication",
  "branch": "001-add-user-authentication",
  "status": "specified",
  "started": "2025-01-14T10:30:00Z"
}
```

### Step 6: GitHub Integration (if enabled)
**Check** `.cc-track/track.config.json` for `github.enabled: true`

If enabled:
```bash
gh issue create --title "Feature: ${title}" --body "${spec content}"
```

Update `.metadata.json` with issue info:
```json
{
  "github": {
    "issue": 123,
    "url": "https://github.com/user/repo/issues/123"
  }
}
```

### Step 7: Update CLAUDE.md
**Find** line starting with `## Active Task`

**Replace** the `@` import line with:
```markdown
## Active Task
@.cc-track/specs/${taskId}-${featureName}/spec.md
```

---

## Phase 3: Presentation

Show the user:
1. **Branch created**: `${taskId}-${featureName}`
2. **Spec location**: `.cc-track/specs/${taskId}-${featureName}/spec.md`
3. **Content preview**: Show first 30-40 lines of spec
4. **Coverage summary**: Confirm all taxonomy areas addressed
5. **Next step suggestion**: "Ready to run `/plan` for technical design?"

---

## Common Pitfalls to Avoid

❌ **Don't**: Stop questioning when you have "enough to start"
✅ **Do**: Continue until all ambiguities resolved

❌ **Don't**: Leave `[NEEDS CLARIFICATION]` markers in the spec
✅ **Do**: Ask the question before creating the artifact

❌ **Don't**: Guess at requirements
✅ **Do**: Ask when uncertain

❌ **Don't**: Include implementation details (tech stack, APIs, code)
✅ **Do**: Focus only on WHAT and WHY, not HOW

❌ **Don't**: Write vague requirements like "system should be fast"
✅ **Do**: Ask for specific targets and document them

---

## Example Flow

```
User: "I want to add user authentication"

Claude: [Uses AskUserQuestion tool - Round 1]
1. Authentication Method → Email/password
2. Primary Users → End users + Admins
3. Security Level → Standard

Claude: "Great! Let me check a few more areas..."

[Uses AskUserQuestion tool - Round 2]
1. Session timeout → 24 hours
2. Password reset method → Email link
3. Max failed login attempts → 5 attempts, 15 min lockout

Claude: "Almost there. A couple more..."

[Uses AskUserQuestion tool - Round 3]
1. Expected user scale → Medium (100-10K users)
2. Audit logging needed? → Yes, login/logout events

Claude: "I have complete understanding. Creating the spec..."

[Creates all artifacts - branch, spec.md, metadata]

"Specification complete! Here's what I created:
- Branch: 001-add-user-authentication
- Spec with 8 functional requirements, 3 NFRs, 4 edge cases
- All areas covered, no ambiguities remaining

Ready to run `/plan` for technical design?"
```

---

## Implementation Notes

- Use spec-helpers.ts functions for all file operations
- Follow cc-track naming conventions (3-digit IDs)
- Preserve all metadata in .metadata.json
- Git operations done directly with Bash tool
- Check for active task before creating (block if exists)

---

## Next Command

After `/specify` completes successfully, suggest: `/plan`
