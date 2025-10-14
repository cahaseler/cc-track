# Comprehensive Project Rename from cc-pars to cc-track

**Purpose:** Rename the entire project from "cc-pars" to "cc-track" (Task Review And Context Keeper), updating all references, documentation, commands, and configuration files to reflect the new branding "Keep your vibe coding on track" while maintaining all existing functionality.

**Status:** completed
**Started:** 2025-09-10 19:34
**Task ID:** 023

## Requirements
- [x] ~~Rename main project directory~~ (decided to keep directory name)
- [x] Update package.json name field to "cc-track"
- [x] Update README.md with new name and tagline: "Keep your vibe coding on track"
- [x] Rename `.claude/cc-pars.config.json` → `.claude/track.config.json`
- [x] Update all config file lookup references to use new filename
- [x] Rename `/init-cc-pars` command to `/init-track`
- [x] Rename `/config-cc-pars` command to `/config-track`
- [x] Update command documentation and help text
- [x] Update all imports/references from "cc-pars" to "cc-track" in code
- [x] Update status line to show "cc-track" branding with train emoji
- [x] Update hook descriptions and comments
- [x] Update product_context.md to reflect new name
- [x] Update all documentation references from cc-pars to cc-track
- [x] Add explanation of acronym where appropriate
- [x] Update backlog references
- [x] Update initialization scripts to use new name
- [x] Update all error messages and user-facing text
- [x] Update template files with new branding
- [x] Test all hooks work with renamed config
- [x] Test initialization command with new name
- [x] Test configuration command with new name
- [x] Verify status line shows correct branding

## Success Criteria
- All files use "cc-track" branding consistently ✅
- No references to "cc-pars" remain in any files (except git history and journals) ✅
- All commands work with new names ✅
- Configuration file uses new naming convention (track.config.json) ✅
- Status line displays "cc-track" branding with train emoji ✅
- All existing functionality preserved ✅
- Documentation reflects new project identity and tagline ✅

## Technical Approach
1. **Project-Level Changes** - Update core project files and directory structure
2. **Configuration File Renames** - Rename config files and update all lookup references
3. **Command Updates** - Rename slash commands and update their documentation
4. **Code Updates** - Update all code references, imports, and config lookups
5. **Documentation Updates** - Rebrand all documentation with new name and messaging
6. **Script and Hook Updates** - Update all user-facing text and error messages

## Completion Summary

Successfully renamed the project from "cc-pars" to "cc-track" with the tagline "Keep your vibe coding on track". The name stands for "Task Review And Context Keeper". 

Key changes made:
- Updated package.json, README.md with new branding
- Renamed configuration file from cc-pars.config.json to track.config.json
- Updated all code references to use new config filename
- Renamed commands from /init-cc-pars to /init-track and /config-cc-pars to /config-track
- Added train theming with 🚅 emoji in statusline
- Updated all documentation files to reflect new branding
- Verified TypeScript compilation and basic functionality

The project directory name was kept as-is to avoid disrupting the git repository and file paths.

## Additional Work
After task completion, also updated statusline emojis per user request:
- Added cost tier emojis (🪙 💵 💸 💰 🤑)
- Added fire emoji for high burn rates
- Changed "no task" message to "🛤️ Project is on track"