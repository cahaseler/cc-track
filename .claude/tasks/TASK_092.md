# TASK_092: Update to Claude Sonnet 4.5 Model

## Purpose
Update all hardcoded Claude model references from Sonnet 4 (`claude-sonnet-4-20250514`) to the new Sonnet 4.5 (`claude-sonnet-4-5-20250929`) across the codebase.

## Status
**in_progress** - Started: 2025-10-01 06:12

## Requirements
- [ ] Update `.claude/commands/setup-cc-track.md` line 4
- [ ] Update `src/commands/slash-commands/cc-track-uninstall.md` line 4
- [ ] Update `src/commands/init.ts` line 50
- [ ] Run `bun run scripts/embed-resources.ts` to regenerate embedded resources
- [ ] Verify TypeScript files using generic model names remain unchanged
- [ ] Test updated model references work correctly

## Success Criteria
- All hardcoded Sonnet 4 model references updated to Sonnet 4.5
- Embedded resources regenerated with new model identifier
- No breaking changes to existing functionality
- Generic model references (`'sonnet'`, `'haiku'`, `'opus'`) remain untouched

## Technical Approach
1. **Direct File Updates**: Replace exact model identifier strings in 3 specific files
2. **Resource Regeneration**: Execute embed script to update generated embeddings
3. **Verification**: Confirm TypeScript SDK files using generic names are unchanged

## Current Focus
Beginning systematic update of hardcoded model references in markdown and TypeScript configuration files.

## Next Steps
1. Update the three identified files with new model identifier
2. Execute embedding regeneration script
3. Verify all changes are properly applied
4. Test functionality with updated model references