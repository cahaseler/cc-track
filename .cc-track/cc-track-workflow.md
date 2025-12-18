# cc-track Workflow Guide

**Purpose:** Quick reference for the cc-track spec-driven development workflow, from planning to completion.

## Workflow Overview

The cc-track system follows a structured, command-driven workflow that separates requirements from implementation:

```
/cc-track:specify → /cc-track:plan → /cc-track:tasks → Implementation → /cc-track:prepare-completion → [/cc-track:fix-issues] → /cc-track:complete-task → PR → Merge
```

Note: `/cc-track:fix-issues` is automatically invoked by `prepare-completion` when >1 issues are found.

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
.cc-track/specs/001-feature-name/
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

### Complexity-Aware Commands

Both `/cc-track:specify` and `/cc-track:plan` now assess complexity before proceeding, mirroring Claude Code's plan mode behavior:

**Simple tasks** (bounded scope, clear patterns, no architectural decisions):
- Commands proceed directly
- "This is straightforward. Proceeding to [next phase]."

**Complex tasks** (integration needed, architectural decisions, unfamiliar domain):
- `/cc-track:specify` spawns Explore agents to research codebase patterns before spec creation
- `/cc-track:plan` generates 2-3 alternative designs before committing to an approach
- User approves direction before full artifact creation

This discretionary approach means simple features don't waste time on exploration, while complex features benefit from informed, multi-perspective analysis.

---

## Command Flow

### 1. `/cc-track:specify` - Create Initial Specification

**Purpose:** Gather requirements through Socratic questioning and create initial spec

**What happens:**
1. Claude asks clarifying questions about the feature (Purpose, Scope, Users)
2. **Complexity assessment** after initial questions:
   - If simple: Proceeds directly to more questions
   - If complex: Spawns Explore agents to research codebase patterns first
3. Builds understanding through conversation, informed by any exploration results
4. Once enough information is gathered:
   - Generates feature ID (001, 002, etc.)
   - Creates git branch: `001-feature-name`
   - Creates spec directory: `.cc-track/specs/001-feature-name/`
   - Generates `spec.md` with requirements
   - Marks ambiguities with `[NEEDS CLARIFICATION: question]`
   - Creates `.metadata.json` with tracking info
4. Updates `CLAUDE.md` to point to new spec
5. Creates GitHub issue (if integration enabled)

**Result:** Complete specification with all ambiguities resolved

**Next step:** "Spec complete. Ready to run `/cc-track:plan` for technical design?"

---

### 2. `/cc-track:plan` - Create Technical Design

**Purpose:** Generate technical implementation plan based on refined spec

**What happens:**
1. Loads spec.md from active task
2. **Complexity assessment**:
   - If simple: Proceeds directly to constitution check
   - If complex: Generates 2-3 alternative design approaches, presents to user for approval
3. Constitution check (if `.cc-track/constitution.md` exists):
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

**Next step:** "Technical plan complete. Ready to run `/cc-track:tasks` to generate breakdown?"

---

### 3. `/cc-track:tasks` - Generate Task Breakdown

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

### 4. Implementation Phase

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

### 5. `/cc-track:prepare-completion` - Validate Before Completion

**Purpose:** Run all quality checks and prepare for task completion

**What happens:**
1. Invokes the `cc-track:cc-track-tools` skill to get script paths
2. Runs the `prepare-completion.ts` script which:
   - TypeScript type checking
   - Biome linting
   - Test suite execution
   - Knip dead code detection
3. Provides dynamic instructions for any failures
4. Reminds about documentation updates:
   - Update progress.md with final state
   - Add to decision_log.md for architectural choices
   - Update system_patterns.md for new conventions
   - Journal reflections on learnings
5. Passes entire spec folder to code reviewer for feedback

**Result:** Clear pass/fail with specific fix instructions

**Routing based on issue count:**
- **0 issues:** "Ready for completion" - proceed to `/cc-track:complete-task`
- **1 issue:** Presented inline for quick decision
- **>1 issues:** Automatically invokes `/cc-track:fix-issues` for structured triage

**Next step:** Fix any issues, update docs, then run `/cc-track:complete-task`

---

### 5b. `/cc-track:fix-issues` - Triage Review Issues

**Purpose:** Walk through code review issues one-by-one with structured decision options

**When invoked:**
- Automatically by `/cc-track:prepare-completion` when >1 validated issues found
- Can be invoked directly if issues exist in conversation context

**What happens:**
1. Creates `issue-log.md` in spec folder with all issues (or updates existing)
2. Checks existing `issue-log.md` and `backlog.md` to filter already-handled issues
3. Presents each NEW issue (highest score first) with options:
   - **Fix** - Add to immediate fix list
   - **Defer** - Add to backlog for future work
   - **Dismiss** - False positive or acceptable as-is
   - **Discuss** - Investigate before deciding
4. After all issues triaged, shows action summary
5. Executes fixes in order (only after full triage complete)
6. Reminds to re-run `/cc-track:prepare-completion` to verify

**Issue-log.md location:** `.cc-track/specs/{active-spec}/issue-log.md`

**Iterative safe:** Re-running filters out already-handled issues from previous triage runs

**Result:** Documented triage decisions, fixes implemented, issue-log.md as permanent audit trail

---

### 6. `/cc-track:complete-task` - Finalize and Create PR

**Purpose:** Mark task complete, squash commits, create PR

**What happens:**
1. Invokes the `cc-track:cc-track-tools` skill to get script paths
2. Runs the `complete-task.ts` script which:
   - Final validation check
   - Reads `.metadata.json` for task info
   - Updates task status to "completed"
   - Squashes WIP commits into single feat commit
   - Pushes branch and creates PR on GitHub
   - Switches back to main branch
3. Claude enhances PR description from:
   - spec.md requirements
   - plan.md implementation approach
   - progress.md actual changes
   - Test results

**Result:** Task marked complete, PR ready for review

---

### 7. Pull Request Review & Merge

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

### `/cc-track:migrate` - Convert Old Structure

**Purpose:** One-time migration from old cc-track task structure

**What happens:**
1. Scans for old `.claude/tasks/TASK_*.md` files
2. For each task:
   - Creates new spec directory
   - Converts task file to plan.md
   - Creates placeholder spec.md
   - Extracts metadata from HTML comments
3. Backs up old files to `.claude/tasks.backup/`
4. Updates CLAUDE.md references to `.cc-track/specs/`

**When to use:** First time using new spec-driven workflow

---

### `/cc-track:constitution` - Set Project Guardrails

**Purpose:** Create or update project constitution

**What happens:**
1. If constitution doesn't exist: Creates from template
2. Prompts for:
   - Technical constraints
   - Quality standards
   - Architectural guardrails
   - Complexity budgets
3. Saves to `.cc-track/constitution.md`

**Effect:** `/cc-track:plan` command validates designs against constitution

---

### `/cc-track:add-to-backlog` - Capture Ideas

**Purpose:** Add future ideas without disrupting current work

**What happens:**
- Executes inline bash to append timestamped idea to `.cc-track/backlog.md`
- Minimal disruption - no file reads or multi-step process

**When to use:** Mid-implementation when inspiration strikes

---

### `/cc-track:view-logs` - Debug Hooks and Commands

**Purpose:** View centralized logs for debugging

**What happens:**
1. Displays logs from platform-specific location:
   - Linux/WSL: `~/.local/share/cc-track/logs/`
   - macOS: `~/Library/Logs/cc-track/`
   - Windows: `%LOCALAPPDATA%\cc-track\logs\`
2. Filters by component, level, time range

**When to use:** Debugging hook failures or command issues

---

### `/cc-track:context-maintenance` - Clean Up Context Files

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

**`/cc-track:prepare-completion`:**
- Comprehensive validation suite
- TypeScript, Biome, tests, Knip
- Code review feedback from AI reviewer
- Must pass before `/cc-track:complete-task`

---

## Migration from Old System

### What Changed

**Old system (hook-based):**
- `capture-plan` hook auto-created tasks on ExitPlanMode
- Tasks stored in `.claude/tasks/TASK_XXX.md`
- `stop-review` hook auto-committed with reviews
- Single task file combined spec + plan + progress

**New system (command-driven):**
- `/cc-track:specify` → `/cc-track:plan` → `/cc-track:tasks` explicit flow
- Tasks in `.cc-track/specs/NNN-feature-name/` with separate files
- No auto-commits - developer controls git workflow
- Clear separation: spec.md (requirements) vs plan.md (design) vs progress.md (what happened)

### For Existing Users

1. Run `/cc-track:migrate` to convert old tasks
2. Old files backed up to `.claude/tasks.backup/`
3. Continue with new workflow for next task
4. Previous work preserved, just restructured in `.cc-track/specs/`

---

## What This Means for Claude

When working in a cc-track project:

1. **Recognize the workflow stage** - Are we specifying, planning, or implementing?
2. **Follow the command flow** - Each command prompts for the next step
3. **Respect the separation** - Don't put technical details in spec.md or requirements in plan.md
4. **Resolve ambiguities first** - Ask questions until spec is complete before creating artifacts
5. **Update as you learn** - spec/plan/tasks can evolve during implementation
6. **Trust the validation** - Hooks and commands enforce quality and workflow

The system ensures:
- Requirements are clear before implementation begins
- Technical design is validated against project guardrails
- Code quality is enforced at every edit
- Documentation stays synchronized with implementation
- Git workflow follows best practices
