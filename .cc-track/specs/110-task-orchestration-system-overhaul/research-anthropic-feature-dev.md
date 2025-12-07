# Anthropic's Official Feature-Dev Plugin Research

## Executive Summary

Anthropic's official `feature-dev` plugin (by Sid Bidasaria at Anthropic) provides a **structured 7-phase workflow** that emphasizes understanding before building. Key differentiator: **agents make DECISIVE choices** rather than presenting options.

Key insights for cc-track's task orchestration overhaul:
- **Parallel exploration**: 2-3 code-explorer agents launched simultaneously
- **Parallel review**: 3 code-reviewer agents with different focuses
- **Single decisive design**: Architect agents commit to ONE approach, not options
- **Confidence-based filtering**: Only report issues with ≥80% confidence
- **Explicit approval gate**: Cannot start implementation without user approval

---

## 1. Plugin Details

- **Path**: `~/.claude/plugins/marketplaces/claude-code-plugins/plugins/feature-dev/`
- **Author**: Sid Bidasaria (sbidasaria@anthropic.com)
- **Version**: 1.0.0
- **Status**: Official Anthropic plugin

---

## 2. The 7-Phase Workflow

### Phase 1: Discovery
- Clarify requirements
- Confirm understanding with user
- Establish scope boundaries

### Phase 2: Codebase Exploration
- Launch **2-3 parallel code-explorer agents**
- Each traces execution paths comprehensively
- Maps architecture layers and abstractions
- Returns list of 5-10 key files to read
- **Claude reads identified files before proceeding**

### Phase 3: Clarifying Questions
> "One of the most important phases. DO NOT SKIP."

- Identify ALL ambiguities
- Resolve before design phase
- No assumptions allowed

### Phase 4: Architecture Design
- Launch **2-3 parallel code-architect agents** with different focuses:
  - Minimal approach
  - Clean approach
  - Pragmatic approach
- Each delivers a **DECISIVE, complete architecture** (not options)
- Claude synthesizes into single design

### Phase 5: Implementation
- **Requires explicit user approval before starting**
- Build the feature following the approved design
- Only phase where code is written

### Phase 6: Quality Review
- Launch **3 parallel code-reviewer agents**:
  1. **Simplicity/DRY/Elegance** focus
  2. **Bugs/Functional correctness** focus
  3. **Conventions/Abstractions** focus
- Uses confidence-based filtering (≥80% confidence only)

### Phase 7: Summary
- Document what was built
- Outline next steps
- Clean handoff

---

## 3. Specialized Agents

### code-explorer (Yellow, Sonnet)

**Purpose**: Understand existing codebase before making changes

**Output**:
- Entry points identified
- Execution flow traced
- Architecture insights
- Key dependencies mapped
- List of 5-10 files to read

**Key behavior**: Traces comprehensively, doesn't assume

### code-architect (Green, Sonnet)

**Purpose**: Design the implementation approach

**Critical principle**: **DECISIVE, not advisory**
- Analyzes existing codebase patterns FIRST
- Commits to ONE approach with rationale
- Does NOT present multiple options

**Output**:
- Pattern analysis of existing code
- Architecture decision with rationale
- Component design
- Implementation map
- Data flow
- Build sequence

### code-reviewer (Red, Sonnet)

**Purpose**: Quality assurance with high signal-to-noise

**Critical principle**: **Confidence-based filtering**
- Only reports issues with ≥80% confidence
- Reduces noise from speculative concerns

**Three parallel focuses**:
1. Simplicity, DRY, Elegance
2. Bugs, Functional correctness
3. Conventions, Abstractions

---

## 4. Key Principles

### 1. Ask Clarifying Questions Early
Phase 3 is mandatory and critical. All ambiguity must be resolved before design.

### 2. Read Before Designing
Phase 2 agents identify key files. Claude MUST read them before proceeding to architecture.

### 3. Design for Quality Attributes
Architecture phase emphasizes:
- Testability
- Performance
- Maintainability

### 4. Single Decisive Design
Architect agents don't hedge. They commit to one approach with clear rationale.

### 5. Confidence-Based Filtering
Review agents only report high-confidence issues (≥80%). This reduces noise and focuses on real problems.

### 6. Explicit Approval Required
Implementation (Phase 5) cannot start without user approval of the design.

---

## 5. Comparison: Anthropic vs Superpowers vs AIDD

| Aspect | Anthropic feature-dev | Superpowers | AIDD |
|--------|----------------------|-------------|------|
| **Decision style** | Decisive (one choice) | Options presented | Sequential approval |
| **Parallel agents** | Yes (exploration, review) | Limited | No |
| **Architecture** | Single decisive design | 2-3 alternatives | Explicit approval gates |
| **Code review** | 3 parallel reviewers | After each task | After completion |
| **Approval points** | Before Phase 5 only | Multiple checkpoints | Each task |
| **Confidence filtering** | ≥80% threshold | Not specified | Not specified |

---

## 6. Patterns for cc-track

### Parallel Exploration Pattern
```
Launch 2-3 code-explorer agents simultaneously
Each explores different aspect:
  - Agent 1: Entry points and main flow
  - Agent 2: Data model and persistence
  - Agent 3: Integration points and APIs
Synthesize findings before proceeding
```

### Parallel Review Pattern
```
Launch 3 code-reviewer agents simultaneously
Each focuses on different quality aspect:
  - Agent 1: Simplicity/DRY/Elegance
  - Agent 2: Bugs/Functional correctness
  - Agent 3: Conventions/Abstractions
Merge findings with confidence filtering
```

### Decisive Architecture Pattern
```
Architect agent analyzes existing patterns FIRST
Then commits to ONE approach
Provides clear rationale for choice
Does NOT present alternatives for user to pick
```

### Confidence-Based Filtering
```
For each potential issue:
  If confidence >= 80%:
    Report with details
  Else:
    Suppress (too speculative)
```

---

## 7. Command Usage

```bash
# With feature description
/feature-dev Add user authentication with OAuth

# Interactive mode
/feature-dev
```

The command guides through all 7 phases interactively.

---

## 8. Key Differences from cc-track's Current Approach

**What Anthropic does differently**:

1. **Parallel exploration before planning** - cc-track does optional exploration in /specify
2. **Decisive architecture** - cc-track presents alternatives in /plan
3. **Parallel review at end** - cc-track has review gates between tasks
4. **Confidence filtering** - cc-track reports all issues found
5. **Single approval gate** - cc-track has multiple approval points

**What cc-track does that Anthropic doesn't**:

1. **TDD enforcement** - Anthropic doesn't mention test-first
2. **Task breakdown with [P] markers** - Anthropic doesn't explicitly break into tasks
3. **Constitution checks** - Anthropic doesn't have project guardrails
4. **Progress tracking** - Anthropic doesn't maintain progress.md

---

## 9. Recommendations for cc-track

### Adopt from Anthropic

1. **Parallel exploration** - Launch 2-3 explorers before /plan
2. **Parallel review** - Multiple reviewers with different focuses
3. **Confidence filtering** - Only surface high-confidence issues
4. **Decisive design** - Have architect commit to one approach (user can reject, but no "which option?" questions)

### Keep from cc-track

1. **TDD enforcement** - Anthropic's approach lacks this
2. **Task breakdown** - More granular than Anthropic's single implementation phase
3. **Constitution checks** - Valuable guardrails
4. **Multiple review gates** - Between tasks, not just at end

### Synthesize

Best of both worlds:
- **Parallel exploration** (Anthropic) before planning
- **Decisive architecture** (Anthropic) with constitution checks (cc-track)
- **TDD task breakdown** (cc-track/AIDD/Superpowers) for implementation
- **Parallel review** (Anthropic) with confidence filtering at completion
- **Review gates between tasks** (Superpowers) during implementation

---

## Conclusion

Anthropic's feature-dev provides a **parallel-first, decisive workflow** that's quite different from the sequential, options-presenting approach in cc-track and Superpowers. The key innovations are:

1. **Parallel agents for exploration and review**
2. **Decisive (not advisory) architecture decisions**
3. **Confidence-based filtering for reviews**
4. **Single approval gate before implementation**

For cc-track's orchestration overhaul, the parallel patterns and confidence filtering are directly applicable. The decisive architecture approach is worth considering but may conflict with user preferences for seeing options.
