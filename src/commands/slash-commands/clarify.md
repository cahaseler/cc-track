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

## Phase 4: Sequential Questioning

### Question Format Rules:

**Option A: Multiple Choice (Preferred)**
```
Question: How should users authenticate?

| Option | Description |
|--------|-------------|
| A | Email/password with password reset |
| B | OAuth only (Google, GitHub) |
| C | Both email and OAuth |
| D | Different approach (specify) |
```

**Option B: Short Answer (≤5 words)**
```
Question: What's the target response time for API calls?

Format: Short answer (≤5 words)
Example: "Under 200ms p95"
```

### Question Flow:
1. **Present ONE question**
2. **Wait for answer**
3. **Immediately integrate into spec** (see Phase 5)
4. **Save spec.md**
5. **Move to next question** (or stop if done/quota reached)

**Stop when**:
- User says "done", "good", "no more"
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
```
User: "Make it fast"

Claude: "Got it, but I need specifics. For API response time, which target?
A) <100ms p95 (very fast, more expensive)
B) <200ms p95 (fast, balanced)
C) <500ms p95 (acceptable for most use cases)
D) Different target (specify)"
```

### When Answer Creates New Questions:
**DON'T** immediately ask follow-up within same turn.
**DO** add to internal queue, continue with highest priority.

### When User Says "I Don't Know":
```
Claude: "No problem! Let me mark this as [NEEDS CLARIFICATION] with your permission, and we can:
A) Research industry standards and propose something
B) Leave it flexible for now
C) Make it configurable

Which approach?"
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
