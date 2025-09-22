# Document git.defaultBranch Configuration

**Purpose:** Document the existing but undocumented `git.defaultBranch` configuration option in README.md and template files to help users understand this feature.

**Status:** in_progress
**Started:** 2025-09-22 20:02
**Task ID:** 086

## Requirements
- [ ] Add `git.defaultBranch` configuration to README.md example configuration section (lines 87-103)
- [ ] Include explanation of when and why to use this setting in README.md
- [ ] Add commented git section with defaultBranch field to templates/track.config.json
- [ ] Add inline comment explaining the option in the template file
- [ ] Consider enhancing the brief mention in AGENTS.md with more detail

## Success Criteria
- Users can discover the git.defaultBranch option through README.md documentation
- Template configuration shows users what git configuration options are available
- Documentation explains the automatic detection fallback chain clearly
- No breaking changes to existing functionality

## Technical Approach
This is a documentation-only change that adds visibility to an existing feature. The `git.defaultBranch` configuration has been fully implemented since TASK_031 and TASK_084 with a comprehensive 5-step fallback detection chain.

## Implementation Details

### Current Implementation Status
The `git.defaultBranch` feature is fully functional in `src/lib/git-helpers.ts:50-148` with this priority order:
1. **track.config.json** - Highest priority (`config.git.defaultBranch`)
2. **GitHub API** - `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'`
3. **Git remote HEAD** - `git ls-remote --symref origin HEAD`  
4. **Git config** - `git config init.defaultBranch`
5. **Branch existence** - Check for local main/master branches
6. **Fallback** - Default to "main"

### Configuration Structure 
The configuration is defined in `src/lib/config.ts:39-42`:
```typescript
interface GitConfig {
  defaultBranch?: string;
  description?: string;
}
```

### Current Template Structure
The `templates/track.config.json` currently has all hooks/features disabled by default but no git section. This project's working config at `.claude/track.config.json:42-45` shows the pattern:
```json
"git": {
  "defaultBranch": "main",
  "description": "Default branch name for git operations (e.g., 'main' or 'master')"
}
```

### Documentation Patterns Found
1. **README.md structure**: Configuration section starts at line 83, shows example JSON at lines 89-102
2. **Template comments**: No inline comments in templates/track.config.json currently
3. **AGENTS.md mentions**: Brief references at lines 138 and 156 about the configuration path

## Current Focus
Start with README.md configuration documentation section at line 87-103

## Research Findings
- Feature implemented in TASK_031 (added config structure) and TASK_084 (enhanced detection)
- Configuration accessed via `getGitConfig()` function in `src/lib/config.ts:287-290`
- Used throughout codebase: complete-task, capture-plan, pre-tool-validation hooks
- Branch protection feature also uses getDefaultBranch() output at `src/hooks/pre-tool-validation.ts:180-184`
- Template follows pattern of showing all available options as disabled/commented examples

## Next Steps
1. Update README.md lines 89-102 to include git section in example configuration
2. Add explanation paragraph about when git.defaultBranch is useful
3. Add commented git section to templates/track.config.json
4. Review AGENTS.md for potential enhancement opportunity

## Open Questions & Blockers
None - this is purely documentation work for an existing, fully-functional feature.