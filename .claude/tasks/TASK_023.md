# Comprehensive Project Rename from cc-pars to TRACK

**Purpose:** Rename the entire project from "cc-pars" to "TRACK" (Task Review And Context Keeper), updating all references, documentation, commands, and configuration files to reflect the new branding while maintaining all existing functionality.

**Status:** planning
**Started:** 2025-09-10 19:34
**Task ID:** 023

## Requirements
- [ ] Rename main project directory from `cc-pars` to `track`
- [ ] Update package.json name field to "track"
- [ ] Update README.md with new name and tagline: "Keep your vibe coding on track"
- [ ] Rename `.claude/cc-pars.config.json` → `.claude/track.config.json`
- [ ] Update all config file lookup references to use new filename
- [ ] Rename `/init-cc-pars` command to `/init-track`
- [ ] Rename `/config-cc-pars` command to `/config-track`
- [ ] Update command documentation and help text
- [ ] Update all imports/references from "cc-pars" to "track" in code
- [ ] Update status line to show "TRACK" branding
- [ ] Update hook descriptions and comments
- [ ] Update product_context.md to reflect new name
- [ ] Update all documentation references from cc-pars to TRACK
- [ ] Add explanation of acronym where appropriate
- [ ] Update backlog references
- [ ] Update initialization scripts to use new name
- [ ] Update all error messages and user-facing text
- [ ] Update template files with new branding
- [ ] Test all hooks work with renamed config
- [ ] Test initialization command with new name
- [ ] Test configuration command with new name
- [ ] Verify status line shows correct branding

## Success Criteria
- All files use "TRACK" or "track" branding consistently
- No references to "cc-pars" remain in any files
- All commands work with new names
- Configuration file uses new naming convention
- Status line displays "TRACK" branding
- All existing functionality preserved
- Documentation reflects new project identity and tagline

## Technical Approach
1. **Project-Level Changes** - Update core project files and directory structure
2. **Configuration File Renames** - Rename config files and update all lookup references
3. **Command Updates** - Rename slash commands and update their documentation
4. **Code Updates** - Update all code references, imports, and config lookups
5. **Documentation Updates** - Rebrand all documentation with new name and messaging
6. **Script and Hook Updates** - Update all user-facing text and error messages

## Current Focus
Start with project-level changes (package.json, README.md) and configuration file rename, then systematically update all code references.

## Open Questions & Blockers
- Need to verify all files that reference the config filename
- May need to identify any hardcoded references that could be missed
- Should consider backward compatibility for existing users

## Next Steps
1. Update package.json name field
2. Rename configuration file
3. Update README.md with new branding
4. Search codebase for all "cc-pars" references
5. Systematically update each file identified
6. Test all functionality after changes