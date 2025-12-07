# AIDD Agent Orchestration Research

## Executive Summary

Eric Elliott's **SudoLang AIDD** framework provides a comprehensive system for AI-Driven Development with strong patterns for agent orchestration, TDD workflows, and task management. The framework emphasizes **specification-driven development**, **systematic task planning**, and **proper agent coordination** through SudoLang (a pseudocode language for prompting LLMs).

Key insights for cc-track's task orchestration overhaul:
- **Agent orchestrator pattern** coordinates multiple specialized agents for complex tasks
- **Task decomposition** breaks epics into small, sequential, independently-testable tasks
- **TDD discipline** enforces proper test isolation and functional requirements
- **Separation of concerns**: Specs (requirements) vs Plans (design) vs Tasks (implementation)
- **Complexity assessment** determines when to deploy specialized agent expertise
- **Pipeline composition** (asyncPipe, pipe, compose) enables clean multi-step workflows

---

## 1. Overall Architecture & Philosophy

### Core Vision: AI-Driven Development (AIDD)

AIDD is a **methodology where AI systems take primary responsibility for generating, testing, and documenting code**, automating most software creation so humans can focus on big-picture decisions.

From README:
> "SudoLang AIDD is a collection of reusable metaprograms, agent orchestration systems, and prompt modules that put high-quality software engineering processes on autopilot rails. It implements time-tested workflows including specification-driven development, systematic task planning with Test Driven Development (TDD), and automated code review with best practices enforcement."

### Three-Layer Framework

1. **Agent Orchestration Layer** (`agent-orchestrator.mdc`)
   - Central coordinator dispatching to specialized agents
   - Routes work based on task requirements
   - Manages context and multi-agent workflows

2. **Workflow Command Layer** (`ai/commands/`)
   - User-facing commands: `/discover`, `/task`, `/execute`, `/review`, `/log`, `/commit`
   - Each command references appropriate agent guides
   - Commands form a pipeline: discover → task → execute → review → log → commit

3. **Agent Rules Layer** (`ai/rules/`)
   - Specialized behavior guides for different expertise areas
   - Each rule file is a SudoLang metaprogram instructing AI behavior
   - Agents referenced: TDD, ProductManager, JavaScript, Review, Stack, etc.

### SudoLang: Pseudocode for AI Orchestration

Instead of natural language alone, AIDD uses **SudoLang** - a structured pseudocode designed to:
- Reduce token usage by 20-30% vs natural language
- Provide explicit control flow and constraints
- Enable better reasoning performance (per arxiv.org research)
- Create visual structure for complex prompts
- Reduce malformed responses through typed constraints

**Example from tdd.mdc:**
```sudolang
assert = ({
  given: string,
  should: string,
  actual: any,
  expected: any
}) {
  Tests must demonstrate locality
  Ensure that test answers these 5 questions { ... }
}

Process {
  1. Write a test. Run test runner and watch fail.
  2. Implement code to make test pass.
  3. Run tests: fail => fix bug; pass => continue
}
```

---

## 2. Agent Orchestrator Pattern

### Architecture: "Aiden" Multi-Agent System

From `agent-orchestrator.mdc`, the system defines specialized agents for different domains:

```sudolang
Agents {
  please: general assistance, logging, committing, proofing
  stack: NextJS + React/Redux + Shadcn UI tech stack guidance
  productmanager: features, user stories, discovery
  tdd: systematic test-driven development
  javascript: JS/TS best practices and guidance
  log: structured changelog documentation
  commit: conventional commit format
  autodux: Redux state management via Autodux
  ui: UI/UX design and accessibility
  requirements: functional requirement specification
}
```

### Orchestration Logic

```sudolang
handleInitialRequest() {
  use taskCreator to create and execute task plan
  match (contextRequirements = infer) {
    > 1 guide => use withCLI  // Multiple agents needed
    default => use directExecution  // Single agent sufficient
  }
}
```

**Key Pattern**: The orchestrator **infers complexity** and **dispatches to specialized agents** only when needed:
- Simple tasks: Execute directly without agent overhead
- Complex tasks (>1 agent needed): Route through CLI agent system
- Cross-domain tasks: Dispatch to multiple agents in sequence

### No Built-In Parallelization

**Important finding**: AIDD's agent orchestrator is **sequential, not parallel**. Agents are dispatched one at a time via `cursor-agent --agent ${agent} --prompt $taskPrompt`. However, the framework enables parallel through **task decomposition** - marking parallelizable tasks explicitly in the task breakdown.

---

## 3. TDD Patterns for AI Agents

### TDD Engineer Guide (`tdd.mdc`)

Prescriptive test-driven development with **5-question assertion framework**:

```sudolang
assert = ({ given, should, actual, expected }) {
  Tests must answer these 5 questions:
  1. What is the unit under test? (describe block)
  2. What is the expected behavior? (given/should)
  3. What is the actual output? (exercised by test)
  4. What is the expected output? (expected arg)
  5. How can we find the bug? (implicit from above)
}
```

### TDD Process (Rigorous)

```sudolang
For each unit of code:
1. Ask about test framework if unspecified
2. Propose optimal calling API for requirements
3. Write test, run, watch fail
4. Implement ONLY code to make test pass
5. Run tests: fail => fix bug; pass => continue
6. Get approval BEFORE proceeding
7. Repeat for next functional requirement
```

### Test Isolation Requirements

From tdd.mdc constraints:
- **Locality**: Test shouldn't rely on external state or other tests
- **Colocated**: Tests stored with code they test
- **Explicit**: Everything needed to understand test should be in the test
- **Integrated**: For integration tests, test with real systems
- **Isolated**: Units isolated from each other; no shared mutable state

### Key Tools

- Test framework: Vitest + Riteway
- Spies/stubs: `vi.fn` and `vi.spyOn`
- Module mocking: `vi.mock` with `vi.importActual` for partial mocks
- Timers: `vi.useFakeTimers` and `vi.setSystemTime`
- Never write tests for expected types (redundant with type checks)

---

## 4. Task Breakdown & Planning Structure

### Epic → Task Decomposition (`task-creator.mdc`)

The Task Creator provides systematic decomposition:

```sudolang
planTask() {
  1. Decompose - Break request into atomic, sequential tasks
  2. Assess Agent Needs - Determine if orchestration required
  3. Order by dependencies and logical flow
  4. Validate - Specific, actionable, independently testable
  5. Sequence - Each builds on previous
  6. Checkpoint - Approval gates between major phases
}
```

### Epic Template Structure

```markdown
# Epic Name

**Status**: 📋 PLANNED
**Goal**: Brief goal

## Overview
Single paragraph starting with WHY

---

## Task Name
Brief description

**Requirements**:
- Given ${situation}, should ${jobToDo}
- Given ${situation}, should ${jobToDo}
```

**Constraints on Epic Structure**:
- Overview starts with WHY (user benefit/problem)
- No task numbering (use names)
- Requirements ONLY in "Given X, should Y" format
- Only novel, meaningful requirements (eliminate boilerplate)
- No extra sections

### Task Characteristics

Each task must be:
- **Atomic**: ~50 lines of code or less
- **Sequential**: Can be completed one at a time
- **Independent**: Completing one doesn't break others
- **Completable**: In one focused session
- **Testable**: With clear success criteria
- **Approved**: Explicit user approval before proceeding

### Parallelization Marking

From reviewed task epic (aidd-cli-epic.md):
```markdown
## Task 3: Implement AI Folder Cloning Logic
**Dependencies**: Task 2 (CLI Interface)
```

Tasks list dependencies explicitly. Tasks can run in **parallel only if they have no mutual dependencies**. The Task Creator doesn't formally mark `[P]` but the dependency structure implies parallelizability.

---

## 5. Orchestrator Role vs Individual Agents

### Orchestrator Responsibilities (`please.mdc`)

The "Aiden" orchestrator acts as:
- **Senior software engineer**: Code quality, architecture, patterns
- **Product manager**: Features, user stories, discovery
- **Project manager**: Task planning, sequencing, orchestration
- **Technical writer**: Documentation, clarity, communication

### Reflective Thought Composition (RTC)

All agent responses follow this structure:
```sudolang
think() {
  show your work:
  🎯 restate |> 💡 ideate |> 🪞 reflectCritically |>
  🔭 expandOrthogonally |> ⚖️ scoreRankEvaluate |> 💬 respond
}
```

This enforces **visible reasoning** at all complexity levels.

### Agent Routing Logic

From agent-orchestrator.mdc:
```sudolang
userRequestIncludes => please => please.mdc

Match request to required agents:
  > 1 guide/agent => Use cursor-agent CLI dispatcher
  default => Execute directly (single agent sufficient)
```

**Key insight**: Simple work bypasses agent overhead. Complex work gets full orchestration.

### Execution Protocol

```sudolang
executePlan() {
  1. Complete only current task
  2. Validate - Verify meets success criteria
  3. Report - Summarize accomplishment
  4. Await Approval - Get explicit approval before next
}
```

**No auto-progression**: Each task requires user approval before continuing.

---

## 6. Agent Work Validation Patterns

### Code Review Process (`review.mdc`)

Review criteria that validate agent work:

```sudolang
ReviewProcess {
  1. Analyze code structure and organization
  2. Check adherence to coding standards
  3. Evaluate test coverage and quality
  4. Assess performance considerations
  5. Deep scan for security vulnerabilities
  6. Review UI/UX and accessibility
  7. Validate architectural patterns
  8. Check documentation and commit messages
  9. Provide actionable feedback with specifics
}
```

**Review methodology**:
```sudolang
show your work:
🎯 restate |> 💡 ideate |> 🪞 reflectCritically |>
🔭 expandOrthogonally |> ⚖️ scoreRankEvaluate |> 💬 respond
```

**Review-only constraint**: "Don't make changes. Review-only. Output will serve as input for planning."

### Requirements Validation

From requirements.mdc:
```sudolang
FunctionalRequirement = "Given $situation, should $jobToDo"

Constraints {
  Focus on functional requirements to support user journey
  Avoid UI details; focus on job and benefits
}
```

All work validates against the **functional requirements** specified in the epic.

### Approval Gates

The system enforces **explicit checkpoints**:
1. Plan approval before execution
2. Task approval before proceeding to next task
3. Review approval before merge/release
4. Completion validation before marking done

---

## 7. Key Code Patterns from AIDD

### Function Composition (`asyncPipe`)

From `/utils/async-pipe.js`:
```javascript
const asyncPipe =
  (...fns) =>
  (x) =>
    fns.reduce(async (y, f) => f(await y), x);

// Example
const add1 = async (x) => x + 1;
const multiply2 = async (x) => x * 2;
const pipeline = asyncPipe(add1, multiply2);
await pipeline(5); // => 12
```

**Pattern**: Composable async pipelines replace procedural sequences.

### Middleware Composition for Servers

From AIDD Server Framework:
```javascript
export default createRoute(
  withRequestId,
  withConfig,
  withOptionalAuth,
  async ({ request, response }) => {
    // Handler
  }
);
```

Uses **left-to-right composition** (pipe semantics) for readable middleware chains.

### SudoLang Type System

From tdd.mdc and requirements.mdc:
```sudolang
type assert = ({ given: string, should: string, actual: any, expected: any })
type FunctionalRequirement = "Given $situation, should $jobToDo"
type UserStory = "As a $persona, I want $jobToDo, so that $benefit"
type TaskStatus = pending | inProgress | completed | blocked | cancelled
```

**Types provide structure without runtime overhead** - guides AI agent reasoning.

---

## 8. Complexity Assessment Pattern

From task-creator.mdc:
```sudolang
assessComplexity() {
  criteria:
    Multiple technical domains (UI, backend, testing, etc.)
    Specialized knowledge (Redux, TDD, product management, etc.)
    Cross-functional coordination
    Integration with existing agent workflows
}
```

**Complexity drives agent orchestration decisions**:
- Simple tasks: Direct execution
- Complex tasks: Dispatch to specialized agents
- Very complex: Multi-agent orchestration with approval gates

---

## 9. Development Workflow from AIDD

From README:

```
1. Create branch: git checkout -b your-branch-name
2. Discover with /discover: Set up profile, discover key user journeys
3. Plan with /task: Create structured epic with clear requirements
4. Review with /review: Eliminate duplication, simplify
5. Execute with /execute: Implement using TDD, one requirement at a time
6. Push and PR: git push origin your-branch-name, open PR
```

**Workflow is sequential, not parallel** - but task breakdown within each phase can have parallelizable tasks.

---

## 10. Lessons for cc-track's Task Orchestration Overhaul

### What AIDD Does Well

1. **Clear role differentiation** - Specialized agents for different domains
2. **Systematic decomposition** - Epics break into small, independent tasks
3. **Explicit approval gates** - No auto-progression without validation
4. **TDD discipline** - Strong patterns for test isolation and requirements
5. **SudoLang structure** - Pseudocode reduces ambiguity vs natural language
6. **Complexity awareness** - Routes complex work to specialized agents
7. **Composition patterns** - asyncPipe, pipe enable clean multi-step workflows
8. **Comprehensive validation** - Review process checks multiple dimensions

### Gaps for cc-track Context

1. **Parallelization**: AIDD doesn't formally mark or manage parallel task execution. It relies on dependency structure and manual sequencing. cc-track could explicitly mark `[P]` parallelizable tasks.

2. **Subagent coordination**: AIDD routes to `cursor-agent` but doesn't show complex multi-subagent workflows. cc-track may need richer patterns for coordinating Explore, Implement, Review agents in parallel.

3. **Work validation before acceptance**: AIDD reviews after completion. cc-track could validate during execution (e.g., blocking on TypeScript errors).

4. **State management**: AIDD doesn't show how agents track shared state across parallel operations. cc-track's metadata system provides this.

5. **Re-planning when assumptions break**: AIDD stops if blocked; cc-track could be more prescriptive about re-planning mid-task.

### Recommended Patterns for cc-track

1. **Adopt "Given X, should Y" requirement format** - Clear, testable functional requirements
2. **Use complexity assessment gates** - Determine agent orchestration needs upfront
3. **Implement RTC (Reflective Thought Composition)** - Visible reasoning at all stages
4. **Leverage asyncPipe composition** - Clean multi-step agent workflows
5. **Explicit task decomposition criteria** - ~50 lines per task, atomic, independent
6. **Approval gates between phases** - Plan → Implementation → Review
7. **SudoLang for complex orchestration** - Structured pseudocode for AI-to-AI instructions
8. **Separate concerns**: Spec (requirements) → Plan (design) → Tasks (breakdown) → Progress (what happened)

---

## 11. Code References from AIDD

### Key Files Examined

- `ai/rules/agent-orchestrator.mdc` - Multi-agent routing logic
- `ai/rules/task-creator.mdc` - Task decomposition and epic planning
- `ai/rules/tdd.mdc` - Test-driven development patterns
- `ai/rules/please.mdc` - Orchestrator responsibilities and commands
- `ai/rules/review.mdc` - Code review validation process
- `ai/rules/requirements.mdc` - Functional requirement specification
- `ai/rules/javascript/javascript.mdc` - Code style and composition patterns
- `utils/async-pipe.js` - Functional composition utility
- `tasks/archive/2025-09-27-aidd-cli-epic.md` - Detailed epic example
- `package.json` - Minimal dependencies (chalk, commander, cuid2, fs-extra)

### Architecture Dependencies

- **Vitest** for testing (modern, fast, comparable to Jest)
- **Riteway** for assertion patterns (minimal, TDD-focused)
- **Commander.js** for CLI argument parsing
- **fs-extra** for enhanced file operations
- **cuid2** for unique ID generation

### Release Strategy

- Semantic versioning based on commit messages
- Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- Automated changelog generation
- GitHub releases with assets
- No unnecessary dependencies (minimalist approach)

---

## Conclusion

AIDD provides a **mature, production-tested framework** for AI-driven development with strong patterns for agent orchestration, TDD enforcement, and systematic task decomposition. The framework is **opinionated but flexible**, using SudoLang for structure and natural language for flexibility.

For cc-track's task orchestration overhaul, the most valuable patterns are:
1. **Agent orchestration through complexity assessment**
2. **TDD-first task breakdown with explicit requirements**
3. **Sequential workflow with explicit approval gates**
4. **Composition-based multi-step agent workflows**
5. **Comprehensive validation before task acceptance**

The framework demonstrates that **systematic structure** (via SudoLang and epic templates) combined with **specialized agent expertise** produces more reliable AI-driven development than unstructured natural language prompting alone.
