# CC-Track Spec-Driven Development Workflow

**Created:** 2025-01-14
**Status:** Design Complete - Ready for Implementation

## Overview

Transform cc-track from hook-based task capture to a structured spec-driven development workflow inspired by spec-kit, while maintaining cc-track's strengths in git/GitHub management, validation, and developer experience.

### Core Workflow

```
User starts → /specify (questions → branch + spec) →
/clarify (refine spec) → /plan (technical design) →
/tasks (breakdown) → Implementation → /complete-task
```

Each command ends by suggesting the next step, with Claude Code's command execution handling the flow naturally.

---

## Architecture Changes

### 1. Directory Structure

**New structure:**
```
.claude/
├── specs/
│   └── 001-feature-name/
│       ├── .metadata.json          # Branch, issue, status tracking
│       ├── spec.md                 # Tech-agnostic requirements
│       ├── plan.md                 # Technical design
│       ├── tasks.md                # Implementation breakdown
│       ├── progress.md             # What we actually built
│       ├── contracts/              # API specs (if applicable)
│       ├── data-model.md           # Entity designs (if applicable)
│       ├── quickstart.md           # Getting started (if applicable)
│       └── research.md             # Research notes (if applicable)
├── constitution.md                 # Optional project guardrails
├── product_context.md              # Existing
├── system_patterns.md              # Existing
├── decision_log.md                 # Existing
├── user_context.md                 # Existing
└── backlog.md                      # Existing
```

**CLAUDE.md active task reference:**
```markdown
## Active Task
@.claude/specs/001-feature-name/spec.md
```

**Metadata file (`.metadata.json`):**
```json
{
  "task_id": "001",
  "feature_name": "photo-albums",
  "branch": "001-photo-albums",
  "github": {
    "issue": 123,
    "url": "https://github.com/user/repo/issues/123"
  },
  "status": "in_progress",
  "started": "2025-01-14T10:30:00Z"
}
```

---

### 2. New Commands

#### `/specify` Command
**Purpose:** Initial spec creation with Socratic questioning

**Flow:**
1. **Gather information** (Socratic questioning phase):
   - Ask clarifying questions about the feature
   - Build understanding of what user wants
   - Extract key concepts, actors, actions
   - NO artifacts created yet

2. **Create branch + spec** (once enough info):
   - Generate feature ID (001, 002, etc.)
   - Create branch: `001-feature-name` (Claude does git directly)
   - Create directory: `.claude/specs/001-feature-name/`
   - Generate spec.md from template
   - Mark ambiguities with `[NEEDS CLARIFICATION: question]`
   - Create `.metadata.json`

3. **GitHub integration** (if enabled):
   - Create issue with spec content
   - Link issue to branch
   - Update metadata

4. **Update CLAUDE.md:**
   - Point active task to spec.md

5. **Prompt next step:**
   - "Spec created. Ready to run `/clarify` to refine requirements?"

**Template:** Adapt from `spec-kit/templates/spec-template.md`

---

#### `/clarify` Command
**Purpose:** Structured refinement using forced clarification markers

**Flow:**
1. Load spec.md from active task
2. Scan for `[NEEDS CLARIFICATION: ...]` markers
3. Scan for ambiguous/underspecified areas using taxonomy:
   - Functional scope & behavior
   - Domain & data model
   - Interaction & UX flow
   - Non-functional attributes (performance, security, etc.)
   - Integration & dependencies
   - Edge cases & failure handling
   - Constraints & tradeoffs

4. **Sequential questioning** (max 5 questions):
   - Present ONE question at a time
   - Multiple choice format where possible
   - Short answer (≤5 words) otherwise
   - After each answer: integrate immediately into spec
   - Save spec.md after each integration

5. **Integration approach:**
   - Add `## Clarifications` section with session timestamp
   - Record: `- Q: [question] → A: [answer]`
   - Update relevant sections (FR, entities, edge cases, etc.)
   - Remove/replace ambiguous statements

6. **Prompt next step:**
   - "Clarifications complete. Ready to run `/plan` for technical design?"

**Template:** Adapt from `spec-kit/templates/commands/clarify.md`

---

#### `/plan` Command
**Purpose:** Generate technical design with chosen tech stack

**Flow:**
1. Load spec.md from active task
2. Check for remaining `[NEEDS CLARIFICATION]` markers
   - If any: ERROR "Resolve unknowns with `/clarify` first"

3. **Constitution check** (if constitution.md exists):
   - Validate against project guardrails
   - Document any violations in plan.md
   - Require justification for violations

4. **Phase 0 - Research** (creates research.md):
   - Research tech stack best practices
   - Evaluate integration patterns
   - Document decisions with rationale

5. **Phase 1 - Design** (creates multiple files):
   - Generate data-model.md from spec entities
   - Generate contracts/ (API specs) from requirements
   - Generate quickstart.md from user stories
   - Create plan.md with full technical approach

6. **Re-check constitution** (if applicable):
   - Validate design against guardrails
   - Refactor if violations without justification

7. **Prompt next step:**
   - "Technical plan complete. Ready to run `/tasks` to generate breakdown?"

**Template:** Adapt from `spec-kit/templates/plan-template.md`

---

#### `/tasks` Command
**Purpose:** Generate actionable task breakdown

**Flow:**
1. Load plan.md and related files
2. Generate tasks.md following TDD order:
   - Contract tests (parallel)
   - Model creation (parallel)
   - Integration tests
   - Implementation tasks

3. Mark parallelizable tasks with `[P]`
4. Number tasks sequentially
5. Save tasks.md

6. **Prompt for implementation:**
   - "Task breakdown complete. Should I begin implementation?"
   - User says "yes" or "implement" → Claude starts work
   - No explicit command needed

**Template:** Adapt from `spec-kit/templates/tasks-template.md`

---

#### `/constitution` Command
**Purpose:** Create or update project constitution

**Flow:**
1. Check if `.claude/constitution.md` exists
2. If not: Create from template with user input
3. If yes: Update based on user request
4. Structure:
   - Technical constraints
   - Quality standards
   - Architectural guardrails
   - Complexity budgets

**Template:** New template based on spec-kit's constitution pattern

---

### 3. Adapted Commands

#### `/prepare-completion` (adapted)
**Changes:**
- Pass entire `specs/001-feature-name/` folder to code reviewer
- Validation checks remain the same
- Dynamic instructions for fixes

#### `/complete-task` (adapted)
**Changes:**
- Read metadata from `.metadata.json`
- Claude drafts PR description based on session knowledge
- Reference spec in PR body
- Squash commits, create PR, switch to main (existing logic)
- Update metadata status to "completed"

#### `/add-to-backlog` (unchanged)
- Works as-is

#### `/view-logs` (unchanged)
- Works as-is

---

### 4. Hook Changes

#### Deprecate (remove):
- ❌ `capture-plan` hook (replaced by command flow)
- ❌ `pre-compact` hook (had issues, not needed)
- ❌ `stop-review` hook (had issues, disable for now)

#### Keep and adapt:
- ✅ `edit-validation` - Works as-is
- ✅ `pre-tool-validation` - Update to protect `specs/` directory:
  ```typescript
  // Block edits to specs/ files when not on feature branch
  if (toolName === 'Edit' || toolName === 'Write') {
    if (filePath.includes('.claude/specs/') && !onFeatureBranch) {
      return { behavior: 'deny', message: '...' };
    }
  }
  ```

---

### 5. Templates

**New templates (adapt from spec-kit):**
1. `templates/spec-template.md` - Feature specification
2. `templates/plan-template.md` - Implementation plan
3. `templates/tasks-template.md` - Task breakdown
4. `templates/constitution-template.md` - Project guardrails
5. `templates/progress-template.md` - Progress tracking

**Approach:** Start with spec-kit templates largely intact, iterate based on usage (Option C from design discussion)

---

### 6. Migration

#### `/migrate` Command
**Purpose:** Convert old cc-track structure to new spec-driven structure

**Flow:**
1. **Scan for old tasks:**
   - Find all `.claude/tasks/TASK_*.md` files

2. **For each old task:**
   - Extract task ID (e.g., "001")
   - Generate feature name from title
   - Create `specs/001-feature-name/` directory

3. **File conversion:**
   - Old `tasks/TASK_001.md` → `specs/001-feature/plan.md`
   - Create placeholder `spec.md` (user-facing summary)
   - Create placeholder `tasks.md` (empty or extract if structured)
   - Create `.metadata.json` from HTML comments in old file

4. **Constitution creation:**
   - If `.claude/constitution.md` doesn't exist
   - Prompt user to create or use default template

5. **Backup:**
   - Move old tasks to `.claude/tasks.backup/`
   - Document migration in decision log

6. **Update CLAUDE.md:**
   - Update active task reference if applicable

**Implementation notes:**
- No AI needed - simple file operations
- Preserve all original content
- User can manually refine after migration

---

### 7. Init Flow Update

Update `/setup-cc-track` (or init templates):

1. Create directory structure
2. **Add constitution creation:**
   - Prompt: "Would you like to create a project constitution?"
   - If yes: Run `/constitution` flow
   - If no: Skip (can add later)
3. Copy templates
4. Configure hooks
5. Set up git/GitHub integration

---

## Implementation Task Breakdown

### Phase 1: Foundation (3-5 tasks)
1. Create new templates (spec, plan, tasks, constitution, progress)
2. Update directory structure and metadata handling
3. Create `/migrate` command for existing users

### Phase 2: Core Commands (4 tasks)
4. Implement `/specify` command (Socratic → branch → spec)
5. Implement `/clarify` command (structured refinement)
6. Implement `/plan` command (technical design)
7. Implement `/tasks` command (task breakdown)

### Phase 3: Integration (3 tasks)
8. Implement `/constitution` command
9. Adapt `/complete-task` for new structure
10. Adapt `/prepare-completion` (pass folder to reviewer)

### Phase 4: Hooks & Cleanup (2 tasks)
11. Update `pre-tool-validation` to protect specs/ directory
12. Remove deprecated hooks (capture-plan, pre-compact, stop-review)

### Phase 5: Init & Documentation (2 tasks)
13. Update init flow with constitution creation
14. Update documentation (workflow guide, decision log, etc.)

---

## Testing Strategy

For each command:
- Unit tests for core logic
- Integration tests for git operations
- Test with both GitHub enabled and disabled
- Test migration from old structure
- Test constitution checks in `/plan`

---

## Rollout Plan

1. **Development:** Implement on feature branch
2. **Self-dogfooding:** Use new flow to build new cc-track features
3. **Migration:** Run `/migrate` on cc-track itself
4. **Documentation:** Update all context files
5. **Release:** Semantic release with breaking change notice

---

## Key Design Decisions

### Why separate spec/plan/tasks?
- **Spec** = user-facing requirements (what/why) → persists across implementations
- **Plan** = technical approach (how) → can change with tech stack
- **Tasks** = implementation breakdown → specific to current implementation

### Why deprecate hooks instead of adapt?
- `capture-plan`: Workflow now driven by commands, not hook events
- `pre-compact`: Had reliability issues, not needed with new structure
- `stop-review`: Had reliability issues, validation happens at `/prepare-completion`

### Why Claude does git directly?
- More flexible than scripts
- Better error handling and user feedback
- Simpler command implementation
- Claude Code's git capabilities are reliable

### Why hidden metadata file?
- Keeps directory clean
- Easy to parse/update programmatically
- Doesn't clutter user-facing documentation

---

## Migration from Old Structure

### For existing cc-track users:
1. Run `/migrate` command
2. Old tasks backed up to `.claude/tasks.backup/`
3. Old task files converted to plan.md in new structure
4. Placeholder spec.md and tasks.md created
5. Metadata extracted from HTML comments
6. Can continue working immediately with new flow

### For active tasks during migration:
- If active task exists, migration preserves it
- User can finish old-style task or migrate manually
- Next task uses new flow automatically

---

## Success Criteria

### User Experience:
- [ ] Natural flow between commands with clear prompts
- [ ] Forced clarification reduces implementation rework
- [ ] Constitution checks catch complexity early
- [ ] Migration is seamless for existing users

### Technical:
- [ ] All tests passing
- [ ] No regression in existing features
- [ ] Git/GitHub integration works correctly
- [ ] Validation hooks protect new structure

### Documentation:
- [ ] Workflow guide updated
- [ ] Decision log documents changes
- [ ] Migration guide for users
- [ ] Templates are clear and actionable
