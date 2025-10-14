# Fix prepare-completion Command Path Issue

**Purpose:** Fix mismatch between embedded command templates and npm package requirements by updating all command templates to use `npx cc-track` prefix for proper external project compatibility.

**Status:** completed
**Started:** 2025-09-17 15:32
**Task ID:** 073

## Requirements
- [ ] Update prepare-completion.md template to use `npx cc-track prepare-completion`
- [ ] Update complete-task.md template to use `npx cc-track complete-task`
- [ ] Update add-to-backlog.md template to use `npx cc-track backlog`
- [ ] Update task-from-issue.md template to use `npx cc-track task-from-issue`
- [ ] Update allowed-tools patterns to use `npx cc-track` prefix
- [ ] Rebuild binary to include updated embedded resources
- [ ] Test that embedded templates work correctly in external projects

## Success Criteria
- All embedded command templates use `npx cc-track` prefix
- External projects can run `/prepare-completion` successfully after npm install
- Build includes the updated embedded resources
- No more path mismatch issues when users install cc-track via npm

## Technical Approach

### Current State Analysis
Based on research, the issue is clear:

1. **Embedded templates** (in `src/lib/embedded-resources.ts`) use bare `cc-track` commands
2. **Working templates** (in `.claude/commands/`) use absolute paths like `/home/ubuntu/projects/cc-pars/dist/cc-track`
3. **Setup system** (in `src/commands/init.ts`) correctly uses `npx cc-track` pattern
4. **When npm-installed**, external projects need `npx cc-track` to find the global package

### Files That Need Updates
Source templates in `src/commands/slash-commands/`:
- `prepare-completion.md:2,8` - Change `cc-track` to `npx cc-track`
- `complete-task.md:2,10` - Change `cc-track` to `npx cc-track`
- `add-to-backlog.md:5,8` - Change `cc-track` to `npx cc-track`
- `task-from-issue.md:2,8` - Change `cc-track` to `npx cc-track`

### Build Process
The `prebuild` script at line 36 in package.json runs `embed-resources.ts` which:
1. Reads templates from `src/commands/slash-commands/`
2. Embeds them as string literals in `src/lib/embedded-resources.ts`
3. Gets compiled into the binary

## Implementation Details

### Pattern Analysis from Existing Code
- **Setup commands use:** `npx cc-track hook`, `npx cc-track statusline` (lines 272-418 in `src/commands/init.ts`)
- **Current embedded templates use:** `cc-track prepare-completion` (line 21 in `src/lib/embedded-resources.ts`)
- **Working local templates use:** `/home/ubuntu/projects/cc-pars/dist/cc-track prepare-completion` (line 8 in `.claude/commands/prepare-completion.md`)

### Specific Changes Required

#### 1. prepare-completion.md (src/commands/slash-commands/)
```markdown
# Before:
allowed-tools: Bash(cc-track prepare-completion), ...
!`cc-track prepare-completion`

# After:
allowed-tools: Bash(npx cc-track prepare-completion), ...
!`npx cc-track prepare-completion`
```

#### 2. complete-task.md (src/commands/slash-commands/)
```markdown
# Before:
allowed-tools: Bash(cc-track complete-task), ...
!`cc-track complete-task`

# After:  
allowed-tools: Bash(npx cc-track complete-task), ...
!`npx cc-track complete-task`
```

#### 3. add-to-backlog.md (src/commands/slash-commands/)
```markdown
# Before:
allowed-tools: Bash(cc-track backlog:*)
!`cc-track backlog "$ARGUMENTS"`

# After:
allowed-tools: Bash(npx cc-track backlog:*)
!`npx cc-track backlog "$ARGUMENTS"`
```

#### 4. task-from-issue.md (src/commands/slash-commands/)
```markdown
# Before:
allowed-tools: Bash(cc-track task-from-issue:*), ...
!`cc-track task-from-issue "$@"`

# After:
allowed-tools: Bash(npx cc-track task-from-issue:*), ...
!`npx cc-track task-from-issue "$@"`
```

## Current Focus

Task completed on 2025-09-17

## Research Findings

### Build System Understanding
- Source templates: `src/commands/slash-commands/*.md`
- Build script: `scripts/embed-resources.ts` (runs on prebuild)
- Embedded output: `src/lib/embedded-resources.ts` (auto-generated)
- Binary: `dist/cc-track` (includes embedded resources)

### Existing Patterns
- **Init system correctly uses:** `npx cc-track` throughout (`src/commands/init.ts`)
- **Working project uses:** Absolute paths (`.claude/commands/`)
- **Embedded templates use:** Bare `cc-track` (incorrect for npm installs)

### Validation Pattern
- Scripts run `bun run check` which includes `embed` step
- Must run rebuild after template changes
- Working commands are in `.claude/commands/` with absolute paths
- Embedded commands for external projects need `npx` prefix

### Dependencies Found
- Bun build system with embedded resources
- TypeScript compilation
- No external dependencies for templates
- Uses commander.js for CLI structure

## Next Steps
1. Update all four template files with `npx cc-track` prefix
2. Run `bun run embed` to regenerate embedded resources
3. Run `bun run build` to create new binary with updates
4. Test locally with `/prepare-completion` to verify
5. Verify embedded resources contain `npx` prefix in generated file

## Open Questions & Blockers
None - all technical details have been researched and documented. The solution is straightforward file updates followed by rebuild.

<!-- branch: bug/fix-prepare-completion-command-path-073 -->

<!-- github_issue: 90 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/90 -->
<!-- issue_branch: 90-fix-prepare-completion-command-path-issue -->
