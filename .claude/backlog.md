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
- [2025-09-11] code review command that invokes long running code review agent, optionally using claude cli or codex cli
- [2025-09-11] investigate consistent issues with pre-compaction hook when invoked on manual compaction (Known Claude Code bug: https://github.com/anthropics/claude-code/issues/7530)
- Add automatic file header summaries for all TypeScript files. Each file should start with a block comment containing a one-sentence ai-written summary plus an auto-generated `@exports` list of functions/classes with line numbers. Use the TypeScript compiler API in a Node script to parse ASTs, extract exports, and update headers. Wire it into a pre-commit or post-edit hook so the `@exports` section stays current without manual edits. This makes files self-describing in the first 20 lines for AI tools and repo navigation.
- extract prompts into dedicated config file sections (or their own files? to allow for users to more easily customize them) (may not be practical depending on how dynamically we're building them)
- [2025-09-15] improve task creation with multi-turn claude code sdk invocation in the current working directory instructing claude to investigate any open questions and provide explicit detailed answers in the task file. Also see if we can return a message instructing claude to read this new task file after it's created.
