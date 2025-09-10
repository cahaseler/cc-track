# Claude Code Research Plan

## Priority 1: Core Claude Code Mechanics

### Hooks System
- What hook events are available besides `user-prompt-submit-hook`?
- How are hooks configured (config file format, location)?
- What data/context is passed to hook scripts?
- Can hooks communicate back to Claude beyond blocking?
- Performance implications of hook execution
- Can hooks modify the prompt before Claude sees it?
- What's the execution order if multiple hooks are defined?

### Context Management
- How does the 160k token limit work exactly?
- What algorithm does `/compact` use for summarization?
- Can we intercept or customize the compaction process?
- How does Claude Code decide what files to include in context?
- Is there a way to mark certain content as "always include" or "never compact"?
- How does context persist between conversations?

### CLAUDE.md Features
- Can CLAUDE.md programmatically include other files?
- What's the exact loading order/priority of multiple CLAUDE.md files?
- Are there special directives or syntax beyond markdown?
- How to reference external files from CLAUDE.md?

### Planning Mode
- What triggers planning mode?
- How does planning mode differ from normal mode?
- Can we programmatically enter/exit planning mode?
- What's stored when a plan is created?

## Priority 2: CLI and Automation

### Headless CLI
- Full command syntax for `claude code` CLI
- How to pass context to headless invocations
- Performance characteristics of CLI calls
- Can we pipe/stream between CLI instances?
- Error handling in headless mode

### Available Commands
- Full list of slash commands beyond `/compact`
- Any undocumented commands or flags?
- Can custom commands be defined?

## Priority 3: Integration Points

### Subagents/Tasks
- How do subagents maintain context?
- Can subagents communicate with parent session?
- What causes subagent API errors mentioned in cc-sessions?
- Best practices for subagent reliability

### File System Integration
- How does Claude Code track file changes?
- Can we use file watchers to trigger behaviors?
- Limitations on file operations

### MCP (Model Context Protocol)
- How does MCP integration work?
- Can we create custom MCP servers for this project?
- Performance implications of MCP vs direct tool use

## Priority 4: Existing Solutions Analysis

### cc-sessions Tool
- What specific features work well?
- What causes the context issues mentioned?
- Can we extract the task staging approach?
- How does it handle context gathering?

### tdd-guard Workflow
- Can we optimize the context passing to reduce latency?
- Alternative approaches to enforce TDD without per-edit hooks?
- Can we batch validations?

## Questions Arising from Your Answers

### Task Management
- How to automatically append task files to CLAUDE.md?
- Best format for task persistence across sessions?
- How to map tasks to git branches/PRs automatically?

### Validation Hooks
- How to detect when Claude claims task completion?
- Can we parse Claude's output to trigger validation?
- How to run subagent review without losing main context?

### Context Preservation
- Can we build a "context index" of key facts (DB type, utilities, etc.)?
- How to ensure critical details survive compaction?
- Can we use the journal tool strategically for this?

### Performance
- What's the overhead of various hook types?
- Can we use compiled Bun executables to reduce latency?
- Optimal balance between prompt rules vs hook enforcement?

## Research Methods

1. **Documentation Review**
   - Official Claude Code docs (if available)
   - GitHub issues/discussions on anthropics/claude-code
   - Community forums or Discord

2. **Experimentation**
   - Test hook configurations with timing measurements
   - Trigger compaction intentionally to study behavior
   - Test CLAUDE.md include mechanisms

3. **Code Analysis**
   - Examine cc-sessions source for insights
   - Review tdd-guard implementation for optimization opportunities
   - Look for other community tools/scripts

4. **Testing Approaches**
   - Create minimal test cases for each feature
   - Measure performance impacts systematically
   - Document failure modes and edge cases

## Expected Outputs

- Technical specification document with all findings
- Decision matrix for which approaches to implement
- Performance baseline measurements
- List of hard constraints we need to work within