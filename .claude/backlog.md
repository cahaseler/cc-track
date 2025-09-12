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
- tutorial mode for cc-track. Possibly extra prompt content, possibly an entirely new 'output style'. Basically, when this is enabled, Claude has additional context on the intended cc-track workflow and nudges the user more explicitly with reminders of commands, using tasks, what the next step is, etc.
- packaging and distribution, installer, initial installation flow.
- [2025-09-10] revise review_stop hook to have a claude instance review recent chat messages for AI bullshit excuses like functional enough or not critical functionality when it's trying to avoid completing a task properly
- [2025-09-11] code review command that invokes long running code review agent, optionally using claude cli or codex cli
- npm? or whatever bunx uses?
- [2025-09-11] improve review system's ability to validate extremely large diffs via multi-tiered summary or other approaches
- [2025-09-11] investigate consistent issues with pre-compaction hook when invoked on manual compaction
- [2025-09-11] investigate Claude Code typescript SDK as alternative to invoking cli tool, evaluate benefits, drawbacks, implement if reasonable
- Add automatic file header summaries for all TypeScript files. Each file should start with a block comment containing a one-sentence ai-written summary plus an auto-generated `@exports` list of functions/classes with line numbers. Use the TypeScript compiler API in a Node script to parse ASTs, extract exports, and update headers. Wire it into a pre-commit or post-edit hook so the `@exports` section stays current without manual edits. This makes files self-describing in the first 20 lines for AI tools and repo navigation.
- [2025-09-12] add enforcement mechanism to stop-review hook to flag when AI updates task files or otherwise claims task completion when there are obviously still open issues like failing tests, lint errors, etc
- improve pre-compaction tools substantially to automatically update task list, potentially write journal entry too to avoid post-compact confusion.
- extract prompts into dedicated config file sections (or their own files? to allow for users to more easily customize them) (may not be practical depending on how dynamically we're building them)
- [2025-09-12] whenever the stop review hook makes a commit it should unobtrusively notify claude
