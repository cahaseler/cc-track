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
- investigate why post plan hook is failing to create tasks at all. This seems to have been introduced when we swapped the model to sonnet.
- improve handling for commits not associated with a task. Instead of marking them as generic wip commits, give them a real commit message based on the content (use haiku). Programattically detect 3 or more non-task associated commits in a row, and add a gentle suggestion that the user might want to create a new task by turning on planning mode.
- optional full github support with automatic issue creation for tasks, connection of issue branches to said issues, and PRs instead of merges during task completion.
- preparation for push functionality. Possibly this is simply an optional part of task completion. Basically, cleanup with knip, lint, format, typecheck, etc, enforced by pre-push hooks.
- centralized logging. right now various hooks log to various places. having a centralized system to log all relevant hook, command, etc activity to .claude/logs/ would make things easier to manage and make code cleaner.
- tutorial mode for cc-pars. Possibly extra prompt content, possibly an entirely new 'output style'. Basically, when this is enabled, Claude has additional context on the intended cc-pars workflow and nudges the user more explicitly with reminders of commands, using tasks, what the next step is, etc.
- packaging and distribution, installer, initial installation flow.
- [2025-09-10] post edit hook that runs things like single-file typecheck, linting, maybe unit tests (if quick)
- [2025-09-10] test parsing of special characters like (parentheses)
