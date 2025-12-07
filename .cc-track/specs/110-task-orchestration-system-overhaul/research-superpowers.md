# Superpowers Plugin Research

## Executive Summary

Jesse's **Superpowers** plugin for Claude Code provides a comprehensive **skill-based workflow system** that orchestrates feature development through composable skills. It uses a **two-track orchestration model** for parallel vs sequential execution, with strong emphasis on TDD, code review gates, and subagent coordination.

Key insights for cc-track's task orchestration overhaul:
- **Two-track model**: Subagent-driven (same session, fast) vs Executing Plans (batched, human checkpoints)
- **Parallel dispatch**: For 3+ independent problem domains with no shared state
- **Code review between tasks**: Quality gates after each task, not just at the end
- **Bite-sized granularity**: 2-5 minutes per task step with TDD structure
- **Fresh context per task**: Subagent-driven spawns new agent per task (no context pollution)

---

## 1. Superpowers Approach to Parallel Subagent Orchestration

### Two-Track Orchestration Model

**Track 1: Subagent-Driven Development (Same Session)**
- Dispatches fresh subagent per task
- Code review between each task
- Sequential but with quality gates
- No context pollution (fresh agent per task)
- Fast iteration - no human-in-loop between tasks

**Track 2: Parallel Session Execution**
- User opens new session with executing-plans skill
- Batches of 3+ tasks executed
- Review checkpoints between batches
- Human validates before next batch
- Slower overall but with strategic review points

**For Independent Parallel Problems (3+ failures)**:
- dispatching-parallel-agents skill
- One agent per independent problem domain
- No shared state between agents
- Concurrent execution with post-integration verification

---

## 2. The Planning Skill Output

The `writing-plans` skill produces detailed implementation plans with:

### Structure

```markdown
# [Feature Name] Implementation Plan
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans

**Goal:** Single sentence
**Architecture:** 2-3 sentences
**Tech Stack:** Key technologies

### Task N: [Component Name]
**Files:**
- Create: exact/path
- Modify: exact/path:123-145
- Test: exact/path

**Step 1: Write the failing test**
[Complete test code]

**Step 2: Run test to verify it fails**
[Command with expected output]

**Step 3: Write minimal implementation**
[Minimal code to pass]

**Step 4: Run test to verify it passes**
[Command with expected output]

**Step 5: Commit**
[Git commands]
```

### Key Characteristics
- Bite-sized tasks: 2-5 minutes each
- Every step is atomic (write test, run test, implement, run test, commit)
- Exact file paths, complete code examples
- Expected output specified for verification
- TDD-first approach enforced
- Assumes engineer has zero codebase context

---

## 3. Orchestration Skills and Coordination

### Core Orchestration Skills

1. **brainstorming** - Design refinement (Socratic method)
   - Ask questions one-at-a-time
   - Explore 2-3 alternatives with trade-offs
   - Present design in 200-300 word sections
   - Validate incrementally
   - Output: design.md document

2. **writing-plans** - Task breakdown
   - Input: Design document
   - Output: `docs/plans/YYYY-MM-DD-feature.md`
   - Each task includes exact file paths, complete code
   - Bite-sized steps (2-5 min each)
   - Frequent commits enforced

3. **subagent-driven-development** - Execution orchestration (same session)
   - Dispatch fresh subagent per task
   - Run code-reviewer subagent after each task
   - Fix critical issues immediately
   - Fix important issues before next task
   - Final code-reviewer after all tasks
   - Transition to finishing-a-development-branch

4. **executing-plans** - Batch execution (parallel session)
   - Load and critically review plan first
   - Execute first 3 tasks in batch
   - Report results, wait for feedback
   - Apply changes, execute next batch
   - Repeat until complete
   - Transition to finishing-a-development-branch

5. **dispatching-parallel-agents** - Parallel independent work
   - Group failures by independent domains
   - One agent per domain
   - Agents cannot interfere with each other
   - Run concurrently
   - Integrate results after all complete

6. **requesting-code-review** - Quality gates
   - Review after each task (subagent-driven)
   - Review after each batch (executing-plans)
   - Dispatch code-reviewer subagent
   - Categorize issues: Critical/Important/Minor
   - Fix blocking issues immediately

7. **finishing-a-development-branch** - Completion
   - Verify tests pass
   - Present 4 options: merge locally, PR, keep, discard
   - Execute chosen option
   - Cleanup worktree (for options 1 & 4)

### Supporting Skills

- **using-git-worktrees** - Isolated workspace creation with safety verification
- **test-driven-development** - RED-GREEN-REFACTOR cycle enforcement
- **condition-based-waiting** - Async operation handling in tests
- **verification-before-completion** - Evidence-based completion claims
- **receiving-code-review** - Technical evaluation vs performative agreement
- **systematic-debugging** - Root cause investigation before fixes
- **root-cause-tracing** - Backward call stack tracing
- **defense-in-depth** - Multiple validation layers

---

## 4. Task Breakdown for Parallel Execution

### The TDD-Based Breakdown

Each task follows this structure:
```
1. Write failing test
2. Verify test fails correctly
3. Write minimal code to pass
4. Verify test passes + other tests still pass
5. Commit (if task complete)
```

### Parallelization Strategy

Tasks are identified as:
- `[P]` - Parallelizable (independent of other tasks)
- Sequential - Depends on prior task completion

**Example Breakdown Structure:**
```
Task 1: Write contract tests - [P]
Task 2: Create data model - [P]
Task 3: Implementation A - depends on Task 2
Task 4: Implementation B - depends on Task 2
Task 5: Integration tests - depends on Tasks 3 & 4
```

Parallelizable tasks (1-2) execute concurrently, sequential tasks wait for dependencies.

---

## 5. Main Agent to Subagent Coordination

### Orchestrator (Main Agent) Responsibilities

1. **Plan Validation** - Critically review plan before execution
   - Identify questions or concerns
   - Raise concerns with human before starting
   - Ensure clarity before delegating

2. **Task Dispatch** - Send focused task to subagent
   ```
   Task tool (general-purpose):
     description: "Implement Task N: [task name]"
     prompt: |
       You are implementing Task N from [plan-file].
       Read that task carefully. Your job is to:
       1. Implement exactly what the task specifies
       2. Write tests (following TDD if task says to)
       3. Verify implementation works
       4. Commit your work
       5. Report back

       Work from: [directory]
       Report: What you implemented, what you tested, test results, files changed, any issues
   ```

3. **Review Coordination** - Dispatch code-reviewer subagent
   ```
   Task tool (superpowers:code-reviewer):
     WHAT_WAS_IMPLEMENTED: [from subagent's report]
     PLAN_OR_REQUIREMENTS: Task N from [plan-file]
     BASE_SHA: [commit before task]
     HEAD_SHA: [current commit]
     DESCRIPTION: [task summary]
   ```

4. **Feedback Loop** - Fix issues before proceeding
   - Critical issues → Fix immediately, dispatch fix subagent
   - Important issues → Fix before next task
   - Minor issues → Note for later
   - Pass feedback to subagent with specific instructions

5. **Task Completion** - Update tracking and proceed
   - Mark task as completed in TodoWrite
   - Move to next task
   - Repeat task dispatch → review → fix cycle

6. **Final Review** - After all tasks complete
   - Dispatch final code-reviewer
   - Reviews entire implementation
   - Checks all plan requirements met
   - Validates overall architecture

### Code Reviewer Agent

Defined in `agents/code-reviewer.md`, performs:
- Plan alignment analysis (compare implementation vs plan)
- Code quality assessment (patterns, error handling, type safety)
- Architecture review (SOLID, separation of concerns)
- Documentation verification
- Issue categorization (Critical/Important/Minor)
- Clear verdict (Ready/With Fixes/Major Rework Needed)

---

## 6. TDD and Validation Patterns

### Strict TDD Enforcement

**The Iron Law:** NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
- Write test first
- Watch it fail (mandatory verification)
- Implement minimal code to pass
- Watch it pass (mandatory verification)
- Refactor while staying green
- Delete all code written before tests

### Red-Green-Refactor Cycle

```
RED: Write one minimal test showing what should happen
  → Verify RED: Watch test fail correctly
GREEN: Write simplest code to pass test
  → Verify GREEN: Watch test pass + other tests pass
REFACTOR: Clean up (remove duplication, improve names)
  → Verify REFACTOR: Keep tests green
NEXT: Repeat for next feature
```

### Mandatory Verifications

- Every test must fail first (proves it tests something)
- Every test must pass after implementation
- All other tests must still pass
- Output must be pristine (no errors/warnings)

### Common Rationalizations Rejected

- "Too simple to test" → No, simple code breaks
- "I'll test after" → Tests after prove nothing (pass immediately)
- "Tests after achieve same goals" → No, tests-first force edge case discovery
- "Already manually tested" → Ad-hoc ≠ systematic
- "Deleting X hours is wasteful" → Sunk cost fallacy
- "TDD will slow me down" → TDD faster than debugging

---

## 7. Integration Workflow

### The Complete Superpowers Workflow

```
1. /superpowers:brainstorm
   ↓ (Design-focused Socratic dialogue)
   → docs/plans/YYYY-MM-DD-topic-design.md
   ↓
2. Using-Git-Worktrees Skill
   ↓ (Create isolated workspace)
   → .worktrees/branch-name
   ↓
3. /superpowers:write-plan
   ↓ (Create detailed task breakdown)
   → docs/plans/YYYY-MM-DD-feature.md
   ↓
4. Choose Execution Strategy:

   A) Subagent-Driven (Same Session):
      Use superpowers:subagent-driven-development
      ├─ For each task:
      │  ├─ Dispatch implementation subagent
      │  ├─ Dispatch code-reviewer subagent
      │  ├─ Fix issues if needed
      │  └─ Mark task complete
      └─ Use superpowers:finishing-a-development-branch

   B) Executing Plans (Batched):
      Use superpowers:executing-plans
      ├─ Execute batch (3 tasks)
      ├─ Report results
      ├─ Get feedback
      ├─ Apply changes
      └─ Repeat until complete

   C) Parallel Investigation (Independent Failures):
      Use superpowers:dispatching-parallel-agents
      ├─ Identify independent problem domains
      ├─ Dispatch one agent per domain
      ├─ Agents work concurrently
      └─ Integrate results
   ↓
5. Finishing-a-Development-Branch
   ├─ Verify tests pass
   ├─ Present options (merge/PR/keep/discard)
   └─ Execute choice
   ↓
6. Integration Complete
```

### Key Properties of This Workflow

- **Sequential Quality Gates** - Review happens between every task (subagent-driven) or batch (executing-plans)
- **Fresh Context Per Task** - Subagent-driven spawns new agent per task (no context pollution)
- **TDD Enforcement** - Every task follows RED-GREEN-REFACTOR
- **Evidence-Based** - Verification before claims (tests must pass, not just "look right")
- **Human-Validated** - Key decisions reviewed before proceeding
- **Isolated Workspaces** - Git worktrees prevent branch conflicts
- **Automatic Cleanup** - Finishing skill handles merge/PR/discard workflows

---

## 8. Key Patterns for cc-track

### What Superpowers Does Well

1. **Two-track execution model** - Fast (subagent-driven) vs controlled (batched)
2. **Code review between tasks** - Quality gates at every step
3. **Fresh context per task** - No context pollution across tasks
4. **Explicit parallelization criteria** - Only for truly independent domains
5. **TDD enforcement** - Mandatory verification at each stage
6. **Evidence-based completion** - Must prove it works, not claim it works
7. **Clean workflow composition** - Skills chain naturally

### Gaps for cc-track Context

1. **Background agents**: Superpowers doesn't use Claude Code's new background agent feature
2. **Orchestrator blocking**: Main agent waits for each subagent sequentially
3. **Opus 4.5 leverage**: No specific optimization for Opus as orchestrator

### Recommended Patterns for cc-track

1. **Adopt two-track model** - Fast path (background subagents) vs controlled path (batched with review)
2. **Code review gates** - Between tasks, not just at end
3. **Background agent integration** - Use Claude Code's new run_in_background feature
4. **Subagent dispatch template** - Clear structure for task handoff
5. **Issue severity categorization** - Critical/Important/Minor for prioritized fixes
6. **Verification-before-completion** - Evidence required, not just claims

---

## Conclusion

Superpowers provides a **mature, production-tested skill system** for orchestrating feature development with Claude Code. The two-track model (subagent-driven vs batched execution) combined with code review gates and TDD enforcement creates a robust development workflow.

For cc-track's task orchestration overhaul, the most valuable patterns are:
1. **Fresh subagent per task** to avoid context pollution
2. **Code review gates between tasks** for continuous quality
3. **Two-track execution model** for flexibility
4. **Parallel dispatch only for truly independent work**
5. **Evidence-based verification** before marking complete
