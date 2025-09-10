# Claude Code Research Plan - Status Update

## Priority 1: Core Claude Code Mechanics

### Hooks System
- ✅ What hook events are available besides `user-prompt-submit-hook`?
  - **ANSWERED**: 8 events total: UserPromptSubmit, PreToolUse, PostToolUse, SessionStart, SessionEnd, PreCompact, Stop/SubagentStop, Notification

- ✅ How are hooks configured (config file format, location)?
  - **ANSWERED**: JSON format in ~/.claude/settings.json or .claude/settings.json

- ✅ What data/context is passed to hook scripts?
  - **ANSWERED**: JSON via stdin with session_id, transcript_path, cwd, hook_event_name, plus event-specific fields

- ✅ Can hooks communicate back to Claude beyond blocking?
  - **ANSWERED**: Yes, via JSON output fields: decision, reason, suppressOutput, systemMessage, additionalContext

- ✅ Performance implications of hook execution
  - **ANSWERED**: 60s default timeout, parallel execution, adds 3-4s for headless CLI calls

- ❌ Can hooks modify the prompt before Claude sees it?
  - **ANSWERED**: No, can only block or add context, not modify

- ✅ What's the execution order if multiple hooks are defined?
  - **ANSWERED**: All matching hooks run in parallel

### Context Management
- ✅ How does the 160k token limit work exactly?
  - **ANSWERED**: Automatic compaction triggers at 160k tokens

- ❌ What algorithm does `/compact` use for summarization?
  - **UNANSWERED**: Algorithm details not documented

- ⚠️ Can we intercept or customize the compaction process?
  - **PARTIAL**: PreCompact hook fires but can't block; we can backup/process transcript before compaction

- ✅ How does Claude Code decide what files to include in context?
  - **ANSWERED**: It doesn't auto-include files. Context = CLAUDE.md + conversation summaries + recently viewed files only

- ❌ Is there a way to mark certain content as "always include" or "never compact"?
  - **ANSWERED**: No built-in way, but we can use CLAUDE.md imports as workaround

- ⚠️ How does context persist between conversations?
  - **PARTIAL**: Transcript files in ~/.claude/projects/, but exact persistence mechanism unclear

### CLAUDE.md Features
- ✅ Can CLAUDE.md programmatically include other files?
  - **ANSWERED**: YES! Using @path/to/import syntax

- ❌ What's the exact loading order/priority of multiple CLAUDE.md files?
  - **UNANSWERED**: Priority order not fully documented

- ✅ Are there special directives or syntax beyond markdown?
  - **ANSWERED**: @import syntax, recursive up to 5 levels

- ✅ How to reference external files from CLAUDE.md?
  - **ANSWERED**: @path/to/file, @~/path, relative and absolute paths supported

### Planning Mode
- ❌ What triggers planning mode?
  - **UNANSWERED**: Not documented in findings

- ❌ How does planning mode differ from normal mode?
  - **UNANSWERED**: Not documented

- ❌ Can we programmatically enter/exit planning mode?
  - **UNANSWERED**: ExitPlanMode tool exists but entry method unclear

- ❌ What's stored when a plan is created?
  - **UNANSWERED**: Not documented

## Priority 2: CLI and Automation

### Headless CLI
- ⚠️ Full command syntax for `claude code` CLI
  - **PARTIAL**: Basic commands documented, full syntax unclear

- ❌ How to pass context to headless invocations
  - **UNANSWERED**: Not fully documented

- ✅ Performance characteristics of CLI calls
  - **ANSWERED**: 3-4s overhead per call

- ❌ Can we pipe/stream between CLI instances?
  - **UNANSWERED**: Not documented

- ❌ Error handling in headless mode
  - **UNANSWERED**: Not documented

### Available Commands
- ⚠️ Full list of slash commands beyond `/compact`
  - **PARTIAL**: /memory, /model, /agents, /config, /help, /clear, /mcp, /init documented

- ❌ Any undocumented commands or flags?
  - **UNKNOWN**: Possibly

- ✅ Can custom commands be defined?
  - **ANSWERED**: Yes, in .claude/commands/ with YAML frontmatter

## Priority 3: Integration Points

### Subagents/Tasks
- ❌ How do subagents maintain context?
  - **ANSWERED**: They don't - they lose parent context

- ❌ Can subagents communicate with parent session?
  - **ANSWERED**: No, one-way final report only

- ⚠️ What causes subagent API errors mentioned in cc-sessions?
  - **PARTIAL**: Mentioned but root cause unclear

- ❌ Best practices for subagent reliability
  - **UNANSWERED**: Not documented

### File System Integration
- ❌ How does Claude Code track file changes?
  - **UNANSWERED**: Not documented

- ❌ Can we use file watchers to trigger behaviors?
  - **UNANSWERED**: Not documented

- ❌ Limitations on file operations
  - **UNANSWERED**: Not fully documented

### MCP (Model Context Protocol)
- ✅ How does MCP integration work?
  - **ANSWERED**: Add servers via CLI, tools named mcp__server__tool

- ✅ Can we create custom MCP servers for this project?
  - **ANSWERED**: Yes, stdio/HTTP transport supported

- ❌ Performance implications of MCP vs direct tool use
  - **UNANSWERED**: Not documented

## Priority 4: Existing Solutions Analysis

### cc-sessions Tool
- ❌ What specific features work well?
  - **TODO**: Need to examine source

- ❌ What causes the context issues mentioned?
  - **TODO**: Need to examine source

- ❌ Can we extract the task staging approach?
  - **TODO**: Need to examine source

- ❌ How does it handle context gathering?
  - **TODO**: Need to examine source

### tdd-guard Workflow
- ❌ Can we optimize the context passing to reduce latency?
  - **TODO**: Need to examine implementation

- ❌ Alternative approaches to enforce TDD without per-edit hooks?
  - **TODO**: Need to explore

- ❌ Can we batch validations?
  - **TODO**: Need to test

## Questions Arising from Your Answers

### Task Management
- ✅ How to automatically append task files to CLAUDE.md?
  - **ANSWERED**: Use @import syntax!

- ⚠️ Best format for task persistence across sessions?
  - **PARTIAL**: Markdown files work, exact format TBD

- ❌ How to map tasks to git branches/PRs automatically?
  - **TODO**: Need to design

### Validation Hooks
- ❌ How to detect when Claude claims task completion?
  - **TODO**: Parse output or use Stop hook

- ❌ Can we parse Claude's output to trigger validation?
  - **TODO**: Need to test with transcript files

- ⚠️ How to run subagent review without losing main context?
  - **PARTIAL**: Can't share context, but can pass specific files

### Context Preservation
- ✅ Can we build a "context index" of key facts (DB type, utilities, etc.)?
  - **ANSWERED**: Yes, via imported files that hooks update

- ✅ How to ensure critical details survive compaction?
  - **ANSWERED**: Keep in imported files, update via hooks

- ✅ Can we use the journal tool strategically for this?
  - **ANSWERED**: Yes, journal persists and is searchable

### Performance
- ✅ What's the overhead of various hook types?
  - **ANSWERED**: 60s timeout, parallel execution

- ❌ Can we use compiled Bun executables to reduce latency?
  - **TODO**: Need to test

- ⚠️ Optimal balance between prompt rules vs hook enforcement?
  - **PARTIAL**: Use prompts for guidance, hooks for critical enforcement

## Key Discoveries

### Game Changers
1. **CLAUDE.md can import files** - This solves our context management!
2. **Transcript files are accessible** - We can parse conversation history
3. **Hooks can inject context** - Via additionalContext field
4. **Custom commands supported** - Can build our own slash commands

### Remaining Unknowns
1. Planning mode mechanics
2. Compaction algorithm details
3. File inclusion logic
4. Headless CLI full capabilities
5. File watching possibilities

### Next Steps
1. Examine cc-sessions source code
2. Test hook performance with Bun
3. Design context preservation system using imports
4. Create proof-of-concept hooks