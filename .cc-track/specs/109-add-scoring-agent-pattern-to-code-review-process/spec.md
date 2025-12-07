# Feature Specification: Add Scoring Agent Pattern to Code Review Process

**Feature ID**: `109`
**Branch**: `109-add-scoring-agent-pattern-to-code-review-process`
**Created**: 2025-12-06
**Status**: Draft

---

## Background & Rationale

### The Psychology of LLM Code Review

Modern LLMs (Claude Opus 4.5, Sonnet 4.5, Haiku 4.5) are highly capable at code development, scoring 70-81% on SWE-Bench Verified. However, **capability alone doesn't solve the review problem** due to psychological patterns in how these models operate:

1. **Self-review bias**: An agent that wrote code exhibits "I know what I meant" syndrome - it skips things, makes excuses, has attention fatigue by the end of a long context window, and rationalizes shortcuts due to training bias toward shipping working code.

2. **Fresh eyes advantage**: A separate agent reviewing a diff without coding context performs better review - same reason humans don't review their own PRs.

3. **Early victory declaration**: Single review agents tend to find 1-2 issues and declare victory, missing broader problems.

4. **Eager to please**: Review agents want to report *something*, leading to false positives on minor or irrelevant issues.

5. **Orchestrator bias**: The orchestrating agent remembers what it meant and doesn't need to re-read the actual code, making it a poor judge of its own review findings.

### The Solution: Psychologically-Informed Agent Design

Rather than treating this as a capability problem (which 2024-era patterns did), we treat it as a bias mitigation problem:

- **Parallel focused reviewers** with different concerns find more issues than a single generalist
- **Neutral per-issue scoring agents** validate each finding without context bias
- **Human gate** makes final decisions on what to fix
- **Cost optimization** uses cheap Haiku for repetitive validation while reserving Opus for implementation

---

## User Scenarios & Testing

### Primary User Story

As a developer using cc-track, when I run `/cc-track:prepare-completion` after finishing implementation, I want the code review to:
1. Find real issues without the "I wrote this so it's fine" bias
2. Filter out false positives that waste my time
3. Present only validated, high-confidence findings for my review
4. Let me decide which issues to actually address

### Acceptance Scenarios

1. **Given** a completed implementation with real bugs, **When** prepare-completion runs the multi-agent review, **Then** the parallel reviewers identify the bugs across their focus areas

2. **Given** reviewers report 15 potential issues (mix of real and false positives), **When** scoring agents validate each issue, **Then** false positives score low (<50) and are filtered out

3. **Given** 6 issues pass the scoring threshold (>=50), **When** results are presented to the user, **Then** they see a prioritized list with scores, descriptions, and locations

4. **Given** the user selects 4 of 6 issues to fix, **When** they confirm, **Then** the orchestrator implements fixes for only those 4 issues

5. **Given** a review where all issues score below 50, **When** results are presented, **Then** user sees "No verified issues found" and can proceed to completion

### Edge Cases

- What happens when reviewers find 0 issues? → Skip scoring phase, report clean review
- What happens when a scorer times out? → Use reviewer's original confidence as fallback
- What happens when user rejects all presented issues? → Proceed to completion without fixes
- How to handle duplicate issues found by multiple reviewers? → Deduplicate before scoring

---

## Requirements

### Functional Requirements

#### Review Agent Orchestration
- **FR-001**: System MUST launch all 8 review agents in parallel after validation passes
- **FR-002**: Each review agent MUST focus on its designated area (spec compliance, bugs, guidelines, etc.)
- **FR-003**: Review agents MUST output findings as a simple list of issues (no self-scoring)
- **FR-004**: Review agents MUST include file:line locations and descriptions for each finding
- **FR-005**: Review agents MUST NOT include confidence scores - scoring is done by separate agents

#### Per-Issue Scoring
- **FR-006**: System MUST spawn a separate scoring agent for each issue found by reviewers
- **FR-007**: Scoring agents MUST run in parallel for speed
- **FR-008**: Scoring agents MUST use Haiku model for cost efficiency
- **FR-009**: Scoring agents MUST have full codebase access to trace and verify issues (modeled on Anthropic's code-review plugin scorer pattern)
- **FR-010**: Scoring agents will not have conversation history, providing natural isolation from orchestrator bias
- **FR-011**: Scoring agents MUST return a confidence score (0-100) using the established rubric:
  - 0: False positive, doesn't stand up to scrutiny
  - 25: Might be real, couldn't verify
  - 50: Real but minor, not important relative to the PR
  - 75: Verified real issue, will impact functionality
  - 100: Definitely real, confirmed with evidence
- **FR-012**: Scoring agents MUST provide brief justification for their score

#### Filtering and Presentation
- **FR-013**: System MUST filter out issues with scores below 50 (unverified/false positives)
- **FR-014**: System MUST deduplicate similar issues found by multiple reviewers before presentation
- **FR-015**: System MUST present remaining issues to user sorted by score (highest first)
- **FR-016**: Presentation MUST include: score, reviewer source, issue description, file:line, scorer's justification
- **FR-017**: System MUST STOP after presenting scored issues and wait for user discussion
- **FR-018**: System MUST NOT automatically implement any fixes

#### User Response
- **FR-019**: After reviewing presented issues, user discusses with orchestrator which (if any) to address
- **FR-020**: User may ask orchestrator to fix specific issues, ask clarifying questions, or dismiss findings
- **FR-021**: User may proceed to `/cc-track:complete-task` if no fixes needed
- **FR-022**: If fixes are made, user should re-run `/cc-track:prepare-completion` to re-validate

### Non-Functional Requirements

- **NFR-001**: Scoring phase MUST complete within 60 seconds for up to 20 issues (parallel Haiku is fast)
- **NFR-002**: Total review cost SHOULD be optimized by using Haiku for scoring (not Sonnet/Opus)
- **NFR-003**: System MUST gracefully handle scorer timeouts without blocking the entire review

---

## Success Criteria

- [ ] False positive rate reduced compared to current self-scored approach
- [ ] High-confidence issues (>=80) are genuinely actionable when reviewed by human
- [ ] Review process completes in reasonable time (<2 minutes for typical PR)
- [ ] Users report the presented issues are more relevant than before
- [ ] Cost per review is acceptable (Haiku scoring is cheap)

---

## Scope & Boundaries

### In Scope
- Removing self-scoring from existing 8 review agents (output issue lists only)
- Adding per-issue scoring agent (based on Anthropic's code-review plugin pattern)
- Parallel scoring agent orchestration
- Score-based filtering (threshold: 50 - show verified issues, filter false positives)
- Updating prepare-completion command to orchestrate scoring and present results
- Stopping after presentation for user discussion (no auto-fix)

### Out of Scope
- Consolidating the 8 review agents (future task, pending real-world testing)
- Changing the development flow to review-after-each-subtask (separate task)
- Calibration/learning from human feedback over time (future enhancement)
- Automatic fix implementation (user discusses and directs fixes manually)

---

## Clarifications

### Session 2025-12-06

- Q: Should we reduce the number of review agents? → A: Keep all 8 for now, may consolidate later after real-world testing
- Q: What model for scorers? → A: Haiku 4.5 (fast, cheap, still very capable at 73.3% SWE-Bench)
- Q: What threshold for filtering? → A: 50 (anything verified as real). Anthropic uses 80 for auto-commenting on PRs, but since we're presenting for user discussion, lower threshold lets user decide what to ignore
- Q: Should scoring agents see coding context? → A: No, they must be neutral - only see issue + code location
- Q: What if user rejects all issues? → A: Allow proceeding to completion
- Q: Deduplicate before or after scoring? → A: Before, to avoid scoring the same issue multiple times

---

## Research Context

This specification is informed by:

1. **Anthropic's code-review plugin**: Uses per-issue Haiku scorers with 0-100 confidence rubric
2. **Anthropic's pr-review-toolkit**: Uses self-scoring with CLI aggregation
3. **Superpowers plugin**: Uses single senior reviewer + human aggregation
4. **External research** (2024-2025): Proposer-ranker patterns, majority voting, precision/recall tradeoffs
5. **SWE-Bench progression**: Understanding that modern models (70-81%) are capable but still have psychological biases

See research files:
- `.cc-track/research/2025-12-06-multi-agent-code-review.md`
- `.cc-track/research/2025-12-06-swe-bench-progression.md`

---

## Dependencies & Assumptions

- Depends on existing 8 review agents continuing to function
- Assumes Haiku 4.5 remains available and cost-effective
- Assumes Task tool can spawn many parallel agents efficiently
- Assumes prepare-completion.md command can be updated without breaking existing flow

---

## Open Questions

None - all clarified during specification session.
