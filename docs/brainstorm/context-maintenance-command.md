# Brainstorm: Context Maintenance Command

**Date:** 2025-10-16
**Status:** Idea - Not Yet Implemented

## Problem Statement

The `.claude/` directory context files grow over time and accumulate bloat:
- **decision_log.md**: Gets filled with bug fixes masquerading as "decisions"
- **progress_log.md**: Contains excessive implementation details
- **system_patterns.md**: Includes obvious patterns covered by training data
- **Overall impact**: Context window waste, reduced relevance, slower comprehension

Current overhead estimate: ~26k tokens for context files that could be leaner.

## Proposed Solution

Create `/maintain-context` command for periodic context optimization.

### Key Features

**Deliberate, not automatic:**
- User-invoked command (not autonomous skill)
- Runs every 5-10 tasks or when context feels cluttered
- Interactive pruning with user approval

**Four-phase process:**

1. **Analysis**: Show current token usage per file
2. **Pruning**: Remove bloat with clear rules
3. **Skill Extraction**: Identify reference material candidates
4. **Execution**: Backup, move, commit

### Pruning Rules

**Decision Log:**
- ✅ Keep: Architectural choices, tech stack decisions, pattern adoptions
- ❌ Prune: Bug fixes, typo corrections, trivial "used X instead of Y"
- 📦 Archive: Historical decisions no longer relevant

**Progress Log:**
- ✅ Keep: Major milestone summaries, blocking issues, pivot points
- ❌ Prune: Verbose implementation details, step-by-step task completion
- Goal: One paragraph per completed task

**System Patterns:**
- ✅ Keep: Project-specific conventions differing from standards
- ❌ Prune: Obvious patterns covered in training data
- 📦 Skill candidate: Large reference sections used occasionally

### Skill Candidate Criteria

Extract to project-specific skill if:
1. **>100 lines** (worth progressive disclosure overhead)
2. **Used <50% of sessions** (not always relevant)
3. **Reference material vs workflow** (not enforcement)
4. **Project-specific** (perfect for `.claude/skills/`)

**Example candidates:**
- Testing patterns (150 lines, only relevant when writing tests)
- Architecture history (useful context, rarely needed)
- Git/CI workflows (100 lines, only relevant during git ops)

### Safe Execution Pattern

1. Backup to `.claude/.archive/YYYY-MM-DD/`
2. Create skill directories for extracted content
3. Prune source files
4. Update any command references
5. Test workflow still works
6. Commit with clear description

## Why Command vs Skill

**Command is better because:**
- Maintenance should be deliberate, not autonomous
- User controls timing of disruptive operation
- Fits cc-track's explicit workflow philosophy
- Provides checklist of changes
- User reviews decisions before pruning

## Benefits

1. **Context efficiency**: Reduce 26k tokens to ~15k by removing bloat
2. **Better relevance**: Keep only actionable, project-specific patterns
3. **Legitimate skill use case**: Project-specific skills for reference material
4. **Sustainable growth**: Prevents unbounded context accumulation
5. **Clarity**: Easier to find relevant information when less clutter

## Implementation Notes

**Interactive prompts needed:**
```
decision_log.md entry #23: 'Run commands from /tmp to avoid recursion'
This looks like a bug fix, not a decision. Archive? [y/n]

system_patterns.md has 150 lines of testing guidance.
Only relevant when writing tests.
Create '.claude/skills/testing-patterns/SKILL.md'? [y/n]
```

**Skill structure for extracted content:**
```
.claude/skills/testing-patterns/
├── SKILL.md
│   ---
│   name: TypeScript Testing Patterns
│   description: Advanced testing patterns for this project including dependency injection, parallel execution, integration testing. Use when writing or reviewing test files.
│   ---
└── examples/ (optional)
```

## Open Questions

1. How often should users run this? Every N tasks? On-demand only?
2. Should it be part of `/complete-task` workflow as optional step?
3. What's the minimum viable version? Just pruning, or include skill extraction from start?
4. Should there be automatic detection of "you should run maintenance" based on file sizes?

## Related Features

- Progressive disclosure (skills system)
- Project-specific skills (`.claude/skills/`)
- Context optimization
- Workflow automation

## Next Steps

1. Draft command implementation
2. Create pruning rule engine
3. Build skill candidate detector
4. Test on actual cc-track context files
5. Iterate based on real usage patterns
