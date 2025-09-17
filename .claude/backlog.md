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
- [2025-09-15] block attempts to add stupid comments with the preToolUse hook
- [2025-09-15] Enable interactive multi-turn code reviews with persistent sessions - allow Claude to reply to reviewer feedback, push back on criticisms, and have a dialogue about the changes
- [2025-09-16] Add targeted unit tests for `src/lib/claude-sdk.ts` (retry/timeout/fallback paths) once DI seams are ready
- [2025-09-16] Test quality improvements: Standardize mock patterns across 25+ test files, split complete-task.test.ts (365+ lines) into focused files, add integration tests for critical paths
- [2025-09-17] If Claude Code hook output bug isn't resolved by 2025-09-20, add comprehensive unit tests and first-class config support for the hook status statusline workaround
- [2025-09-17] Fix Claude SDK task creation copying branch comments from other files - The Claude SDK copies branch comment formatting from existing task files when creating new ones, causing conflicts with GitHub issue branch naming and breaking complete-task PR flow when branch names don't match. Need to improve prompt or add post-processing to remove these copied comments.
- [2025-09-17] setup-cc-track command fails when project is not a git repo
