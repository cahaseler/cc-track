# Feature Specification: [FEATURE NAME]

**Feature ID**: `[###]`
**Branch**: `[###-feature-name]`
**Created**: [DATE]
**Status**: Draft

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers
- 🔍 Use [NEEDS CLARIFICATION: specific question] for any ambiguity

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something, mark it explicitly
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing

### Primary User Story
[Describe the main user journey in plain language]

### Acceptance Scenarios
1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]
3. **Given** [initial state], **When** [action], **Then** [expected outcome]

### Edge Cases
- What happens when [boundary condition]?
- How does system handle [error scenario]?
- What occurs when [unexpected input]?

---

## Requirements

### Functional Requirements
- **FR-001**: System MUST [specific capability]
- **FR-002**: System MUST [specific capability]
- **FR-003**: Users MUST be able to [key interaction]
- **FR-004**: System MUST [data requirement]
- **FR-005**: System MUST [behavior]

*Example of marking unclear requirements:*
- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Non-Functional Requirements
- **NFR-001**: Performance - [NEEDS CLARIFICATION: latency/throughput targets]
- **NFR-002**: Scalability - [NEEDS CLARIFICATION: expected user count, data volume]
- **NFR-003**: Security - [NEEDS CLARIFICATION: authentication/authorization requirements]
- **NFR-004**: Availability - [NEEDS CLARIFICATION: uptime requirements]

### Key Entities *(if feature involves data)*
- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

---

## Success Criteria
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]
- [ ] [Measurable outcome 3]

---

## Scope & Boundaries

### In Scope
- [Feature 1]
- [Feature 2]
- [Feature 3]

### Out of Scope
- [Explicitly excluded feature 1]
- [Explicitly excluded feature 2]

---

## Clarifications
*Key decisions made during specification*

### Session [YYYY-MM-DD]
- Q: [question] → A: [answer]
- Q: [question] → A: [answer]

---

## Review & Acceptance Checklist

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All sections completed or marked N/A

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified
- [ ] Edge cases documented

---

## Dependencies & Assumptions
- [Dependency 1]
- [Assumption 1]

---

## Open Questions
*Questions that remain after clarification - should be minimal*
- [Question 1]
- [Question 2]
