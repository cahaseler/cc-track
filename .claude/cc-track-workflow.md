# cc-track Workflow Guide

**Purpose:** Quick reference for the cc-track spec-driven development workflow, from planning to completion.

## Workflow Overview

The cc-track system follows a structured, command-driven workflow that separates requirements from implementation:

```
/specify → /clarify → /plan → /tasks → Implementation → /prepare-completion → /complete-task → PR → Merge
```

Each command prompts for the next step, creating a natural flow through the development process.

---

## Core Concepts

### Separation of Concerns

The workflow maintains clear boundaries between different types of documentation:

- **spec.md** - User-facing requirements (what/why) → persists across implementations
- **plan.md** - Technical design (how) → can change with tech stack
- **tasks.md** - Implementation breakdown → specific to current implementation
- **progress.md** - What we actually built → living record of development

### Directory Structure

Each feature lives in its own directory:

```
.claude/specs/001-feature-name/
├── .metadata.json          # Branch, issue, status tracking
├── spec.md                 # Tech-agnostic requirements
├── plan.md                 # Technical design
├── tasks.md                # Implementation breakdown
└── progress.md             # Development progress log
```

Optional files for complex features:
- `contracts/` - API specifications
- `data-model.md` - Entity designs
- `research.md` - Research notes
- `quickstart.md` - Getting started guide

---

## Command Flow

### 1. `/specify` - Create Initial Specification

**Purpose:** Gather requirements through Socratic questioning and create initial spec

**What happens:**
1. Claude asks clarifying questions about the feature
2. Builds understanding through conversation (no artifacts yet)
3. Once enough information is gathered:
   - Generates feature ID (001, 002, etc.)
   - Creates git branch: `001-feature-name`
   - Creates spec directory: `.claude/specs/001-feature-name/`
   - Generates `spec.md` with requirements
   - Marks ambiguities with `[NEEDS CLARIFICATION: question]`
   - Creates `.metadata.json` with tracking info
4. Updates `CLAUDE.md` to point to new spec
5. Creates GitHub issue (if integration enabled)

**Result:** Initial specification with clearly marked unknowns

**Next step:** "Spec created. Ready to run `/clarify` to refine requirements?"

---

### 2. `/clarify` - Refine Requirements

**Purpose:** Systematically resolve ambiguities using structured questioning

**What happens:**
1. Loads active spec.md
2. Scans for `[NEEDS CLARIFICATION]` markers
3. Identifies underspecified areas using taxonomy:
   - Functional scope & behavior
   - Domain & data model
   - Interaction & UX flow
   - Non-functional requirements (performance, security)
   - Integration & dependencies
   - Edge cases & failure handling
   - Constraints & tradeoffs
4. Presents questions sequentially (max 5 per session):
   - ONE question at a time
   - Multiple choice format when possible
   - Short answer format otherwise
5. After each answer:
   - Integrates answer into spec immediately
   - Updates relevant sections
   - Saves spec.md

**Result:** Refined specification with resolved ambiguities

**Next step:** "Clarifications complete. Ready to run `/plan` for technical design?"

---

### 3. `/plan` - Create Technical Design

**Purpose:** Generate technical implementation plan based on refined spec

**What happens:**
1. Loads spec.md from active task
2. Checks for remaining `[NEEDS CLARIFICATION]` markers
   - If any found: ERROR "Resolve unknowns with `/clarify` first"
3. Constitution check (if `.claude/constitution.md` exists):
   - Validates design against project guardrails
   - Documents any violations with justification
4. Creates research.md (if needed):
   - Researches tech stack best practices
   - Evaluates integration patterns
   - Documents decisions with rationale
5. Creates plan.md with:
   - Technical approach
   - Architecture decisions
   - Implementation strategy
6. Creates supporting files (as applicable):
   - `data-model.md` from spec entities
   - `contracts/` from API requirements
   - `quickstart.md` from user stories

**Result:** Complete technical design aligned with constitution

**Next step:** "Technical plan complete. Ready to run `/tasks` to generate breakdown?"

---

### 4. `/tasks` - Generate Task Breakdown

**Purpose:** Create actionable task list from technical plan

**What happens:**
1. Loads plan.md and related files
2. Generates tasks.md following TDD order:
   - Contract tests (parallel)
   - Model creation (parallel)
   - Integration tests
   - Implementation tasks
3. Marks parallelizable tasks with `[P]`
4. Numbers tasks sequentially
5. Saves tasks.md

**Result:** Structured task breakdown ready for implementation

**Next step:** "Task breakdown complete. Should I begin implementation?"

---

### 5. Implementation Phase

**What happens:** Claude works through tasks from tasks.md

**Active hooks during development:**
- `edit-validation`: Real-time TypeScript/Biome validation on file edits (blocking)
- `pre-tool-validation`:
  - Branch protection (prevents edits on main/master)
  - Task file validation (prevents manual status changes)

**Work patterns:**
- Development continues across multiple sessions
- Progress tracked in progress.md
- Updates made to spec/plan/tasks as needed
- Git commits made manually or in batches

**Important:** The hooks validate code quality and enforce branch workflow, but don't auto-commit or review changes like the old system.

---

### 6. `/prepare-completion` - Validate Before Completion

**Purpose:** Run all quality checks and prepare for task completion

**What happens:**
1. Runs validation suite:
   - TypeScript type checking
   - Biome linting
   - Test suite execution
   - Knip dead code detection
2. Provides dynamic instructions for any failures
3. Reminds about documentation updates:
   - Update progress.md with final state
   - Add to decision_log.md for architectural choices
   - Update system_patterns.md for new conventions
   - Journal reflections on learnings
4. Passes entire spec folder to code reviewer for feedback

**Result:** Clear pass/fail with specific fix instructions

**Next step:** Fix any issues, update docs, then run `/complete-task`

---

### 7. `/complete-task` - Finalize and Create PR

**Purpose:** Mark task complete, squash commits, create PR

**What happens:**
1. Final validation check
2. Reads `.metadata.json` for task info
3. Updates task status to "completed"
4. Squashes WIP commits into single feat commit
5. Generates PR description from:
   - spec.md requirements
   - plan.md implementation approach
   - progress.md actual changes
   - Test results
6. Creates PR on GitHub
7. Switches back to main branch

**Result:** Task marked complete, PR ready for review

---

### 8. Pull Request Review & Merge

**Manual step:** User reviews and merges PR on GitHub

**After merge:**
- Pull latest changes to main branch
- Semantic release (if configured) automatically:
  - Determines version bump from commit messages
  - Generates changelog
  - Creates GitHub release
  - Publishes to npm (if configured)

---

## Supporting Commands

### `/migrate` - Convert Old Structure

**Purpose:** One-time migration from old cc-track task structure

**What happens:**
1. Scans for old `.claude/tasks/TASK_*.md` files
2. For each task:
   - Creates new spec directory
   - Converts task file to plan.md
   - Creates placeholder spec.md
   - Extracts metadata from HTML comments
3. Backs up old files to `.claude/tasks.backup/`
4. Updates CLAUDE.md references

**When to use:** First time using new spec-driven workflow

---

### `/constitution` - Set Project Guardrails

**Purpose:** Create or update project constitution

**What happens:**
1. If constitution doesn't exist: Creates from template
2. Prompts for:
   - Technical constraints
   - Quality standards
   - Architectural guardrails
   - Complexity budgets
3. Saves to `.claude/constitution.md`

**Effect:** `/plan` command validates designs against constitution

---

### `/add-to-backlog` - Capture Ideas

**Purpose:** Add future ideas without disrupting current work

**What happens:**
1. Appends idea to `.claude/backlog.md` with timestamp
2. No task creation or context switch

**When to use:** Mid-implementation when inspiration strikes

---

### `/view-logs` - Debug Hooks and Commands

**Purpose:** View centralized logs for debugging

**What happens:**
1. Displays logs from `~/.local/share/cc-track/logs/`
2. Filters by component, level, time range

**When to use:** Debugging hook failures or command issues

---

### `/context-maintenance` - Clean Up Context Files

**Purpose:** Reduce bloat in context files through structured cleanup guidance

**What happens:**
1. Provides file-by-file instructions for cleaning system_patterns.md, decision_log.md, progress_log.md, and other context files
2. Offers explicit rules for common bloat (duplicates, outdated refs, verbose logs)
3. Includes judgment principles for edge cases

**When to use:** When context files feel bloated, Update Logs are growing long, or token usage is increasing without proportional value

---

## Quality Enforcement

### Validation Hooks (Always Active)

**edit-validation (PostToolUse):**
- Runs TypeScript and Biome checks after every file edit
- BLOCKS if errors found - must fix to proceed
- Ensures code quality at every step

**pre-tool-validation (PreToolUse):**
- Branch protection: Prevents edits on main/master branches
- Task validation: Prevents manual status changes in metadata
- Guides to correct workflow if violations attempted

### Validation Commands (Manual Trigger)

**`/prepare-completion`:**
- Comprehensive validation suite
- TypeScript, Biome, tests, Knip
- Code review feedback from AI reviewer
- Must pass before `/complete-task`

---

## Migration from Old System

### What Changed

**Old system (hook-based):**
- `capture-plan` hook auto-created tasks on ExitPlanMode
- Tasks stored in `.claude/tasks/TASK_XXX.md`
- `stop-review` hook auto-committed with reviews
- Single task file combined spec + plan + progress

**New system (command-driven):**
- `/specify` → `/clarify` → `/plan` → `/tasks` explicit flow
- Tasks in `.claude/specs/NNN-feature-name/` with separate files
- No auto-commits - developer controls git workflow
- Clear separation: spec.md (requirements) vs plan.md (design) vs progress.md (what happened)

### For Existing Users

1. Run `/migrate` to convert old tasks
2. Old files backed up to `.claude/tasks.backup/`
3. Continue with new workflow for next task
4. Previous work preserved, just restructured

---

## What This Means for Claude

When working in a cc-track project:

1. **Recognize the workflow stage** - Are we specifying, clarifying, planning, or implementing?
2. **Follow the command flow** - Each command prompts for the next step
3. **Respect the separation** - Don't put technical details in spec.md or requirements in plan.md
4. **Mark unknowns** - Use `[NEEDS CLARIFICATION: question]` in spec.md when uncertain
5. **Update as you learn** - spec/plan/tasks can evolve during implementation
6. **Trust the validation** - Hooks and commands enforce quality and workflow

The system ensures:
- Requirements are clear before implementation begins
- Technical design is validated against project guardrails
- Code quality is enforced at every edit
- Documentation stays synchronized with implementation
- Git workflow follows best practices
