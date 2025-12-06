---
description: Create or update project constitution with governing principles and guardrails
---

# Project Constitution

**Goal**: Establish governing principles that guide all technical decisions and implementation choices.

**Core Principle**: Constraints enable creativity. Clear guardrails prevent complexity creep.

---

## When to Use

**Create constitution when**:
- Starting new project
- Team wants consistent technical standards
- Project keeps getting too complex
- Need to enforce YAGNI/simplicity

**Update constitution when**:
- Principles evolve through experience
- New technology constraints emerge
- Team learns from mistakes

---

## Phase 1: Understand Project Context

**If creating new**:
Ask user systematically:

### 1. Project Type & Goals
```
What kind of project is this?
A) CLI tool / utility
B) Web application (frontend + backend)
C) API service
D) Library / framework
E) Other (specify)
```

### 2. Team & Scale
```
Team size and experience level?
A) Solo developer
B) Small team (2-5)
C) Medium team (5-15)
D) Large team (15+)
```

### 3. Complexity Tolerance
```
How much complexity can the project handle?
A) Minimal - Keep it simple (YAGNI strictly)
B) Moderate - Balance simplicity and extensibility
C) High - Enterprise-grade with abstractions
```

### 4. Quality Standards
```
Testing approach?
A) TDD required (tests before implementation)
B) Test after implementation
C) Tests for critical paths only
D) Minimal testing
```

### 5. Key Constraints
```
Any specific technical constraints?
- Specific languages/frameworks required?
- Performance requirements?
- Security/compliance needs?
- Deployment restrictions?
```

**If updating existing**:
- Read `.cc-track/constitution.md`
- Parse and understand current principles, guardrails, and version
- Ask what needs to change and why

---

## Phase 2: Generate Constitution

Use `templates/constitution-template.md` and customize:

### Core Principles Section
Based on project type and complexity:

**For CLI Tools**:
```markdown
### I. Simplicity First (YAGNI)
- Build only what is needed right now
- No speculative features
- Simple solutions over clever ones

### II. Single Responsibility
- Each command does one thing well
- No command has multiple modes
- Clear, predictable behavior

### III. User Experience
- Helpful error messages with next steps
- Progress indicators for long operations
- Consistent flag naming across commands
```

**For Web Applications**:
```markdown
### I. Component Isolation
- Components have single responsibility
- Clear prop interfaces
- Minimal prop drilling (max 2 levels)

### II. State Management
- Local state by default
- Global state only for truly global data
- No redundant state copies

### III. Performance Budgets
- Initial load <3s on 3G
- Time to Interactive <5s
- Lighthouse score >90
```

**For APIs**:
```markdown
### I. API Design
- RESTful conventions
- Consistent error responses
- Versioning strategy (URL or header)

### II. Performance
- p95 response time <200ms
- p99 response time <500ms
- Rate limiting per client

### III. Security
- Authentication on all endpoints except health
- Input validation with explicit schemas
- SQL injection prevention (parameterized queries)
```

### Architectural Guardrails
```markdown
## Architectural Guardrails

### Complexity Limits
- **Maximum Services**: 3 (unless justified)
- **Maximum Dependencies**: 10 per service
- **Maximum File Size**: 500 lines (triggers refactor)
- **Maximum Function Complexity**: Cyclomatic complexity <10

### Prohibited Patterns (unless justified)
- Repository pattern (unless ORM pain points)
- Microservices (unless proven scale need)
- Premature abstraction (Rule of 3)
- Global mutable state

### Required Patterns
- Dependency injection for testability
- Explicit error types (no generic Error)
- Logging at service boundaries
- Input validation at API boundaries
```

### Quality Standards
```markdown
## Development Workflow

### Test-Driven Development
- **Required**: Tests written before implementation
- **Coverage**: Minimum 80% line coverage
- **Types**: Unit (fast), Integration (comprehensive), E2E (critical paths)
- **Exceptions**: Spikes/prototypes (document as such)

### Code Quality Gates
- [ ] All tests passing
- [ ] Linter passing (zero warnings)
- [ ] Type checker passing (strict mode)
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Performance benchmarks met (if applicable)
```

### Performance & Security Standards
Based on project requirements from Phase 1.

### Governance
```markdown
## Governance

### Constitutional Authority
- This constitution supersedes coding preferences
- All `/cc-track:plan` commands validate against these principles
- Violations require explicit justification and documentation

### Amendment Process
1. Propose change with clear rationale
2. Document alternatives considered
3. Assess impact on existing code
4. Require team approval [if team project]
5. Create migration plan if needed
6. Update version and amendment date

### Enforcement
- `/cc-track:plan` command checks constitution automatically
- Code reviews verify compliance
- Complexity violations logged in decision_log.md
- Quarterly constitution review recommended
```

---

## Phase 3: Validation & Refinement

### Present Draft to User
```
Constitution draft complete! Here's the summary:

Core Principles:
1. Simplicity First (YAGNI)
2. Single Responsibility
3. Performance Standards

Key Guardrails:
- Max 3 services
- Max 10 dependencies per service
- TDD required
- 80% test coverage minimum

This will be enforced during `/cc-track:plan` phase.

Does this align with your project needs?
Anything to adjust?
```

### Common Adjustments
```
User: "TDD seems too strict"

Claude: "I can relax to 'TDD encouraged' or 'Tests required (timing flexible)'.

Options:
A) TDD required (current)
B) TDD encouraged, tests before PR
C) Tests required, timing flexible
D) Tests for critical paths only

Which fits better?"
```

---

## Phase 4: Save & Document

### Save Constitution
**Write** constitution content to `.cc-track/constitution.md`

### Update Decision Log
```markdown
[YYYY-MM-DD HH:MM] - Project Constitution Established
- **Context**: Created initial constitution for [project]
- **Decision**: Adopted principles: [list]
- **Rationale**: [why these principles matter for this project]
- **Key Guardrails**: [most important limits]
- **Implications**: All future `/cc-track:plan` commands will validate against these
- **Reversibility**: Easy - can amend through governance process
```

### Present Completion
```
✅ Constitution created: .cc-track/constitution.md

Version: 1.0.0
Ratified: 2025-01-14

The constitution will be automatically checked during:
- `/cc-track:plan` - Pre-design and post-design validation
- Pull requests (if configured)
- Architecture reviews

Key principles:
1. [Principle 1]
2. [Principle 2]
3. [Principle 3]

To update later: Run `/constitution` with update request
To view: cat .cc-track/constitution.md
```

---

## Common Patterns

### When User Wants "No Rules"
```
User: "I don't want any constraints"

Claude: "Understood. However, even 'no rules' is a rule!

I recommend a minimal constitution:
- YAGNI (build what's needed)
- Tests exist (coverage flexible)
- Document major decisions

This prevents future headaches without being restrictive.

Thoughts?"
```

### When Updating Existing Constitution
```
Claude: "Current constitution version 1.2.0 from 2024-10-01.

What needs to change?
- Add new principle?
- Adjust existing guardrail?
- Remove outdated constraint?

Describe the change..."
```

### When Project Outgrows Constitution
```
User: "We've outgrown the 3-service limit"

Claude: "That's a signal to update the constitution!

Amendment proposal:
- Old: Max 3 services
- New: Max 5 services
- Rationale: [from user]
- Migration: Current 4 services documented

I'll update the constitution and version to 1.3.0.

Approve?"
```

---

## Implementation Notes

- Save to `.cc-track/constitution.md` (not in specs/)
- Version number in file (semantic versioning)
- Ratified date and last amended date
- Reference from CLAUDE.md if desired
- Used automatically by `/cc-track:plan` command
- Can be project-specific or team-wide

---

## Integration with Workflow

Constitution is **optional** but powerful:
- **Without**: `/cc-track:plan` focuses on technical feasibility
- **With**: `/cc-track:plan` also validates against principles and guardrails

Most projects benefit from at least minimal constitution:
- "Keep it simple"
- "Test what matters"
- "Document decisions"
