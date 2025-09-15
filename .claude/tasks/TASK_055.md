# Enhance Task Creation with Comprehensive Research Capabilities

**Purpose:** Replace the simple prompt-based task creation in capture-plan hook with a multi-turn research agent that can explore the codebase, identify knowledge gaps, and generate comprehensive task files with concrete implementation details.

**Status:** completed
**Started:** 2025-09-15 10:45
**Task ID:** 055

## Requirements
- [ ] Create new function `enrichPlanWithResearch()` to replace `enrichPlanWithClaude()`
- [ ] Implement multi-turn agent approach using Claude SDK `query()` method
- [ ] Configure agent with up to 20 turns for comprehensive research
- [ ] Set 10-minute timeout for thorough investigation
- [ ] Enable Read, Grep, Glob tools for codebase exploration
- [ ] Update enrichment prompt to instruct Claude to identify and research gaps
- [ ] Generate task files that reference specific files and patterns in the codebase
- [ ] Return full task content to Claude via systemMessage
- [ ] Add config option for research depth (turns/timeout)
- [ ] Update tests to mock multi-turn SDK calls appropriately
- [ ] Test timeout handling and verify research agent can read files

## Success Criteria
- [ ] Task files contain concrete answers instead of vague "Open Questions & Blockers"
- [ ] Technical approaches reference existing patterns found in the codebase
- [ ] Requirements are specific and informed by actual code examination
- [ ] Task files serve as complete implementation guides
- [ ] Claude receives the enriched task content immediately after creation
- [ ] Research agent can successfully explore codebase within timeout limits

## Technical Approach
Replace the current single-prompt approach in `capture-plan.ts` with a multi-turn research agent that:
1. Uses `query()` directly instead of `prompt()` for multi-turn capability
2. Configures with maxTurns: 20, timeoutMs: 600000 (10 min)
3. Enables tools: ['Read', 'Grep', 'Glob'] for codebase exploration
4. Uses enhanced prompt that instructs Claude to identify gaps and research them
5. Returns systemMessage with full task content for immediate Claude visibility

## Recent Progress
- Successfully implemented `enrichPlanWithResearch()` function with multi-turn research capabilities
- Configured with 20 turns and 10-minute timeout for comprehensive investigation
- Enabled Read, Grep, Glob tools for codebase exploration
- Implemented Write tool with path restrictions using `canUseTool` to ensure security
- Research agent now writes task files directly to `.claude/tasks/` directory
- Added proper fallback to simple enrichment if research fails
- Fixed code duplication by exporting `findClaudeCodeExecutable` from claude-sdk.ts
- Applied same security improvements to code review feature (Write restricted to `code-reviews/`)
- Added bash timeout configuration to settings.json to support long-running operations

## Current Focus

Task completed on 2025-09-15

## Open Questions & Blockers
None - all technical issues have been resolved.

## Next Steps
Task is ready for completion and testing in real usage.

<!-- github_issue: 54 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/54 -->
<!-- issue_branch: 54-enhance-task-creation-with-comprehensive-research-capabilities -->