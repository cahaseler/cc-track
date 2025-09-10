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
- optional full github support with automatic issue creation for tasks, connection of issue branches to said issues, and PRs instead of merges during task completion.
- preparation for push functionality. Possibly this is simply an optional part of task completion. Basically, cleanup with knip, lint, format, typecheck, etc, enforced by pre-push hooks.
- tutorial mode for cc-pars. Possibly extra prompt content, possibly an entirely new 'output style'. Basically, when this is enabled, Claude has additional context on the intended cc-pars workflow and nudges the user more explicitly with reminders of commands, using tasks, what the next step is, etc.
- packaging and distribution, installer, initial installation flow.
- [2025-09-10] post edit hook that runs things like single-file typecheck, linting, maybe unit tests (if quick)
- [2025-09-10] revise review_stop hook to have a claude instance review recent chat messages for AI bullshit excuses like functional enough or not critical functionality when it's trying to avoid completing a task properly
- [2025-09-10] investigate supressing file change notifications to certain folders like logs to avoid noise injection into context.
- [2025-09-10] add current api window time remaining to statusbar when model is Sonnet 4, since that's the countdown until Opus is allowed again.
- [2025-09-10] make /complete-task command more resilient - should update CLAUDE.md active task field when closing out a task
- [2025-09-10] make deviation detection in stop_review hook more tolerant of documentation updates (updating learned_mistakes.md should never be considered a deviation)
