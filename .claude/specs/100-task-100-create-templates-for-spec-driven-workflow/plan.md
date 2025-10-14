# TASK_100: Create Templates for Spec-Driven Workflow

## Purpose
Create the foundational templates needed for the spec-driven development workflow, adapted from spec-kit. These templates form the basis of the new `.claude/specs/` structure and guide users through specification, planning, task breakdown, and progress tracking.

## Status
in_progress

## Requirements
- [ ] Create `spec-template.md` for feature specifications
  - [ ] Include Socratic questioning output structure
  - [ ] Add sections: Overview, User Stories, Requirements, Constraints, Success Criteria
  - [ ] Support both technical and user-facing features
- [ ] Create `plan-template.md` for technical design
  - [ ] Include sections: Architecture, Technical Approach, Implementation Details, Risks
  - [ ] Add constitution validation checklist placeholder
  - [ ] Support incremental refinement
- [ ] Create `tasks-template.md` for task breakdown
  - [ ] Use TDD-ordered structure (tests → implementation → integration)
  - [ ] Include task metadata (status, dependencies, estimates)
  - [ ] Support hierarchical task organization
- [ ] Create `progress-template.md` for tracking
  - [ ] Include sections: Completed Tasks, Current Focus, Blockers, Notes
  - [ ] Support incremental updates throughout implementation
- [ ] Create `constitution-template.md` for project guardrails
  - [ ] Include sections: Code Standards, Architecture Principles, Testing Requirements, Performance Targets
  - [ ] Support optional, project-specific customization
- [ ] Create example `.metadata.json` structure
  - [ ] Define required fields: task_id, feature_name, branch, status, started
  - [ ] Define optional fields: github (issue, url), completed, notes
  - [ ] Document valid status values
- [ ] Store templates in `.claude/templates/specs/`
- [ ] Ensure templates work with existing cc-track markdown rendering
- [ ] Add inline documentation/comments to guide template usage

## Success Criteria
- All templates created and stored in correct location
- Templates include all required sections from spec-kit adapted for cc-track
- Templates are markdown-compatible and render correctly
- Metadata structure is documented with examples
- Templates support both minimal and comprehensive usage patterns
- Each template has clear inline guidance for users

## Technical Approach

### Template Location
```
.claude/
  templates/
    specs/
      spec-template.md
      plan-template.md
      tasks-template.md
      progress-template.md
      constitution-template.md
      metadata-example.json
```

### Adaptation Strategy
1. Start with spec-kit templates as base
2. Adapt language and structure for cc-track context
3. Add cc-track-specific elements (git branch references, GitHub issue links)
4. Simplify where spec-kit is over-engineered for typical use cases
5. Add inline comments/guidance for optional sections

### Key Differences from spec-kit
- **spec.md**: Add explicit Success Criteria section, simplify User Stories format
- **plan.md**: Add constitution validation checklist, integrate with cc-track's existing planning style
- **tasks.md**: Emphasize TDD ordering, add status tracking per task
- **progress.md**: New template (not in spec-kit) for ongoing updates during implementation
- **constitution.md**: Adapt from spec-kit's project-level guidance, make clearly optional

### Metadata Structure
```json
{
  "task_id": "001",
  "feature_name": "descriptive-name",
  "branch": "001-descriptive-name",
  "status": "in_progress",
  "started": "2025-01-14T10:30:00Z",
  "github": {
    "issue": 123,
    "url": "https://github.com/owner/repo/issues/123"
  },
  "completed": "2025-01-15T14:20:00Z",
  "notes": "Optional implementation notes"
}
```

Valid status values: `planning`, `in_progress`, `blocked`, `completed`

## Current Focus
Finalizing constitution template structure and determining its optional role in the workflow alongside existing context files (system_patterns.md, decision_log.md).

## Recent Progress
- **2025-10-14**: Brainstorming session to define workflow architecture
  - Reviewed spec-kit codebase structure and templates (spec.md, plan.md, tasks.md)
  - Reviewed spec-kit's command prompts (/specify, /clarify, /plan, /tasks)
  - **Decision**: Adopt full spec-plan-task three-part flow from spec-kit
  - **Decision**: Constitution will be optional, stored alongside other context files
  - Clarified that constitution provides prescriptive constraints vs descriptive patterns (system_patterns.md) or historical records (decision_log.md)
  - Confirmed cc-track will wrap spec-kit prompts with git/github management, hooks, validation, and tracking
  - Determined constitution template should include: Technical Constraints, Quality Standards, Architectural Guardrails
  - Refined constitution design: will be imported by CLAUDE.md, explicitly checked during `/plan`, serves as pre-emptive guardrails
  - Distinguished constitution role from existing context files:
    - system_patterns.md = descriptive patterns ("Here's how we do X")
    - decision_log.md = historical record ("We decided Y because Z")
    - constitution.md = prescriptive constraints ("You MUST NOT do X unless justified")
  - Constitution will complement rather than replace existing context files
  - User projects (non-meta) will have their own constitution specific to that project's needs
  - Clarified that constitution serves as pre-emptive guardrails with explicit validation checklist during `/plan`
  - Confirmed constitution template structure: Technical Constraints, Quality Standards, Architectural Guardrails
  - **Decision**: Constitution will be optional context file, imported by CLAUDE.md like other context files
  - Templates can be used minimally (skip constitution) or comprehensively (use all guardrails)
  - Constitution enables users to specify prescriptive constraints (e.g., "no more than 3 services," "avoid pattern X unless justified")
  - Existing context files (system_patterns.md, decision_log.md, product_context) already cover much of constitution's purpose for many projects

## Next Steps
1. Review spec-kit templates for structure and content
2. Create each template file in `.claude/templates/specs/`
3. Add inline documentation and usage guidance
4. Create metadata example with documentation
5. Test template rendering in markdown viewers
6. Validate templates work with cc-track's existing command structure

## Dependencies
- Requires understanding of spec-kit template structure
- Will be used by: `/specify`, `/clarify`, `/plan`, `/tasks`, `/constitution` commands
- Blocks: All Phase 2 tasks (cannot implement commands without templates)

## Notes
- Keep templates simple and practical; avoid over-engineering
- Templates should work well for both small and large features
- Constitution should be clearly optional (not all projects need it)
- Progress template is a cc-track innovation, not from spec-kit
- Metadata structure must support future GitHub integration enhancements

<!-- github_issue: 145 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/145 -->
<!-- issue_branch: 145-task_100-create-templates-for-spec-driven-workflow -->