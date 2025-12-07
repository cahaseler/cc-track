# Backlog

**Purpose:** Capture ideas, bugs, and future improvements without disrupting current work flow.

**Instructions:**
- Use `/add-to-backlog "your idea"` to add items
- Each item should be 1-2 sentences max
- These are NOT active tasks - just ideas for future consideration
- Items can be converted to tasks later using planning mode

---

## Items

<!-- Items will be added below -->
- [2025-09-16] Add targeted unit tests for claude-sdk.ts (retry/timeout/fallback paths)
- [2025-09-18] Add integration tests for critical paths (context management, git ops, hook chains, config propagation)
- [2025-09-23] Rewrite prompts to align with Spec-Driven Development principles
- [2025-12-06] Update the specify command to use the skills + scripts approach rather than giving claude multiple tasks for things like folder creation, metadata creation, git branching. Followup work to effort to move away from natural language instructions
- [2025-12-06] Improve task generate mode to explicitly plan which sets of tasks can be assigned to subagents, which subagents to use, workflow for validating subagent work, etc. Take guidance from anthropic's feature dev skill and obrajesse's superpowers skills.
- [2025-12-06] Update guidelines-reviewer agent definition to read spec.md/plan.md for task context before flagging 'unauthorized changes' - currently reviews in isolation without awareness of approved scope
- [2025-12-06] tweak the specify command to tell claude he can create a task title and begin work, he doesn't need to check for approval of the task title unless he has no idea
- [2025-12-07] Adjust code review agent guidelines to specify non-background parallel execution.