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
- [2025-09-10] revise review_stop hook to have a claude instance review recent chat messages for AI bullshit excuses like functional enough or not critical functionality when it's trying to avoid completing a task properly
- [2025-09-11] code review command that invokes long running code review agent, optionally using claude cli or codex cli
- [2025-09-11] investigate consistent issues with pre-compaction hook when invoked on manual compaction (Known Claude Code bug: https://github.com/anthropics/claude-code/issues/7530)
- Add automatic file header summaries for all TypeScript files. Each file should start with a block comment containing a one-sentence ai-written summary plus an auto-generated `@exports` list of functions/classes with line numbers. Use the TypeScript compiler API in a Node script to parse ASTs, extract exports, and update headers. Wire it into a pre-commit or post-edit hook so the `@exports` section stays current without manual edits. This makes files self-describing in the first 20 lines for AI tools and repo navigation.
- extract prompts into dedicated config file sections (or their own files? to allow for users to more easily customize them) (may not be practical depending on how dynamically we're building them)
- [2025-09-13] improve stop-review hook prompt to reduce false positives when user explicitly requests deletions or changes
- [2025-09-15] adjust task completion and prep prompts to do all doc updates like progress log and clearing backlog item after the prep, rather than after the task completion, to avoid having to make documentation merges on main
- [2025-09-15] configurable option to use edit validation hook to block any claude initiated writes and edits to non-gitignored files when on the default branch, to force use of feature branches. Probably pair this with better instructions inside the no_active_task file to guide Claude while in this mode.
- [2025-09-15] update capture-plan hook to NOT create a new task and branch and such if there is already an active task, instead have it respond in a way that's visible to Claude telling it to please update the active task file to capture the new plan+requirements - or if this was intended to be a new task, to have the user complete the current task or otherwise set the active task file to reflect no active task.
