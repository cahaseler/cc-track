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
- [2025-09-10] investigate supressing file change notifications to certain folders like logs to avoid noise injection into context.
- [2025-09-11] code review command that invokes long running code review agent, optionally using claude cli or codex cli
- npm? or whatever bunx uses?
- [2025-09-11] improve review system's ability to validate extremely large diffs via multi-tiered summary or other approaches
- [2025-09-11] investigate consistent issues with pre-compaction hook when invoked on manual compaction
- [2025-09-11] break task completion into two phases to allow better automation of pre-completion cleanup and documentation, linting, fixes, etc, followed by a second phase with the automated git actions, file updates, etc. claude code commands system currently works by running scripts then passing results to claude for things that can't be easily scripted, but our workflow really needs script (for checks), claude (for fixes and documentation and reflection), then another script (for squash, push, branch swap). So breaking it into two commands seems the best approach.
- [2025-09-11] clean up duplicated helper functions as documented in the task 028 code review from codex agent
- [2025-09-11] investigate Claude Code typescript SDK as alternative to invoking cli tool, evaluate benefits, drawbacks, implement if reasonable
- Fix broken "💡 I notice you've made 11 commits without an active task. Consider using planning mode (shift-tab) to create a task for better tracking." message from triggering when I have an active task. Possibly due to commits not including the active task ID when they should
- Add automatic file header summaries for all TypeScript files. Each file should start with a block comment containing a one-sentence ai-written summary plus an auto-generated `@exports` list of functions/classes with line numbers. Use the TypeScript compiler API in a Node script to parse ASTs, extract exports, and update headers. Wire it into a pre-commit or post-edit hook so the `@exports` section stays current without manual edits. This makes files self-describing in the first 20 lines for AI tools and repo navigation.

- [2025-09-12] adjust edit-validation hook to not output typecheck errors for test files
- [2025-09-12] exclude private joural embeddings from stop-review hook to avoid false overreactions
- [2025-09-12] add enforcement mechanism to stop-review hook to flag when AI updates task files or otherwise claims task completion when there are obviously still open issues like failing tests, lint errors, etc
- [2025-09-12] Rename master branch to main for modern git conventions. This will likely involve code updates too that make assumptions about the default branch. We should make the default branch name configurable for the purposes of our code.
