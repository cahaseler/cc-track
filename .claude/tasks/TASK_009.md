# Fix add-to-backlog Command and Restore Lost Items

**Purpose:** Fix the broken add-to-backlog command that's adding empty lines instead of content, and restore the 5 backlog items that were lost due to this bug.

**Status:** planning
**Started:** 2025-09-10 08:42
**Task ID:** 009

## Requirements
- [ ] Manually add the 5 lost items to the backlog file
- [ ] Clean up existing empty lines in backlog
- [ ] Debug why the `$1` variable isn't being passed through in the bash command
- [ ] Fix the add-to-backlog command to properly capture arguments
- [ ] Test the fixed command with a sample item
- [ ] Verify all 5 items are properly added to backlog

## Success Criteria
- Backlog file contains all 5 lost items with proper formatting
- No empty lines remain in backlog file
- add-to-backlog command successfully adds new items when tested
- Command captures full argument text, not just first word

## Technical Approach
Three potential solutions to investigate:
1. **Debug variable passing**: Test different variable names or escaping methods for `$1`
2. **Temp file approach**: Have command write to temp file instead of relying on bash arguments
3. **Dedicated script**: Create separate script that handles argument capture and backlog writing

## Current Focus
Start with manual recovery of lost items, then investigate the variable passing issue in the slash command.

## Open Questions & Blockers
- Is this a Claude Code specific issue with how command arguments are handled?
- Should we use positional arguments (`$@`) or environment variables instead of `$1`?
- Are there limitations on bash variable access within slash commands?

## Next Steps
1. Manually add the 5 lost items to backlog file
2. Remove empty lines from backlog
3. Examine the current add-to-backlog command implementation
4. Test different approaches to argument capture
5. Implement and test the fix