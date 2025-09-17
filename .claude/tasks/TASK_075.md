# Fix setup-cc-track command bash execution for non-git repos

**Purpose:** Fix bash command execution in setup-cc-track.md that fails when the project is not a git repository or GitHub CLI is not authenticated by adding proper error handling with `|| echo` fallbacks.

**Status:** in_progress
**Started:** 2025-09-17 18:51
**Task ID:** 075

## Requirements
- [ ] Fix line 66 in src/commands/init.ts: Change `!\`git status 2>&1\`` to `!\`git status 2>&1 || echo "Not a git repository"\``
- [ ] Fix line 67 in src/commands/init.ts: Change `!\`gh auth status 2>&1\`` to `!\`gh auth status 2>&1 || echo "GitHub CLI not authenticated or not installed"\``
- [ ] Fix line 20 in .claude/commands/setup-cc-track.md: Add same git status fallback
- [ ] Fix line 21 in .claude/commands/setup-cc-track.md: Add same gh auth status fallback
- [ ] Verify existing tests in src/commands/init.test.ts still pass after changes
- [ ] Remove the backlog item "setup-cc-track command fails when project is not a git repo" from .claude/backlog.md

## Success Criteria
- Setup command executes successfully in non-git repositories
- Bash commands provide helpful error messages when git/gh tools are unavailable
- Commands return success exit codes (0) instead of failing
- All existing tests pass
- Command continues to work normally when git/gh are available

## Technical Approach
The issue occurs because slash commands in Claude Code with `!` prefix fail if the bash command returns a non-zero exit code, even when stderr is redirected with `2>&1`. The solution is to use the `|| echo` pattern established throughout the codebase to ensure commands always return success while providing informative output.

### Pattern Analysis
From codebase research, the established pattern for handling potentially failing commands is:
```bash
command 2>&1 || echo "helpful error message"
```

This pattern is used in:
- `.claude/plans/006.md:30`: `git branch --show-current 2>/dev/null || echo "no-git"`
- `src/lib/validation.ts:184`: `bun test 2>&1 || true`
- `.git/hooks/pre-push:53-55`: Multiple uses of `|| echo "0"`

## Implementation Details

### Files to Modify

#### 1. src/commands/init.ts (Primary Fix)
**Line 66** (currently):
```typescript
!\`git status 2>&1\`
```
**Change to**:
```typescript
!\`git status 2>&1 || echo "Not a git repository"\`
```

**Line 67** (currently):
```typescript
!\`gh auth status 2>&1\`
```
**Change to**:
```typescript
!\`gh auth status 2>&1 || echo "GitHub CLI not authenticated or not installed"\`
```

#### 2. .claude/commands/setup-cc-track.md (Existing Files)
**Line 20** (currently):
```markdown
!`git status 2>&1`
```
**Change to**:
```markdown
!`git status 2>&1 || echo "Not a git repository"`
```

**Line 21** (currently):
```markdown
!`gh auth status 2>&1`
```
**Change to**:
```markdown
!`gh auth status 2>&1 || echo "GitHub CLI not authenticated or not installed"`
```

#### 3. .claude/backlog.md
Remove line 25: `- [2025-09-17] setup-cc-track command fails when project is not a git repo`

### Error Message Design
The error messages follow existing codebase conventions:
- **Git**: "Not a git repository" (matches existing pattern from plans/006.md)
- **GitHub CLI**: "GitHub CLI not authenticated or not installed" (descriptive and actionable)

Both messages provide clear information about the state without being alarming, allowing the setup process to continue gracefully.

## Current Focus
Start with fixing the template in src/commands/init.ts (lines 66-67) as this is the source of truth for new setup commands. Then update the existing .claude/commands/setup-cc-track.md file.

## Research Findings
- **Command Structure**: Setup command is created by init.ts and written to .claude/commands/setup-cc-track.md
- **Error Pattern**: `2>&1 || echo "message"` is the established pattern for graceful command failures
- **Allowed Tools**: Both git status and gh auth status are explicitly listed in allowed-tools
- **Test Coverage**: src/commands/init.test.ts covers the init command functionality
- **Embedding**: setup-cc-track.md is NOT embedded (skipped in scripts/embed-resources.ts:33)
- **Dual Fix Required**: Both the template in init.ts AND existing .claude/commands/setup-cc-track.md need updating

## Next Steps
1. Edit src/commands/init.ts lines 66-67 to add `|| echo` fallbacks
2. Edit .claude/commands/setup-cc-track.md lines 20-21 to add same fallbacks  
3. Run tests with `bun test src/commands/init.test.ts` to verify no regressions
4. Remove completed backlog item from .claude/backlog.md
5. Test setup command in a non-git directory to verify fix works

## Open Questions & Blockers
None - all technical details have been researched and verified. The fix is straightforward pattern application using established codebase conventions.