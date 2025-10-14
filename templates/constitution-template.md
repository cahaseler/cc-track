# Project Constitution

**Version**: 1.0.0
**Ratified**: [DATE]
**Last Amended**: [DATE]

## Purpose

This constitution establishes the governing principles and guardrails for [PROJECT_NAME]. It ensures consistent decision-making throughout development and serves as the foundation for technical planning and implementation.

---

## Core Principles

### I. Simplicity First (YAGNI)
- Build only what is needed right now
- No speculative features or over-engineering
- Simple solutions preferred over complex ones
- Complexity must be justified with specific current need

### II. Quality Standards
- **Test Coverage**: [Target percentage or approach]
- **Performance**: [Key metrics and targets]
- **Documentation**: [Documentation requirements]
- **Code Review**: [Review process and requirements]

### III. Technical Constraints
- **Languages/Frameworks**: [Approved tech stack]
- **Dependencies**: [Dependency management rules]
- **Architecture**: [Architectural boundaries and patterns]
- **Deployment**: [Deployment and hosting requirements]

---

## Architectural Guardrails

### Complexity Limits
- **Maximum Services/Projects**: [Number - e.g., "3 unless justified"]
- **Maximum Dependencies**: [Number per project/service]
- **Maximum File Size**: [Lines of code limit]
- **Maximum Function Complexity**: [Cyclomatic complexity limit]

### Prohibited Patterns (unless justified)
- Repository pattern (unless specific ORM issues)
- Microservices (unless scale justifies)
- [Pattern 3 that adds complexity]
- [Pattern 4 that adds abstraction overhead]

### Required Patterns
- Dependency injection for testability
- Error handling with specific error types
- Logging at appropriate levels
- [Pattern 4 specific to your domain]

---

## Development Workflow

### Test-Driven Development
- **Required**: Tests written before implementation
- **Coverage**: [Minimum coverage requirements]
- **Types**: Unit, integration, and E2E tests as appropriate
- **Exceptions**: [When TDD can be skipped, if ever]

### Git Workflow
- **Branching**: [Branching strategy]
- **Commits**: [Commit message format]
- **PRs**: [PR requirements and review process]
- **Merging**: [Merge strategy]

### Code Quality Gates
- [ ] All tests passing
- [ ] Linter passing
- [ ] Type checker passing
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Performance benchmarks met (if applicable)

---

## Security & Compliance

### Security Requirements
- **Authentication**: [Authentication approach]
- **Authorization**: [Authorization approach]
- **Data Protection**: [Encryption, PII handling]
- **Vulnerability Management**: [Security scanning, updates]

### Compliance
- **Regulations**: [Applicable regulations - GDPR, HIPAA, etc.]
- **Data Retention**: [Data retention policies]
- **Audit Logging**: [Audit requirements]
- **Privacy**: [Privacy considerations]

---

## Performance Standards

### Latency Targets
- **API Responses**: [e.g., "p95 < 200ms"]
- **Database Queries**: [e.g., "p99 < 100ms"]
- **Page Load**: [e.g., "LCP < 2.5s"]

### Scalability Targets
- **Concurrent Users**: [Target user count]
- **Data Volume**: [Expected data scale]
- **Growth Rate**: [Expected growth]

### Resource Limits
- **Memory**: [Memory limits per service/process]
- **CPU**: [CPU allocation]
- **Storage**: [Storage limits and growth]

---

## Observability

### Logging
- **Levels**: [When to use each log level]
- **Format**: [Structured logging format]
- **Sensitive Data**: [PII/secrets handling in logs]

### Metrics
- **Required Metrics**: [Key metrics to track]
- **Dashboards**: [Dashboard requirements]
- **Alerting**: [Alert thresholds and escalation]

### Tracing
- **Distributed Tracing**: [Requirements if applicable]
- **Performance Monitoring**: [APM requirements]

---

## Governance

### Constitutional Authority
- This constitution supersedes all other development practices
- All design decisions must be validated against these principles
- Violations require explicit justification and documentation

### Amendment Process
1. Propose change with clear rationale
2. Document alternatives considered
3. Assess impact on existing code
4. Require approval from [stakeholders]
5. Create migration plan if needed
6. Update version and amendment date

### Enforcement
- `/plan` command validates designs against constitution
- Code reviews verify compliance
- Complexity violations logged in decision_log.md
- Regular audits of adherence

---

## Project-Specific Guidelines

### [Domain-Specific Section 1]
[Guidelines specific to your project domain]

### [Domain-Specific Section 2]
[Additional project-specific rules]

---

## References

### Related Documents
- **System Patterns**: `.claude/system_patterns.md` - Established implementation patterns
- **Decision Log**: `.claude/decision_log.md` - Historical decisions and rationale
- **Product Context**: `.claude/product_context.md` - Product vision and goals

### External Standards
- [Link to coding standards]
- [Link to API design guidelines]
- [Link to security best practices]

---

**Note**: When creating a plan with `/plan`, the system will automatically check this constitution and require justification for any violations.
