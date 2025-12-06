---
description: Generate technical implementation plan with constitution checks and research
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(mkdir:*), Bash(ls:*), Bash(test:*), Task, WebSearch, WebFetch, AskUserQuestion
---

# Technical Implementation Planning

**Goal**: Transform tech-agnostic spec into detailed technical design with chosen tech stack.

**Core Principle**: Research before designing. Constitution before committing. Design before tasking.

## Current Context

- Active spec directory: !`ls -1 .cc-track/specs/ 2>/dev/null | tail -1 || echo "No specs"`
- Constitution exists: !`test -f .cc-track/constitution.md && echo "Yes" || echo "No"`

---

## Prerequisites Check

**Find active spec directory**:
- Read `CLAUDE.md`
- Find line starting with `## Active Task`
- Extract the `@.cc-track/specs/NNN-feature-name/spec.md` path
- Parse out the directory: `.cc-track/specs/NNN-feature-name`

**Read spec files**:
- Read `.cc-track/specs/NNN-feature-name/spec.md`
- Read `.cc-track/specs/NNN-feature-name/.metadata.json`

**Verify**:
- [ ] Active spec exists
- [ ] No `[NEEDS CLARIFICATION]` markers remain in spec (should be resolved during /specify)

**If NEEDS CLARIFICATION found**:
```
❌ Cannot proceed with technical planning.

Found X unresolved clarifications in spec.md.
The spec should be complete before planning. Ask the user about these ambiguities now, or explicitly tell me to proceed anyway.
```

---

## Phase 0.5: Complexity Assessment

**Before diving into design, assess whether this spec warrants exploring alternative approaches.**

### Quick Assessment (30 seconds)

Ask yourself:
1. **Is the technology choice open?** (vs already determined by project conventions)
2. **Could this be built 3 different ways with meaningful tradeoffs?**
3. **Does this push near any constitution limits?**
4. **Is this an architectural change vs a feature addition?**

### Decision

- **If answers mostly "no"**: State "This is straightforward. Proceeding directly to design." → Skip to Phase 0.
- **If 2+ answers "yes"**: State "This has architectural implications. Exploring alternatives first." → Continue to Phase 0.6.

This assessment should take <30 seconds. Don't overthink it.

---

## Phase 0.6: Alternative Design Exploration (Optional)

**Only execute this phase if complexity assessment triggered it.**

### Generate 2-3 Design Alternatives

For each alternative, provide a brief sketch (not a full plan):

**Alternative A: [Name - e.g., "Minimal/Direct"]**
- Approach: [2-3 sentences describing the technical approach]
- Key tradeoff: [What you gain/lose with this approach]
- Constitution fit: [Any concerns with project guardrails?]

**Alternative B: [Name - e.g., "Flexible/Extensible"]**
- Approach: [2-3 sentences describing the technical approach]
- Key tradeoff: [What you gain/lose with this approach]
- Constitution fit: [Any concerns with project guardrails?]

**Alternative C: [Name - e.g., "Performance-First"]** (only if NFRs warrant)
- Approach: [2-3 sentences describing the technical approach]
- Key tradeoff: [What you gain/lose with this approach]
- Constitution fit: [Any concerns with project guardrails?]

### Recommendation

State your recommendation and why:
```
"I recommend Alternative [X] because [specific reason related to this project's needs]."
```

### Get User Approval

Present alternatives to user:
```
I've considered [N] approaches for this feature:

A) [Name]: [One-liner summary]
B) [Name]: [One-liner summary]
C) [Name]: [One-liner summary] (if applicable)

Recommendation: [X] - [Brief rationale]

Proceed with this approach? Or discuss alternatives?
```

**Wait for user confirmation before Phase 0.**

---

## Phase 0: Constitution Check (Initial)

**If `.cc-track/constitution.md` exists**:

### Load and Parse Constitution
**Read** `.cc-track/constitution.md`

### Extract Guardrails
- Complexity limits (max services, max dependencies, etc.)
- Prohibited patterns (unless justified)
- Required patterns
- Performance/quality standards

### Pre-Design Check
Ask user: "Before designing, what's the planned approach?"
- Language/framework?
- Architecture style?
- Key dependencies?

### Validate Against Guardrails
**For each potential violation**:
```
⚠️  Constitution Check Warning:

Guardrail: "Maximum 3 separate services"
Your plan: Mentions 4 services (API, Auth, Notifications, Analytics)

This needs justification. Either:
A) Simplify to fit within 3 services
B) Justify why 4 services are necessary

Which approach?
```

**Record violations** for plan.md Complexity Tracking section.

---

## Phase 1: Research

### Ask Technical Questions
One at a time (like `/specify` questioning):

**Required Questions**:
1. **Language/Runtime**: "What language and version? (e.g., TypeScript 5.3 with Bun)"
2. **Framework**: "Primary framework? (e.g., None/minimal, Express, FastAPI, etc.)"
3. **Storage**: "Data storage approach? (e.g., SQLite, PostgreSQL, files, none)"
4. **Testing**: "Testing framework? (e.g., Bun test, Jest, pytest)"

**Conditional Questions** (based on spec):
- If API mentioned → "REST, GraphQL, or gRPC?"
- If auth mentioned → "Authentication library/approach?"
- If real-time → "WebSockets, SSE, or polling?"

### Research Best Practices
For each chosen technology:
```
Researching [chosen tech] best practices...
- Latest version and features
- Common patterns for [spec requirements]
- Performance characteristics
- Security considerations
```

### Research Delegation (when beneficial)

If any of these apply:
- Unfamiliar with the specific technology version
- Integration pattern is non-obvious
- Performance characteristics matter
- Best practices aren't clear from experience

Delegate research to a specialized agent:
```
Task: "Research [technology] best practices for [specific use case].
       Focus: [1-2 specific questions]
       Format: Concise bullet points, max 300 words"
Subagent: researcher
Output: .cc-track/specs/NNN-feature-name/research-[topic].md
```

This saves your context for design work while getting thorough research.

### Document Decisions
Create `research.md`:
```markdown
# Research: [Feature Name]

## Technology Decisions

### Decision: TypeScript + Bun
- **Chosen**: TypeScript 5.3 with Bun runtime
- **Rationale**: Built-in TypeScript, faster than Node, good for CLI tools
- **Alternatives Considered**:
  - Node.js: More mature but slower
  - Go: Faster but team unfamiliar
- **Tradeoffs**: Bun is newer, smaller ecosystem

### Decision: SQLite for Storage
...
```

---

## Phase 2: Design

### Generate Technical Context
```markdown
**Language/Version**: TypeScript 5.3
**Runtime/Framework**: Bun
**Primary Dependencies**: commander, zod
**Storage**: SQLite
**Testing**: Bun test
**Target Platform**: CLI tool
**Performance Goals**: <100ms command execution
**Constraints**: Cross-platform (Linux, macOS, Windows)
**Scale/Scope**: Single-user local tool
```

### Create Data Model (if applicable)
```markdown
## Data Model

### Entity: User
- **Purpose**: Represents authenticated user
- **Fields**:
  - `id`: UUID (primary key)
  - `email`: string (unique, indexed)
  - `password_hash`: string (bcrypt)
  - `created_at`: timestamp
  - `last_login`: timestamp | null
- **Relationships**: One User → Many Sessions
- **Validation**: Email format, password complexity
- **State Transitions**: active → suspended → deleted
```

Save to `data-model.md` if data involved.

### Generate API Contracts (if applicable)
For each endpoint from spec:
```markdown
## Endpoint: POST /api/users

**Purpose**: Create new user account
**Request**:
```json
{
  "email": "string (email format)",
  "password": "string (min 8 chars)"
}
```
**Response** (201):
```json
{
  "id": "uuid",
  "email": "string",
  "created_at": "iso8601"
}
```
**Errors**:
- 400: Invalid email or weak password
- 409: Email already exists
```

Save to `contracts/` directory.

### Create Quickstart Guide
Based on spec user stories:
```markdown
# Quickstart: [Feature Name]

## Setup
1. Install dependencies
2. Initialize database
3. Configure auth keys

## First Use
1. Create user: `tool user create user@example.com`
2. Login: `tool login user@example.com`
3. Verify: `tool user list`

## Testing Success
- [ ] User can register
- [ ] User can login
- [ ] Session persists
```

Save to `quickstart.md`.

### Write Plan Document
Use `templates/plan-template.md`:
- Summary
- Technical Context (from above)
- Constitution Check results
- Project Structure
- Phase 0 (Research) - reference research.md
- Phase 1 (Design) - reference data-model.md, contracts/, quickstart.md
- Phase 2 (Task Planning Approach) - **describe** what /tasks will do, DON'T create tasks.md yet
- Progress Tracking
- Risk Assessment

Save to `plan.md`.

---

## Phase 3: Constitution Check (Post-Design)

**If constitution exists, re-validate**:

### Check Design Decisions
- Services/components within limits?
- Patterns follow guidelines?
- Dependencies within budget?
- Performance targets align with standards?

### Document Violations
If any violations remain:
```markdown
## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 4 services | Analytics needs separate scaling | Combining with API would bloat codebase |
```

### Refactor if Needed
If violations can't be justified:
```
❌ Design violates constitution without justification.

Issue: [specific violation]
Required: Simplify or justify

Revising design...
```

---

## Phase 4: Presentation

Show user:
```
Technical plan complete! 🎯

[If alternatives were explored:]
Design approach: [Chosen alternative name]
Alternatives considered: [Brief list of rejected approaches]

Created files:
- plan.md (implementation plan)
- research.md (technology decisions)
- data-model.md (entity designs)
- contracts/ (API specifications)
- quickstart.md (getting started guide)

Constitution status: ✅ All guardrails met
Tech stack: TypeScript + Bun + SQLite
Complexity: Low (single service, 3 dependencies)

Next step: Ready to run `/tasks` to generate implementation breakdown?
```

---

## Common Patterns

### When User Wants to Skip Constitution
```
User: "Just ignore the constitution for now"

Claude: "I can proceed, but I'll document the deviations in plan.md for future reference. Continue?"
```

### When Research Finds Issues
```
Claude: "⚠️  Found that [technology] doesn't support [requirement] well.

Alternatives:
A) Switch to [alt tech] (better support)
B) Use workaround with [current tech]
C) Adjust requirement

Recommendation: A

What should I do?"
```

### When Design Gets Complex
```
Claude: "This design is getting complex (7 components for 3 features).

YAGNI Check - Can we simplify by:
A) Merging [component X] into [component Y]
B) Deferring [feature Z] to later
C) Using [simpler pattern]

Recommend: A + B

Thoughts?"
```

---

## Implementation Notes

- Use Read/Write/Bash tools for all file operations
- Reference constitution by path (`.cc-track/constitution.md`)
- Create contracts/ subdirectory if needed: `mkdir -p .cc-track/specs/NNN-feature-name/contracts`
- Don't create tasks.md yet (that's `/tasks` job)
- Update `.metadata.json` if status changes
- Use WebSearch for recent tech docs
- Apply YAGNI ruthlessly

---

## Next Command

After `/plan` completes: `/tasks`
