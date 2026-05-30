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
- [2025-12-14] Add new subagent to review agents tasked with identifying 'fallback' approaches, 'graceful degradation', and 'backwards compatibility' that simply masks failures with fake functionality or broken systems. Any backwards compatibility or fallbacks MUST be in the spec. Falling back to something that appears at first glance to be working but isn't makes it substantially harder to test AI generated code.
- [2025-01-09] BUG: Autoflow stop evaluation reports truncated context ("cuts off mid-sentence at 'For config-tr'"). Investigate whether the conversation context being passed to Claude SDK is being truncated, and if so why. May be a token limit issue or serialization problem in the stop hook.
- [2026-01-22] Claude Code v2.1.16 added native task system (TaskCreate/TaskUpdate/TaskList/TaskGet) with dependency tracking (blocks/blockedBy). Plan: Update /cc-track:tasks command to use native tasks for real-time orchestration during sessions - create tasks for each phase step (stub/test/implement/validate) with proper blockedBy relationships, update as subagents complete, then sync state back to tasks.md at checkpoints. Native tasks = session coordination layer, markdown = persistent record.
- [2026-05-30] Claude Code v2.1.154 added dynamic workflows (orchestration-as-code: Claude writes a JS script, a background runtime fans out subagents, intermediate results stay in script variables not the orchestrator's context). Plan: push cc-track's fan-out-heavy execution into saved `.claude/workflows/` scripts while keeping the conversational orchestrator as the spec/checkpoint/escalation shell. Pilot on the review fleet (lowest risk, matches /deep-research shape), then the 4-stage TDD cycle at checkpoint-group granularity. BLOCKING spike: confirm a workflow script can spawn custom subagent_types with their narrowed `tools` allowlist honored (not just session allowlist). Full design + straw-man script in docs/brainstorm/dynamic-workflows-tdd-orchestration.md; research in docs/research/claude-code-dynamic-workflows.md.
