# TASK_066: Make cc-track Lint-Agnostic with Built-in Support for Biome and ESLint

## Purpose
Refactor cc-track from hardcoded Biome assumptions to a flexible lint system that supports Biome, ESLint, and custom tools as first-class citizens.

## Status
**in_progress** - Started: 2025-09-17 20:22

## Requirements
- [ ] Create lint parser abstraction with BiomeParser, ESLintParser, and GenericParser
- [ ] Update configuration structure to support tool detection and auto-fix commands
- [ ] Refactor `src/lib/validation.ts` - rename `runBiomeCheck` to `runLintCheck` and remove hardcoded assumptions
- [ ] Refactor `src/hooks/edit-validation.ts` - rename function and replace Biome-specific parsing
- [ ] Update ValidationResult interface from `biome?` to `lint?` across all files
- [ ] Update user-facing messages in `src/commands/prepare-completion.ts` to be tool-agnostic
- [ ] Implement backward compatibility for existing configurations
- [ ] Update default configurations and templates
- [ ] Add comprehensive tests for all parsers and tool configurations
- [ ] Update documentation with examples for Biome, ESLint, and custom tools

## Success Criteria
- ✅ Support for Biome, ESLint, and custom lint tools through configuration
- ✅ No hardcoded tool-specific assumptions in validation logic
- ✅ Backward compatibility maintained for existing Biome configurations
- ✅ Clear error messages and fix suggestions for each supported tool
- ✅ Comprehensive test coverage for all parsers and scenarios

## Technical Approach
1. **Parser Abstraction**: Create `LintParser` interface with tool-specific implementations
2. **Configuration Enhancement**: Extend lint config to include `tool`, `command`, `autoFixCommand`, and `customParser`
3. **Function Refactoring**: Replace all `runBiomeCheck` functions with generic `runLintCheck`
4. **Output Parsing**: Replace hardcoded Biome output parsing with parser abstraction
5. **Message Updates**: Generate tool-specific error messages and fix advice
6. **Backward Compatibility**: Auto-detect and convert old configuration format

## Current Focus
Setting up the foundational parser abstraction and configuration structure to support multiple lint tools.

## Next Steps
1. Create `src/lib/lint-parsers.ts` with parser implementations
2. Update configuration types and interfaces
3. Begin refactoring validation functions to use the new parser system