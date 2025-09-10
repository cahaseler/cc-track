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
- 
