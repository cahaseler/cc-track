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
- [2025-09-11] Add git pull to post-compaction workflow - ensure latest changes from GitHub are pulled after compaction restoration
- [2025-09-11] code review command that invokes long running code review agent, optionally using claude cli or codex cli
- npm? or whatever bunx uses?


## TypeScript Test Files Not Being Type-Checked [CRITICAL]
*Added: 2025-09-11*

**Problem:** The tsconfig.json excludes all *.test.ts files from TypeScript compilation, meaning test files can have massive type errors that go completely unnoticed. This just caused us to push broken test code to a release because:
- Pre-push hooks pass (they use tsc which ignores test files)
- Local 'bun test' runs fine (Bun runs tests despite type errors)
- Only the edit validation hook caught it, but that's easily missed

**Impact:** 
- We currently have 40+ TypeScript errors in stop-review.test.ts alone
- Other test files likely have similar issues
- Zero confidence that our test code is type-safe
- Tests can break in unexpected ways due to type mismatches

**Solution Required:**
1. Remove test file exclusion from tsconfig.json
2. Fix ALL TypeScript errors in ALL test files
3. Ensure pre-push hook catches test file type errors
4. Consider adding a specific test:typecheck script

**Priority:** CRITICAL - This is a fundamental quality issue. If we're using TypeScript, ALL our code should be type-checked, especially tests.
