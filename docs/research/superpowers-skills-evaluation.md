# Research: Superpowers Skills Evaluation

**Date:** 2025-10-16
**Question:** Which skills from Jesse's superpowers-skills repository complement cc-track's spec-driven workflow?

## Summary

The superpowers-skills repository contains 20+ skills organized across 8 categories (architecture, collaboration, debugging, meta, problem-solving, research, testing, meta-management). Three skills directly align with cc-track's core workflow (systematic-debugging, receiving-code-review, writing-plans), five skills fill critical operational gaps, and two create conflicts. Recommended strategy: install all skills as project-local to encourage integration with cc-track's workflow, starting with core three for immediate value.

## Findings

### Part 1: Skills Catalog by Category

#### Collaboration (10 skills)
1. **receiving-code-review** - Verify suggestions against codebase reality before implementing (blocks performative agreement)
2. **requesting-code-review** - Framework for asking reviewers effectively
3. **writing-plans** - Create detailed bite-sized implementation tasks assuming zero codebase context
4. **executing-plans** - Load plan, execute in batches with review checkpoints
5. **subagent-driven-development** - Dispatch fresh subagent per task with code review between tasks
6. **finishing-a-development-branch** - Verify tests, present completion options, execute choice
7. **brainstorming** - Generate options for design decisions (referenced but not explored here)
8. **using-git-worktrees** - Create isolated worktrees for parallel branches
9. **remembering-conversations** - Search previous Claude Code conversations by semantic/text match
10. **dispatching-parallel-agents** - Run multiple agents concurrently on independent problems

#### Debugging (4 skills)
1. **systematic-debugging** - Four-phase framework: root cause investigation, pattern analysis, hypothesis testing, implementation
2. **root-cause-tracing** - Trace backward through call stack to find original trigger
3. **verification-before-completion** - Run verification commands and confirm output before claiming success
4. **defense-in-depth** - Add safeguards at multiple layers, not just the symptom point

#### Problem-Solving (6 skills)
1. **when-stuck** - Dispatch matrix to identify right problem-solving technique based on stuck-type
2. **simplification-cascades** - Decompose complex problems into progressively simpler ones
3. **collision-zone-thinking** - Force unlikely metaphors to break conventional thinking patterns
4. **inversion-exercise** - Question core assumptions by inverting them
5. **meta-pattern-recognition** - Find recurring patterns across different domains
6. **scale-game** - Test solutions against production scale and edge cases

#### Testing (3 skills)
1. **test-driven-development** - Red-green-refactor cycle, write failing test first
2. **condition-based-waiting** - Handle async operations and timing correctly in tests
3. **testing-anti-patterns** - Recognize and fix common testing mistakes

#### Architecture (1 skill)
1. **preserving-productive-tensions** - Recognize when disagreements reveal valuable context, preserve multiple valid approaches

#### Research (1 skill)
1. **tracing-knowledge-lineages** - Trace ideas/concepts backward to their origins

#### Meta (5 skills)
1. **gardening-skills-wiki** - Maintain and update skills documentation over time
2. **pulling-updates-from-skills-repository** - Stay current with upstream skill updates
3. **sharing-skills** - Document and share new skills with the community
4. **testing-skills-with-subagents** - Verify skills work as intended with actual subagents
5. **writing-skills** - Create new skills for the repository

#### Using-Skills (Meta-management)
1. **find-skills** - Locate skills relevant to current task
2. **skill-run** - Execute skills from the command line

---

### Part 2: Alignment with cc-track

#### High Alignment (Direct Integration)

**receiving-code-review** (Collision: NONE)
- **Alignment:** Already implemented in cc-track's decision_log.md from clank library (same skill)
- **Purpose:** Verify suggestions technically rather than performatively agree
- **When Claude uses:** During `/prepare-completion`, `/clarify`, any external review feedback
- **Integration:** Already part of cc-track's verification workflow
- **Status:** INSTALLED (via clank, slightly different source)

**systematic-debugging** (Collision: NONE)
- **Alignment:** Core competency for cc-track's enforcement approach
- **Purpose:** Four-phase debugging: root cause investigation before fixes
- **When Claude uses:** When tests fail, bugs appear, or unexpected behavior occurs
- **Integration:** Complements `edit-validation` hook that blocks on errors
- **Value-add:** Provides structured framework for the "find root cause" principle
- **Current gap:** Not explicitly referenced in cc-track workflow
- **Status:** SHOULD INSTALL - fills framework gap

**writing-plans** (Collision: MINOR)
- **Alignment:** Overlaps with `/plan` command (creates plan.md)
- **Purpose:** Create detailed bite-sized implementation tasks with exact file paths and code
- **When Claude uses:** After `/plan` creates plan.md, when breaking into tasks
- **Integration:** Complements `/tasks` command but more detailed with code examples
- **Current gap:** cc-track focuses on task breakdown, this focuses on implementation detail
- **Note:** Could be used to enhance `/tasks` output with more code detail
- **Status:** SHOULD INSTALL - enhances `/tasks` with code examples

**verification-before-completion** (Collision: NONE)
- **Alignment:** Direct match to `/prepare-completion` philosophy
- **Purpose:** Run verification commands and confirm output before claiming success
- **When Claude uses:** At any point considering completing work
- **Integration:** Perfect fit for `/prepare-completion` hook that validates TypeScript/lint/tests
- **Value-add:** Prevents false completion claims, emphasizes evidence over confidence
- **Status:** SHOULD INSTALL - reinforces `/prepare-completion` rigor

#### Medium Alignment (Operational Benefits)

**test-driven-development** (Collision: NONE)
- **Alignment:** TDD is part of cc-track philosophy but not explicit in workflow commands
- **Purpose:** Write test first, watch fail, write minimal code to pass
- **When Claude uses:** During task implementation phase
- **Integration:** Guides implementation between `/tasks` and `/prepare-completion`
- **Current state:** Tested via tests but no explicit workflow guidance
- **Status:** SHOULD INSTALL - provides structured implementation guidance

**root-cause-tracing** (Collision: NONE)
- **Alignment:** Complements systematic-debugging with specific technique for deep stack traces
- **Purpose:** Trace backward through call chain to find original trigger
- **When Claude uses:** When bug manifests deep in execution
- **Integration:** Works with systematic-debugging Phase 1 investigation
- **Status:** SHOULD INSTALL - provides specialized debugging technique

**dispatching-parallel-agents** (Collision: NONE)
- **Alignment:** Operational pattern for handling multiple independent failures
- **Purpose:** Run multiple agents concurrently on independent problems
- **When Claude uses:** When multiple test files failing with different root causes
- **Integration:** Complements `/prepare-completion` validation which may find multiple issues
- **Status:** NICE-TO-HAVE - useful for efficiency, not core to workflow

**executing-plans** (Collision: MINOR)
- **Alignment:** Similar to subagent-driven-development but for parallel sessions
- **Purpose:** Execute plan in batches with review checkpoints
- **When Claude uses:** When executing long plans from `/plan` command
- **Integration:** Could be referenced in `/tasks` output as execution strategy
- **Current gap:** cc-track focuses on single-session workflow
- **Status:** NICE-TO-HAVE - useful for long implementations

**remembering-conversations** (Collision: NONE)
- **Alignment:** Supports cc-track's emphasis on context preservation across compactions
- **Purpose:** Search previous Claude Code conversations for facts/patterns/decisions
- **When Claude uses:** When partner mentions past discussions or debugging familiar issues
- **Integration:** Powerful complement to cc-track's journal and decision_log
- **Status:** NICE-TO-HAVE - useful for pattern learning, optional feature

#### Problem-Solving Collection (Collision: NONE)

**when-stuck** (dispatch matrix)
- **Purpose:** Identify which problem-solving technique to apply
- **Techniques included:** simplification-cascades, collision-zone-thinking, inversion-exercise, meta-pattern-recognition, scale-game, systematic-debugging, dispatching-parallel-agents
- **Integration:** Provides framework for choosing technique when `/clarify` or implementation gets stuck
- **Status:** NICE-TO-HAVE - useful reference for complex problems

Other problem-solving skills (simplification-cascades, collision-zone-thinking, inversion-exercise, meta-pattern-recognition, scale-game):
- **Purpose:** Different approaches for breaking through stuck-ness on design/architecture
- **Integration:** Referenced by `when-stuck` dispatch matrix
- **Status:** REFERENCE - helpful when design phase gets complex

#### Low/No Alignment (Not Critical)

**preserving-productive-tensions** (Collision: NONE)
- **Purpose:** Preserve multiple valid approaches when trade-offs exist
- **When Claude uses:** Architecture decisions where multiple approaches are equally valid
- **Integration:** Useful decision framework but not required for cc-track workflow
- **Status:** REFERENCE - architectural guidance

**requesting-code-review** (Collision: NONE)
- **Purpose:** Framework for asking reviewers effectively
- **When Claude uses:** When requesting code review from external reviewers
- **Integration:** Complements `requesting-code-review` but less critical than receiving-code-review
- **Status:** REFERENCE - useful for future external review integration

**Meta/Using-Skills** (not runtime skills)
- **Purpose:** Skill maintenance and management
- **Status:** REFERENCE/TOOLS - not part of runtime workflow

---

### Part 3: Installation Strategy

#### Installation Location Decision

**RECOMMENDATION: Install all skills as project-local (.claude/skills/)**

Rationale:
1. **cc-track specificity:** Skills are discovered and referenced during spec/plan/task workflow
2. **Workflow integration:** Claude should reference skills naturally within cc-track commands
3. **Version control:** Skills can be updated alongside cc-track improvements
4. **Community benefits:** Project-level skills can be shared in .claude/ context
5. **Discoverability:** Easy for users to see which skills are available in this project

Alternative rejected: user-global installation
- Would make skills available everywhere, diluting cc-track specificity
- Project-local is better for workflow integration and reproducibility

---

## Recommendation

### Top Priority (Core Installation)

**Skill 1: systematic-debugging**
- **Reasoning:** Fills critical framework gap for error handling and debugging
- **Expected benefit:** Prevents quick-fix temptation, enforces root cause investigation
- **Integration point:** Referenced when edit-validation hook blocks on errors
- **Install as:** `.claude/skills/debugging/systematic-debugging/`
- **Integration:** Mention in CLAUDE.md as reference for debugging methodology

**Skill 2: verification-before-completion**
- **Reasoning:** Directly reinforces `/prepare-completion` philosophy
- **Expected benefit:** Prevents false completion claims, emphasizes evidence
- **Integration point:** Referenced in `/prepare-completion` command output
- **Install as:** `.claude/skills/debugging/verification-before-completion/`
- **Integration:** Mention in cc-track-workflow.md alongside `/prepare-completion` command

**Skill 3: test-driven-development**
- **Reasoning:** Guides implementation between `/tasks` and `/prepare-completion`
- **Expected benefit:** Ensures TDD discipline during task execution
- **Integration point:** Referenced in `/tasks` command output
- **Install as:** `.claude/skills/testing/test-driven-development/`
- **Integration:** Reference in `/tasks` output with pointer to skill

### Secondary Priority (Operational Benefits)

**Skill 4: receiving-code-review**
- **Reasoning:** Already implemented from clank, but full skill provides more detail
- **Expected benefit:** Better pattern for handling external review feedback
- **Install as:** `.claude/skills/collaboration/receiving-code-review/`
- **Note:** Will duplicate clank version, but more complete documentation

**Skill 5: root-cause-tracing**
- **Reasoning:** Specialized debugging technique for deep stack traces
- **Expected benefit:** Faster debugging of complex call chains
- **Install as:** `.claude/skills/debugging/root-cause-tracing/`
- **Integration:** Reference from systematic-debugging when tracing is needed

### Conditional (Only If Needed)

**Skill 6: writing-plans** (if enhancing `/tasks` output)
- Install if `/tasks` command needs more code-example detail

**Skill 7: when-stuck** (dispatch matrix)
- Install if need guidance on which problem-solving technique to use

**Skill 8: dispatching-parallel-agents**
- Install if need to handle multiple independent validation failures concurrently

---

## Implementation Notes

### No Conflicts with cc-track

All skills respect cc-track's core principles:
- Systematic debugging before quick fixes (matches cc-track's validation philosophy)
- Verification before claims (matches `/prepare-completion` rigor)
- Honesty over appearing competent (matches user_context.md "no BS tolerance")
- Evidence-based decisions (matches decision_log.md patterns)

### Integration Points

1. **In CLAUDE.md:** Add `@.claude/skills/debugging/systematic-debugging/SKILL.md` reference
2. **In cc-track-workflow.md:** Add skill references in appropriate workflow stages
3. **In commands:** Link from `/clarify` (use when-stuck), `/tasks` (use TDD), `/prepare-completion` (use verification)
4. **In decision_log.md:** Already references receiving-code-review principles from clank

### Installation Process

```bash
# Create skills directory structure
mkdir -p .claude/skills/{debugging,testing,collaboration,problem-solving}

# Download each skill SKILL.md file
# Place in appropriate directory under .claude/skills/
```

### Expected Benefits

1. **Reduced debugging friction:** Structured approach prevents wheel-spinning
2. **Fewer false completions:** Verification skill prevents declaring success prematurely
3. **Better implementation discipline:** TDD guidance during task execution
4. **Stronger code review patterns:** Receiving-code-review skill prevents performative agreement
5. **Architectural thinking:** Problem-solving skills aid `/clarify` and `/plan` phases

---

## References

- https://github.com/obra/superpowers-skills - Full skills repository
- Specific skills analyzed: systematic-debugging, verification-before-completion, test-driven-development, receiving-code-review, root-cause-tracing, writing-plans, executing-plans, dispatching-parallel-agents, when-stuck, preserving-productive-tensions, remembering-conversations
- cc-track product context: enforces quality, emphasizes verification, values honesty
- cc-track workflow: spec → clarify → plan → tasks → implement → prepare-completion → complete-task
