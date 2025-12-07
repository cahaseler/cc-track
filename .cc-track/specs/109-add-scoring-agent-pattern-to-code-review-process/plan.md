# Technical Implementation Plan

**Feature:** Add Scoring Agent Pattern to Code Review Process
**Spec:** 109-add-scoring-agent-pattern-to-code-review-process
**Created:** 2025-12-07

---

## Summary

Implement the Anthropic code-review plugin's scoring pattern to reduce false positives in cc-track's code review process. The key change: instead of review agents self-scoring (which has orchestrator bias), each issue gets validated by a separate Haiku scoring agent with full codebase access but no conversation history.

**Core Flow:**
1. 8 review agents run in parallel → output issue lists (no scores)
2. Deduplicate issues across reviewers
3. Spawn N Haiku scoring agents in parallel (one per issue)
4. Filter issues below threshold (50)
5. Present sorted results to user → STOP
6. User discusses and directs fixes manually

---

## Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Version** | TypeScript 5.x with Bun runtime |
| **Runtime/Framework** | Claude Code plugin architecture |
| **Dependencies** | Existing: Task tool, claude-agent-sdk |
| **New Dependencies** | None |
| **Testing** | Bun test with mock injection |
| **Performance Goals** | Scoring phase <60s for 20 issues (parallel Haiku) |

---

## Constitution Check

### Pre-Design Validation

| Guardrail | Status | Notes |
|-----------|--------|-------|
| Max Dependencies (5) | ✅ Pass | Currently 2, adding 0 |
| Max File Size (500 lines) | ✅ Pass | Modifying existing files |
| Hook Execution (<60s) | ✅ Pass | Parallel Haiku is fast |
| Plugin-Native Architecture | ✅ Pass | No binary compilation |
| Dependency Injection | ✅ Will use | For testability |

### No Violations

All changes fit within existing architectural constraints.

---

## Architecture Overview

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                    prepare-completion.md                     │
                    │                  (Orchestrator Command)                      │
                    └──────────────────────────┬──────────────────────────────────┘
                                               │
                    ┌──────────────────────────▼──────────────────────────────────┐
                    │                   Phase 1: Validation                        │
                    │         (TypeScript, Biome, Tests, Knip - unchanged)         │
                    └──────────────────────────┬──────────────────────────────────┘
                                               │
                    ┌──────────────────────────▼──────────────────────────────────┐
                    │              Phase 2: Parallel Review Agents                 │
                    │        (8 agents in parallel, output issue LISTS)            │
                    │                                                              │
                    │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐   │
                    │  │spec-compliance │ │plan-adherence  │ │task-completion │   │
                    │  └───────┬────────┘ └───────┬────────┘ └───────┬────────┘   │
                    │          │                  │                  │            │
                    │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐   │
                    │  │  bug-scanner   │ │  guidelines    │ │   comments     │   │
                    │  └───────┬────────┘ └───────┬────────┘ └───────┬────────┘   │
                    │          │                  │                  │            │
                    │  ┌────────────────┐ ┌────────────────┐                      │
                    │  │  duplication   │ │   dead-code    │                      │
                    │  └───────┬────────┘ └───────┬────────┘                      │
                    └──────────┴─────────────────┬┴───────────────────────────────┘
                                                 │
                    ┌────────────────────────────▼────────────────────────────────┐
                    │              Phase 3: Issue Deduplication                    │
                    │         (Orchestrator: merge similar issues by file:line)    │
                    └────────────────────────────┬────────────────────────────────┘
                                                 │
                    ┌────────────────────────────▼────────────────────────────────┐
                    │          Phase 4: Parallel Scoring Agents (Haiku)            │
                    │              (One agent per unique issue)                    │
                    │                                                              │
                    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
                    │  │ Scorer 1 │ │ Scorer 2 │ │ Scorer 3 │ │ Scorer N │        │
                    │  │(Issue 1) │ │(Issue 2) │ │(Issue 3) │ │(Issue N) │        │
                    │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘        │
                    │       │            │            │            │               │
                    │       ▼            ▼            ▼            ▼               │
                    │   0-100        0-100        0-100        0-100              │
                    └────────────────────────────┬────────────────────────────────┘
                                                 │
                    ┌────────────────────────────▼────────────────────────────────┐
                    │              Phase 5: Filter & Present                       │
                    │         (Remove <50, sort by score, show to user)            │
                    └────────────────────────────┬────────────────────────────────┘
                                                 │
                    ┌────────────────────────────▼────────────────────────────────┐
                    │                   Phase 6: STOP                              │
                    │          (Wait for user discussion, no auto-fix)             │
                    └─────────────────────────────────────────────────────────────┘
```

---

## Implementation Approach

### 1. Modify Review Agents (8 files)

**Current state:** Each agent self-scores issues (0-100) and only reports high-confidence findings.

**Target state:** Each agent outputs a structured list of issues with NO scoring:
- Issue description
- File:line location
- Reviewer's raw observation (what they found)
- No confidence score

**Files to modify:**
- `agents/spec-compliance-reviewer.md`
- `agents/plan-adherence-reviewer.md`
- `agents/task-completion-reviewer.md`
- `agents/bug-scanner.md`
- `agents/guidelines-reviewer.md`
- `agents/comment-compliance-reviewer.md`
- `agents/duplication-detector.md`
- `agents/dead-code-detector.md`

**Key changes per agent:**
1. Remove confidence scoring rubric section
2. Remove "Only report issues with confidence >= 80" instruction
3. Update output format to structured issue list
4. Keep all investigation/analysis logic intact

### 2. Create Issue Scorer Agent (new file)

**New file:** `agents/issue-scorer.md`

**Purpose:** Validate a single issue reported by a reviewer

**Input (via prompt):**
- Issue description from reviewer
- File:line location
- The reviewer's observation
- Full codebase access (tools)

**Output:**
- Confidence score (0-100) with rubric:
  - 0: False positive, doesn't stand up to scrutiny
  - 25: Might be real, couldn't verify
  - 50: Real but minor, not important relative to the PR
  - 75: Verified real issue, will impact functionality
  - 100: Definitely real, confirmed with evidence
- Brief justification (1-2 sentences)

**Model:** Haiku (cost-efficient, 73.3% SWE-Bench)

**Tools:** Read, Grep, Glob, LS (full codebase access for verification)

**Key property:** No conversation history = natural isolation from orchestrator bias

### 3. Update prepare-completion.md Command

**Current flow:**
1. Run validation script
2. Launch 8 review agents in parallel
3. Aggregate findings by confidence
4. Present summary
5. Code review response principles
6. Update documentation

**New flow:**
1. Run validation script (unchanged)
2. Launch 8 review agents in parallel (modified: no self-scoring)
3. **Collect raw issue lists from all agents**
4. **Deduplicate issues by file:line similarity**
5. **Launch N scoring agents in parallel (one per unique issue)**
6. **Filter issues with score < 50**
7. **Present sorted results (highest score first)**
8. **STOP - wait for user discussion**
9. User directs any fixes manually
10. User re-runs prepare-completion if fixes made
11. User runs complete-task when satisfied

### 4. Define Issue Data Structure

Structured format for issues (used in orchestrator logic):

```typescript
interface ReviewerIssue {
  reviewer: string;          // Which agent found it
  description: string;       // What the issue is
  location: string;          // file:line
  observation: string;       // What the reviewer observed
}

interface ScoredIssue {
  reviewer: string;
  description: string;
  location: string;
  observation: string;
  score: number;             // 0-100 from scorer
  justification: string;     // Scorer's reasoning
}
```

---

## Key Design Decisions

### Why Per-Issue Scorers (not batch scoring)?

1. **Parallel execution** - Can score 20 issues simultaneously
2. **Natural isolation** - Each scorer has no conversation history
3. **Cost optimization** - Haiku is cheap, parallel is fast
4. **Matches Anthropic pattern** - Proven approach in code-review plugin

### Why Threshold 50 (not 80)?

Anthropic uses 80 for auto-commenting on PRs. We're presenting to user for discussion:
- 50+ = verified as real, show to user
- <50 = unverified/false positive, filter out
- User decides what to actually fix

### Why Deduplicate Before Scoring?

Multiple reviewers may flag same issue:
- bug-scanner: "Missing null check at utils.ts:42"
- guidelines-reviewer: "Null handling violation at utils.ts:42"

Deduplication avoids scoring the same issue twice.

### Why STOP After Presenting (no auto-fix)?

Spec requirement FR-017/FR-018: System stops for user discussion.
User controls what gets fixed. No "eager to please" auto-implementation.

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scorer timeout | Low | Medium | Use fallback score from reviewer observation |
| Too many issues (>20) | Low | Low | Process in batches, cap at 50 |
| Deduplication misses similar issues | Medium | Low | Conservative matching on exact file:line |
| Haiku misinterprets issue | Low | Medium | Full codebase access enables verification |

### Process Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Users impatient with new flow | Medium | Low | Clear messaging about validation value |
| Agent prompt changes break output format | Low | High | Test with dry runs before merge |

---

## Testing Strategy

### Unit Tests

- Test issue deduplication logic
- Test score filtering logic
- Test output formatting

### Integration Tests

- Mock Task tool responses
- Verify full flow from review → score → filter → present

### Manual Validation

- Run on actual PR with known issues
- Verify false positive rate reduction
- Time scoring phase for 10-20 issues

---

## Phase 2: Task Planning Approach

The `/cc-track:tasks` command will generate tasks following this order:

1. **Modify review agents** (can be parallelized across all 8)
   - Remove self-scoring logic
   - Update output format to structured issue list
   - Keep analysis capabilities intact

2. **Create issue-scorer agent**
   - New markdown file with Haiku model
   - Define scoring rubric
   - Grant codebase access tools

3. **Update prepare-completion.md**
   - Add deduplication step
   - Add parallel scoring phase
   - Update presentation format
   - Add explicit STOP instruction

4. **Test the flow**
   - Dry run on current branch
   - Verify output format
   - Check timing

---

## Success Validation

After implementation, verify:

- [ ] Review agents output issue lists without scores
- [ ] Scoring agents receive individual issues
- [ ] Scoring agents have codebase access but no history
- [ ] Issues <50 are filtered
- [ ] Remaining issues shown sorted by score
- [ ] System stops after presenting (no auto-fix)
- [ ] Total scoring time <60s for typical review

---

## References

- **Anthropic code-review plugin:** Per-issue Haiku scorers pattern
- **Spec:** `.cc-track/specs/109-add-scoring-agent-pattern-to-code-review-process/spec.md`
- **Research:** `.cc-track/research/2025-12-06-multi-agent-code-review.md`
- **SWE-Bench data:** `.cc-track/research/2025-12-06-swe-bench-progression.md`
