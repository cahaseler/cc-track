---
description: Systematically resolve ambiguities in specifications through structured questioning
---

# Specification Clarification

**Goal**: Identify and resolve underspecified areas using structured taxonomy and sequential questioning.

**Core Principle**: Ask ONE question at a time, integrate answer immediately, move to next. Continue until all ambiguities resolved.

---

## Phase 1: Load Active Spec

**Find active spec directory**:
- Read `CLAUDE.md`
- Find line starting with `## Active Task`
- Extract the `@.claude/specs/NNN-feature-name/spec.md` path
- Parse out the directory: `.claude/specs/NNN-feature-name`

**Read spec content**:
- Read `.claude/specs/NNN-feature-name/spec.md`
- Read `.claude/specs/NNN-feature-name/.metadata.json`

**Verify**:
- Active spec exists
- Metadata status is not "completed" (check metadata.status)
- Spec is "draft" or needs refinement

---

## Phase 2: Ambiguity Scanning

Scan spec using this taxonomy to identify gaps:

### Functional Scope & Behavior
- ❓ Core user goals clear?
- ❓ Out-of-scope explicitly stated?
- ❓ User roles/personas defined?

### Domain & Data Model
- ❓ Entities and attributes specified?
- ❓ Identity/uniqueness rules clear?
- ❓ Lifecycle/state transitions defined?
- ❓ Data volume/scale assumptions stated?

### Interaction & UX Flow
- ❓ Critical user journeys documented?
- ❓ Error/empty/loading states defined?
- ❓ Accessibility considerations noted?

### Non-Functional Quality
- ❓ Performance targets (latency, throughput)?
- ❓ Scalability expectations (users, data)?
- ❓ Reliability requirements (uptime, recovery)?
- ❓ Security/privacy needs (authN/authZ, data protection)?
- ❓ Observability signals (logging, metrics)?

### Integration & Dependencies
- ❓ External services and failure modes?
- ❓ Data import/export formats?
- ❓ Protocol/versioning assumptions?

### Edge Cases & Failures
- ❓ Negative scenarios handled?
- ❓ Rate limiting/throttling defined?
- ❓ Conflict resolution (concurrent edits)?

###Constraints & Tradeoffs
- ❓ Technical constraints stated?
- ❓ Explicit tradeoffs documented?

---

## Phase 3: Question Prioritization

From gaps identified, create priority queue (internally):

**Prioritize by**:
1. **Impact**: Would answer change architecture/data model/UX significantly?
2. **Uncertainty**: How ambiguous is this area (high = priority)?
3. **Coverage**: Balance across categories

**Rules**:
- Continue until all critical ambiguities resolved
- Only high-impact unknowns
- Cover different categories when possible
- Skip if answer wouldn't materially affect implementation

---

## Phase 4: Interactive Questioning

### Using AskUserQuestion Tool:

**Present questions in batches of 1-4** using the tool's clean UI. Group questions intelligently:
- **Independent questions**: Ask together (up to 4 at once)
- **Dependent questions**: Ask separately if early answers change later questions

### Question Format:

**Use AskUserQuestion tool with:**
```typescript
AskUserQuestion({
  questions: [
    {
      question: "How should users authenticate?",
      header: "Auth",  // Max 12 chars
      multiSelect: false,
      options: [
        { label: "Email/password", description: "Traditional auth with password reset" },
        { label: "OAuth only", description: "Google, GitHub, etc." },
        { label: "Both", description: "Email and OAuth options" }
      ]
      // "Other" option auto-provided for free-form responses
    }
  ]
})
```

**For numeric/specific values** - use descriptive options:
```typescript
{
  question: "What's the target API response time?",
  header: "Performance",
  multiSelect: false,
  options: [
    { label: "<100ms p95", description: "Very fast, higher infrastructure cost" },
    { label: "<200ms p95", description: "Fast, balanced approach" },
    { label: "<500ms p95", description: "Acceptable for most use cases" }
  ]
}
```

### Question Flow:
1. **Identify 1-5 high-priority ambiguities** from scan
2. **Group by independence** - can answers be given in parallel?
3. **Present batch via AskUserQuestion** (1-4 questions)
4. **Immediately integrate answers into spec** (see Phase 5)
5. **Save spec.md after each batch**
6. **Continue with next batch** (or stop if done)

**Stop when**:
- User indicates completion ("done", "good", "no more questions")
- 5 questions answered in this session (prevents overload)
- Critical ambiguities resolved (remaining are low-impact)
- All [NEEDS CLARIFICATION] markers addressed

---

## Phase 5: Answer Integration

**For EACH answer received**:

### Step 1: Add to Clarifications Section
```markdown
## Clarifications

### Session YYYY-MM-DD
- Q: [question] → A: [answer]
```

### Step 2: Update Relevant Sections

**Functional ambiguity** → Update Functional Requirements
```markdown
### Functional Requirements
- **FR-006**: System MUST authenticate users via email/password
  - Password must meet complexity requirements (8+ chars, uppercase, number, symbol)
  - Password reset via email link (24-hour expiration)
```

**Data/entity ambiguity** → Update Key Entities
```markdown
### Key Entities
- **User**: Represents authenticated user
  - Attributes: email (unique), password_hash, created_at, last_login
  - Relationships: One user → many sessions
  - State: active, suspended, deleted
```

**Non-functional ambiguity** → Add/update NFRs
```markdown
### Non-Functional Requirements
- **NFR-001**: Performance - API responses <200ms p95
- **NFR-002**: Security - Password hashing with bcrypt (cost factor 12)
```

**Edge case ambiguity** → Update Edge Cases section
```markdown
### Edge Cases
- **Concurrent login attempts**: Lock account after 5 failed attempts in 15 minutes
- **Session expiration**: Auto-logout after 24 hours of inactivity
```

### Step 3: Remove Contradictions

If answer invalidates earlier assumptions:
- **Remove** the old/wrong statement
- **Don't** add "was previously" or "changed from"
- Keep spec evergreen

### Step 4: Save Immediately
**Write** updated content to `.claude/specs/NNN-feature-name/spec.md`

---

## Phase 6: Completion Report

After all questions (or early termination):

```
Clarification session complete!

Questions answered: X
Sections updated:
- Functional Requirements (added 2 items)
- Non-Functional Requirements (added performance targets)
- Edge Cases (added 1 scenario)

Coverage summary:
✅ Functional scope: Clear
✅ Data model: Clear
⚠️  Performance targets: Partially defined (could use load testing criteria)
✅ Security: Clear
✅ Edge cases: Clear

Recommendation: [Proceed to /plan | Run /clarify again for remaining gaps]

Next step: Ready to run `/plan` for technical design?
```

---

## Common Patterns

### When User Gives Vague Answer:
Use AskUserQuestion with specific options:
```typescript
AskUserQuestion({
  questions: [{
    question: "What's the target API response time?",
    header: "Performance",
    multiSelect: false,
    options: [
      { label: "<100ms p95", description: "Very fast, more expensive infrastructure" },
      { label: "<200ms p95", description: "Fast, balanced cost/performance" },
      { label: "<500ms p95", description: "Acceptable for most use cases" }
    ]
    // "Other" auto-provided for custom values
  }]
})
```

### When Answer Creates New Questions:
**DON'T** immediately ask follow-up within same batch.
**DO** add to queue for next batch, continue with highest priority questions.

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
      { label: "Defer decision", description: "Mark for later, use reasonable default" }
    ]
  }]
})
```

---

## Implementation Notes

- One spec.md update per answer (atomic, recoverable)
- Preserve all markdown formatting
- Don't reorder unrelated sections
- Track question count internally
- Use Read/Write tools for all file operations

---

## Next Command

After `/clarify` completes: `/plan`
