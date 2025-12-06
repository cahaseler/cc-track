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
- [2025-12-06] Update the commands that mention other commands to use their cc-track names like "/cc-track:plan" rather than "/plan" which is now a native claude code command to avoid confusion
- [2025-12-06] Improve task generate mode to explicitly plan which sets of tasks can be assigned to subagents, which subagents to use, workflow for validating subagent work, etc. Take guidance from anthropic's feature dev skill and obrajesse's superpowers skills.
- [2025-12-06] Add color to dead-code-detector agent output
- [2025-12-06] Revisit pre-tool-validation hook to verify it still functions correctly with spec-driven system - may need to change which files it protects (tasks.md vs other spec files)
