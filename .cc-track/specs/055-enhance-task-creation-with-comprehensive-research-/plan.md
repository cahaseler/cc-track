# Enhance Task Creation with Comprehensive Research Capabilities

**Purpose:** Replace the simple prompt-based task creation in capture-plan hook with a multi-turn research agent that can explore the codebase, identify knowledge gaps, and generate comprehensive task files with concrete implementation details.

**Status:** completed
**Started:** 2025-09-15 10:45
**Task ID:** 055

## Requirements
- [x] Create new function `enrichPlanWithResearch()` to replace `enrichPlanWithClaude()`
- [x] Implement multi-turn agent approach using Claude SDK `query()` method
- [x] Configure agent with up to 20 turns for comprehensive research
- [x] Set 10-minute timeout for thorough investigation
- [x] Enable Read, Grep, Glob tools for codebase exploration
- [x] Update enrichment prompt to instruct Claude to identify and research gaps
- [x] Generate task files that reference specific files and patterns in the codebase
- [x] Return full task content to Claude via systemMessage
- [ ] Add config option for research depth (turns/timeout)
- [x] Update tests to mock multi-turn SDK calls appropriately
- [x] Test timeout handling and verify research agent can read files

## Success Criteria
- [x] Task files contain concrete answers instead of vague "Open Questions & Blockers"
- [x] Technical approaches reference existing patterns found in the codebase
- [x] Requirements are specific and informed by actual code examination
- [x] Task files serve as complete implementation guides
- [x] Claude receives the enriched task content immediately after creation
- [x] Research agent can successfully explore codebase within timeout limits

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
- Completed comprehensive code review identifying security concerns and implementation issues
- Discovered critical security issue: Write tool access is not actually restricted to intended directories
- Analysis revealed need for configurable research depth settings and improved type safety

## Current Focus

Code review phase completed. Three key issues identified for potential fixes:
1. Security concern: Write tool access not actually restricted to intended directories
2. Missing configuration options for research depth (turns/timeout) 
3. Type safety improvements needed for SDKMessage handling

## Open Questions & Blockers
- Critical security issue discovered: Write tool has unrestricted project access despite intended limitations
- Need to decide approach for fixing Write tool restrictions (remove tool, add validation, or accept risk)
- One uncompleted requirement: configurable research depth settings

## Next Steps
Task is ready for completion and testing in real usage.

<!-- github_issue: 54 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/54 -->
<!-- issue_branch: 54-enhance-task-creation-with-comprehensive-research-capabilities -->