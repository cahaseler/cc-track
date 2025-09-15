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
- [2025-09-11] investigate consistent issues with pre-compaction hook when invoked on manual compaction (Known Claude Code bug: https://github.com/anthropics/claude-code/issues/7530)
- Add automatic file header summaries for all TypeScript files. Each file should start with a block comment containing a one-sentence ai-written summary plus an auto-generated `@exports` list of functions/classes with line numbers. Use the TypeScript compiler API in a Node script to parse ASTs, extract exports, and update headers. Wire it into a pre-commit or post-edit hook so the `@exports` section stays current without manual edits. This makes files self-describing in the first 20 lines for AI tools and repo navigation.
- extract prompts into dedicated config file sections (or their own files? to allow for users to more easily customize them) (may not be practical depending on how dynamically we're building them)
- [2025-09-15] improve task creation with multi-turn claude code sdk invocation in the current working directory instructing claude to investigate any open questions and provide explicit detailed answers in the task file. Also see if we can return a message instructing claude to read this new task file after it's created.
- [2025-09-15] block attempts to add stupid comments with the preToolUse hook
- [2025-09-15] review session start hook instructions, update them to account for new pre-compaction process, current rules duplicate work.
- [2025-09-15] adjust stop review prompt so it understands that security fixes and responding to code review feedback is part of the task. Maybe we include the code review feedback inside it's context too, if it exists.
- [2025-09-15] Clean up SDK type usage across codebase: Import proper types from @anthropic-ai/claude-code for all SDK interactions. Fix internal prompt() function to use typed options and messages. Add canUseTool restrictions where appropriate (e.g., createValidationAgent should probably restrict Write). Replace type assertions with proper type guards or document why they're safe. See capture-plan.ts lines 224-248 for correct implementation pattern.
- [2025-09-15] ensure stop-review prompt only includes messages sent since the last commit. Add hard cap to truncate extremely long message lists if they get too long anyway.
