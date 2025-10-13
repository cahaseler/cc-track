# Migrate from Claude Code SDK to Claude Agent SDK

**Purpose:** Upgrade from `@anthropic-ai/claude-code` to `@anthropic-ai/claude-agent-sdk` following the official migration guide. This is primarily a package rename with one critical breaking change: we must explicitly set the Claude Code system prompt to maintain existing behavior.

**Status:** in_progress
**Started:** 2025-10-13 15:01
**Task ID:** 099

## Requirements

- [ ] Update package.json dependency from `@anthropic-ai/claude-code: ^1.0.112` to `@anthropic-ai/claude-agent-sdk: ^1.0.0`
- [ ] Update 9 import statements across 5 TypeScript files from `'@anthropic-ai/claude-code'` to `'@anthropic-ai/claude-agent-sdk'`
- [ ] Update 2 CLI path references from `claude-code/cli.js` to `claude-agent-sdk/cli.js`
- [ ] Add explicit Claude Code system prompt configuration to all 6 query() calls to prevent behavioral changes
- [ ] Verify compilation with TypeScript (`bun run typecheck`)
- [ ] Run all tests to ensure compatibility (`bun test`)
- [ ] Build CLI and perform basic smoke tests

## Success Criteria

- All TypeScript files compile without errors
- All 366 existing tests pass
- Built CLI functions identically to previous version
- No runtime errors when using Claude SDK features
- System prompt behavior matches previous version exactly

## Technical Approach

### 1. Package Management
Replace dependency in package.json and install new package using Bun.

### 2. Import Statement Updates
Update all import statements across these specific files:
- `src/lib/claude-sdk.ts` (3 import statements at lines 11-18)
- `src/lib/code-review/claude.ts` (2 import statements at lines 2-8)
- `src/hooks/capture-plan.ts` (2 import statements at lines 4, 6)
- `test-model-alias.ts` (1 import statement at line 5)
- `src/hooks/capture-plan.test.ts` (1 mock module statement)

### 3. Path Reference Updates
Update CLI executable paths in:
- `scripts/bench-stop-review.ts:12` - Update from `@anthropic-ai/claude-code/cli.js`
- `src/lib/claude-sdk.ts:81` - Update fallback path reference in findClaudeCodeExecutable()

### 4. System Prompt Configuration
The critical breaking change: add explicit Claude Code system prompt to all query() calls to maintain current behavior. Without this, the new SDK uses an empty system prompt by default.

## Implementation Details

### Import Statement Pattern
```typescript
// Before
import type { ... } from '@anthropic-ai/claude-code';
import { query } from '@anthropic-ai/claude-code';

// After
import type { ... } from '@anthropic-ai/claude-agent-sdk';
import { query } from '@anthropic-ai/claude-agent-sdk';
```

### System Prompt Configuration Pattern
Add this option to all query() calls:
```typescript
systemPrompt: { type: "preset", preset: "claude_code" }
```

### Specific Files and Query() Locations

**src/lib/claude-sdk.ts** (3 query calls):
- Line ~119 in prompt() function
- Line ~380 in createValidationAgent() function
- Line ~452 in performCodeReview() function

**src/hooks/capture-plan.ts** (1 query call):
- Line ~240 in enrichPlanWithResearch() function

**src/lib/code-review/claude.ts** (1 query call):
- Line ~70 in performClaudeReview() function

**test-model-alias.ts** (1 query call):
- Line ~11 in testModelAlias() function

### Path Reference Updates
Update these specific lines:
```typescript
// scripts/bench-stop-review.ts:12
const localClaudeCli = resolve(projectRoot, 'node_modules', '@anthropic-ai', 'claude-agent-sdk', 'cli.js');

// src/lib/claude-sdk.ts:81 in findClaudeCodeExecutable()
const localCli = `${process.cwd()}/node_modules/@anthropic-ai/claude-agent-sdk/cli.js`;
```

## Current Focus

Start with package.json update and imports, then add system prompt configuration to maintain exact behavioral compatibility.

- Begin with: `package.json:57` - Replace dependency
- Then update: All import statements in the 5 identified files
- Critical step: Add `systemPrompt: { type: "preset", preset: "claude_code" }` to all 6 query() calls

## Research Findings

- **Current dependency:** `@anthropic-ai/claude-code: ^1.0.112` at package.json:57
- **Import locations identified:** 5 files with 9 total import/mock statements
- **Query() calls found:** 6 locations across 3 files that need system prompt configuration
- **Path references:** 2 CLI path references in bench script and SDK fallback
- **No other breaking changes:** The migration guide confirms this is primarily a rename with the system prompt being the only behavioral change
- **Test coverage:** 366 existing tests provide good coverage to catch regressions

## Next Steps

1. Update package.json dependency and run `bun install`
2. Update all 9 import statements across 5 files
3. Update 2 CLI path references
4. Add system prompt configuration to all 6 query() calls
5. Run `bun run typecheck` to verify compilation
6. Run `bun test` to verify all tests pass
7. Build CLI with `bun run build` and test basic operations
8. Compare behavior with previous version to ensure no regressions

## Open Questions & Blockers

No genuine unknowns identified - the migration path is well-documented and straightforward. All necessary files and line numbers have been identified through codebase research.

<!-- github_issue: 143 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/143 -->
<!-- issue_branch: 143-migrate-from-claude-code-sdk-to-claude-agent-sdk -->