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
- [2025-12-06] Update prepare completion command to properly emulate the anthropic reviewer agent with the full process including seperate scoring agent, rather than the half-finished version that was implemented and allows the agent to take shortcuts.
- [2025-12-06] at least one of the review agents (not clear which) needs to be granted LS permissions and also denied the ability to write random crap to /tmp/
- [2025-12-06] tweak the specify command to tell claude he can create a task title and begin work, he doesn't need to check for approval of the task title unless he has no idea
- [2025-12-06] **Task 108 permission restrictions not working**: During Task 109 review, discovered that review agents are ignoring their `tools` field restrictions. Agents defined with `tools: Read, Grep, Glob, LS, Bash(git diff:*), ...` are still attempting arbitrary bash commands like `for file in agents/*.md; do...`, `cat > /tmp/check_requirements.sh << 'EOF'`, `bunx knip 2>&1 | tee /tmp/knip-output.txt`, etc. 5 of 8 review agents were interrupted because they tried to run disallowed commands. Root cause unclear: either (1) `tools` field in agent definitions doesn't restrict subagent capabilities, (2) agents inherit parent's full tool access regardless, or (3) Claude Code has a bug where agent tool restrictions aren't enforced. Need to research how agent tool restrictions actually work in Claude Code plugin system. This undermines the entire Task 108 goal of preventing permission escalation prompts and /tmp file pollution.
