# Fix Missing Codex Review Option in Installation Instructions

**Purpose:** Update the setup instructions in `src/commands/init.ts` to include Codex CLI as a third code review option, ensuring users are aware of all available tools during setup.

**Status:** completed
**Started:** 2025-10-06 09:59
**Task ID:** 097

## Requirements

- [x] Add Codex CLI description to the code review section in setup template (line ~186-187)
- [x] Update configuration instruction to include 'codex' as valid tool option (line ~187)
- [x] Ensure the new instructions match the existing pattern and style
- [x] Verify that all three tools (claude, coderabbit, codex) are clearly differentiated in descriptions

## Success Criteria

- Setup command `/setup-cc-track` displays information about all three code review tools
- Configuration instruction shows complete tool union: `'claude' | 'coderabbit' | 'codex'`
- Descriptions help users understand the differences between tools (timing, approach, output)
- Documentation matches the actual implementation (verified working in codebase)

## Technical Approach

Based on research, the issue is in the `setup-cc-track.md` template content embedded in `/home/ubuntu/projects/cc-pars/src/commands/init.ts` lines 184-188. The current template only mentions two code review tools but the codebase fully supports three:

### Current Implementation Status
- **Codex Integration**: Fully implemented in `src/lib/code-review/codex.ts` with comprehensive testing
- **Type System**: `CodeReviewTool` type includes `'claude' | 'coderabbit' | 'codex'` in `src/lib/code-review/types.ts`
- **Configuration**: `getCodeReviewTool()` in `src/lib/config.ts` supports all three tools
- **Routing**: `src/lib/code-review/index.ts` has complete switch statement handling all tools
- **Testing**: Active usage in `.claude/track.config.json` with `"tool": "codex"`

### Missing Documentation
The setup template in `src/commands/init.ts` excludes Codex from user-facing instructions, creating a mismatch between documented and actual capabilities.

## Implementation Details

### Target File: `/home/ubuntu/projects/cc-pars/src/commands/init.ts`

**Location**: Lines 184-188 in the embedded template string for `/setup-cc-track` command

**Current Content** (lines 184-187):
```typescript
- Ask: "Which code review tool would you prefer?"
  - **Claude SDK** (default): Comprehensive agent-based review, ~10 minutes, thorough analysis
  - **CodeRabbit CLI**: Fast focused review, ~2-5 minutes, actionable feedback
- Set \`code_review: { enabled: true, tool: 'claude' | 'coderabbit' }\`
```

**Required Changes**:

1. **Add Codex Description** (after line 186):
```typescript
  - **Codex CLI**: Deep systematic review with autonomous agent, ~30+ minutes, exhaustive multi-pass analysis
```

2. **Update Configuration Line** (line 187):
```typescript
- Set \`code_review: { enabled: true, tool: 'claude' | 'coderabbit' | 'codex' }\`
```

### Pattern Analysis from Codebase
- **Tool Descriptions**: Follow pattern of `**Tool Name**: Description, timing, characteristics`
- **Timing Information**: Claude ~10min, CodeRabbit ~2-5min, Codex ~30+min (from `prepare-completion.ts:181`)
- **Tool Names**: "Claude SDK", "CodeRabbit CLI", "Codex CLI" (consistent naming pattern)

### Validation Pattern
From `src/commands/prepare-completion.ts:180-182`:
```typescript
const toolName =
  reviewTool === 'claude' ? 'Claude SDK' : reviewTool === 'coderabbit' ? 'CodeRabbit CLI' : 'Codex CLI';
const timeout = reviewTool === 'claude' ? '10' : '30';
```

This confirms the naming convention and timeout expectations for all three tools.

## Current Focus

Task completed on 2025-10-06

## Research Findings

- **Existing Pattern**: Found in `src/lib/code-review/` directory with complete implementation for Codex
- **Working Implementation**: `src/lib/code-review/codex.ts:22-158` shows fully functional Codex integration
- **Test Coverage**: `src/lib/code-review/codex.test.ts:1-239` provides comprehensive test suite
- **Configuration Support**: `src/lib/config.ts:35,277` includes proper TypeScript types for 'codex'
- **Active Usage**: `.claude/track.config.json:198` shows Codex configured as current review tool
- **Template Location**: Setup instructions are embedded as string literal in init command, not separate file

## Next Steps

1. Edit `src/commands/init.ts` line 186-187 to add Codex CLI description and update configuration instruction
2. Test by running `npx cc-track init` in test directory to verify output includes all three tools
3. Verify the displayed setup command (`/setup-cc-track`) mentions Codex CLI option

## Implementation Notes

- **String Template**: The setup content is embedded in init.ts as template literal, not external markdown file
- **Exact Location**: Lines 184-188 contain the code review tool selection section
- **Style Consistency**: Match existing bullet format and description pattern
- **Tool Characteristics**: Codex is autonomous, comprehensive, and takes longest (~30+ minutes vs 2-10 minutes for others)

## Recent Progress

**2025-10-06 14:08** - Task completed successfully
- Updated `src/commands/init.ts:184-188` to add Codex CLI as third code review option
- Added description: "Deep systematic review with autonomous agent, ~30+ minutes, exhaustive multi-pass analysis"
- Updated configuration instruction to show complete tool union: `'claude' | 'coderabbit' | 'codex'`
- All requirements met: three tools clearly differentiated by timing, approach, and thoroughness
- Code review by Codex CLI flagged CHANGELOG/package.json version mismatch (expected - semantic-release manages these)
- Fix is simple, complete, and follows existing pattern perfectly

<!-- github_issue: 138 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/138 -->
<!-- issue_branch: 138-fix-missing-codex-review-option-in-installation-instructions -->