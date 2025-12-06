# Feature Specification: Migrate cc-track to Claude Code Plugin System

**Feature ID**: `101`
**Branch**: `101-migrate-to-claude-code-plugin-system`
**Created**: 2025-10-15
**Status**: Draft

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers
- 🔍 Use [NEEDS CLARIFICATION: specific question] for any ambiguity

---

## User Scenarios & Testing

### Primary User Story
As a cc-track user, I want to install and manage cc-track as a native Claude Code plugin instead of an npm package, so that I can benefit from easier discovery, installation, and integration with the Claude Code ecosystem.

### Acceptance Scenarios

1. **Given** I'm a new user discovering cc-track, **When** I browse Claude Code plugin marketplaces, **Then** I can find and install cc-track with a single command

2. **Given** I have cc-track installed as a plugin, **When** I want to enable it for a specific project, **Then** I can configure it through Claude Code's native settings system

3. **Given** I'm currently using the npm version of cc-track, **When** I follow the migration guide, **Then** I can successfully transition to the plugin version while preserving all my project data and configuration

4. **Given** I have cc-track installed as a plugin, **When** I don't need it for a particular session, **Then** I can easily disable it without uninstalling

5. **Given** I'm working on a team project, **When** the repository includes cc-track plugin configuration, **Then** other team members automatically get cc-track when they trust the repository

### Edge Cases
- **Simultaneous npm and plugin installation**: Plugin activation MUST be blocked with error message until npm version is uninstalled. README must include basic npm uninstall instructions.
- **Modified template files**: Template modifications are in user's project files (`.claude/` directory), not in npm package. Migration preserves all project files as-is - no template migration needed.
- **Missing plugin dependencies**: All commands MUST be blocked with error directing user to run `bun install` in plugin directory. Setup/init command guides users through dependency installation.
- **Multiple projects with different versions**: Plugin and npm can coexist globally as long as not used simultaneously in same project. Migration happens per-project basis. Plugin installation is global (one-time), but per-project migration is independent.

---

## Requirements

### Functional Requirements

#### Installation & Discovery
- **FR-001**: Users MUST be able to discover cc-track through Claude Code plugin marketplaces
- **FR-002**: Users MUST be able to install cc-track with a single `/plugin` command
- **FR-003**: Plugin installation MUST work identically in terminal and VS Code environments
- **FR-004**: Plugin MUST support installation at user, project, and local scopes

#### Core Functionality
- **FR-005**: All existing cc-track features MUST work in plugin format (hooks, commands, statusline)
- **FR-006**: Slash commands MUST execute TypeScript implementations from plugin directory
- **FR-007**: Hooks MUST register and execute through Claude Code's native hook system
- **FR-008**: Statusline MUST display correctly when invoked by Claude Code
- **FR-009**: Template files MUST be accessible from plugin directory without copying

#### Configuration
- **FR-010**: Each project MUST have its own `track.config.json` in `.claude/` directory
- **FR-011**: Setup command MUST guide users through feature selection and create config file
- **FR-012**: Setup command MUST verify plugin dependencies are installed and guide installation if missing
- **FR-013**: Setup command MUST detect npm-to-plugin migration scenarios and provide appropriate guidance
- **FR-014**: Users MUST be able to enable/disable plugin per-project through Claude Code settings

#### Migration
- **FR-015**: Migration guide MUST provide step-by-step instructions for transitioning from npm to plugin
- **FR-016**: Migration MUST preserve all project documentation files (specs, logs, backlog, context files)
- **FR-017**: Migration MUST handle `track.config.json` without data loss
- **FR-018**: Migration MUST cleanly remove npm package and old hook configurations
- **FR-019**: Migration guide MUST be readable by Claude to help users through the process
- **FR-020**: Plugin MUST detect npm version installation and block activation with clear error until npm version is removed
- **FR-021**: All commands MUST block with clear error when dependencies missing, directing user to run `bun install`

#### Distribution
- **FR-022**: Plugin MUST be distributed through a dedicated marketplace repository
- **FR-023**: Plugin versions MUST be managed through automated semantic release
- **FR-024**: Plugin updates MUST be installable through Claude Code's plugin update mechanism
- **FR-025**: Old npm package MUST be deprecated with clear migration instructions
- **FR-026**: README MUST include npm uninstall instructions for users migrating from npm version

#### Team Collaboration
- **FR-027**: Repository plugin configuration MUST auto-install for team members who trust the folder
- **FR-028**: Plugin version MUST be pinnable in repository settings for consistency
- **FR-029**: Multiple team members MUST be able to use cc-track on the same project without conflicts

### Non-Functional Requirements

#### Compatibility
- **NFR-001**: Plugin MUST work with Bun runtime for TypeScript execution
- **NFR-002**: Plugin MUST maintain backward compatibility with existing `.claude/` project files
- **NFR-003**: Plugin structure MUST follow Claude Code plugin conventions and best practices

#### Maintainability
- **NFR-004**: Plugin source code MUST be easier to maintain than compiled binary approach
- **NFR-005**: Dependencies MUST be managed through standard package.json
- **NFR-006**: Hook files MUST be separated by event type rather than unified

#### User Experience
- **NFR-007**: Installation MUST be simpler than current npm global install process
- **NFR-008**: Plugin MUST be toggleable without uninstalling
- **NFR-009**: Error messages MUST guide users to solutions (e.g., missing dependencies)
- **NFR-010**: Migration MUST be accomplishable without data loss risk

### Key Entities

- **Plugin**: The distributable cc-track package containing commands, hooks, templates, and libraries
- **Marketplace**: Repository containing plugin metadata and distribution information
- **Project Configuration**: Per-project settings file controlling which cc-track features are enabled
- **Migration Guide**: Documentation that Claude can read to help users transition from npm to plugin
- **Template Files**: Reference files in plugin directory that projects use without copying

---

## Success Criteria

- [ ] New users can install cc-track with one command and be productive within 5 minutes
- [ ] Existing users can migrate from npm to plugin without losing any project data
- [ ] Plugin appears in Claude Code marketplace listings and is discoverable
- [ ] Team repositories can enforce cc-track usage through settings configuration
- [ ] Plugin can be enabled/disabled per-project without uninstallation
- [ ] All existing cc-track functionality works identically in plugin format
- [ ] Dependencies are checked and installation errors are clear
- [ ] npm package is deprecated with migration path documented

---

## Scope & Boundaries

### In Scope
- Converting all current cc-track functionality to plugin format
- Creating plugin marketplace repository for distribution
- Providing comprehensive migration guide from npm to plugin
- Restructuring code to follow plugin conventions (commands/, hooks/, lib/, scripts/, templates/)
- Updating semantic-release to version plugin.json instead of package.json
- Deprecating npm package with migration instructions
- Verifying dependencies during setup process
- Supporting per-project configuration in `.claude/track.config.json`

### Out of Scope
- Maintaining npm package distribution (will be deprecated)
- Backward compatibility with npm package installation method
- Migrating users automatically (manual migration with guide)
- Supporting compiled binary distribution
- CLI-only features that don't integrate with Claude Code
- Global configuration (config is per-project only)

---

## Clarifications

### Session 2025-10-15

**Q: Plugin directory structure - how should files be organized?**
A: Follow plugin conventions: `.claude-plugin/` for metadata, `commands/` for slash commands, `hooks/` for hooks, `lib/` for shared code, `scripts/` for statusline, `templates/` for reference files, `package.json` for dependencies

**Q: How should statusline be implemented in plugin?**
A: Keep as separate script in `scripts/statusline.ts` since it's invoked by Claude Code UI settings, not event-driven

**Q: How should slash commands invoke TypeScript implementations?**
A: Use `${CLAUDE_PLUGIN_ROOT}` variable in markdown: `!bun run ${CLAUDE_PLUGIN_ROOT}/commands/complete-task.ts`

**Q: Should template files be copied to projects during setup?**
A: No - templates stay in plugin directory at `${CLAUDE_PLUGIN_ROOT}/templates/` and are referenced from there

**Q: How should dependencies be handled?**
A: Include package.json in plugin, verify dependencies during setup, guide users to run `bun install` in plugin directory if missing

**Q: What about existing `.claude/` files during migration?**
A: Preserve all project documentation files (specs/, backlog.md, progress_log.md, decision_log.md, CLAUDE.md, context files). Config stays in `.claude/track.config.json` (per-project, not in plugin)

**Q: Should config be per-project or global?**
A: Per-project in `.claude/track.config.json` - different projects need different feature configurations

**Q: Should hooks be unified or separate files?**
A: Separate files per event type (edit-validation.ts for PostToolUse, pre-tool-validation.ts for PreToolUse) - no need for unified hook file since we're not compiling to binary

**Q: How should plugin be distributed?**
A: Create dedicated marketplace repository separate from development repo

**Q: How should versioning work?**
A: Keep semantic-release, update version in `.claude-plugin/plugin.json` automatically via CI

**Q: What happens to npm package?**
A: Deprecate on npm with message pointing to plugin installation instructions

**Q: What should happen when a user has both the npm version AND plugin version installed at the same time?**
A: Block plugin activation with error message until npm version is uninstalled. Include basic npm uninstall instructions in README.

**Q: How should the migration handle users who have customized template files in their old npm installation?**
A: Templates are user project files in `.claude/` directory, not in npm package. Migration preserves all project files as-is - no template migration needed.

**Q: What should happen when plugin dependencies are missing during first use?**
A: Block all commands with error directing user to run `bun install` in plugin directory. Setup/init command verifies dependencies and guides installation. Init command must also detect npm-to-plugin migration scenarios.

**Q: How should configuration migration work when a user has multiple projects using different cc-track versions?**
A: Plugin and npm can coexist globally as long as not used simultaneously in same project. Migration happens per-project basis - each project migrates independently. Plugin installation is global (one-time), making subsequent per-project migrations easier.

### Session 2025-10-15 (Code Review Clarifications)

**Q: Should slash commands that perform setup/configuration (like `/setup-cc-track`) execute TypeScript automation scripts, or should they provide instructions for Claude to execute interactively?**
A: **Claude-driven interactive execution is intentional and correct.** Commands like `/setup-cc-track`, `/specify`, `/clarify`, `/plan`, and `/tasks` are pure markdown instruction sets that Claude executes adaptively. This is the correct pattern because:
- Every project/use-case is different - coding all configuration paths would be a nightmare
- Claude can adapt to unique situations and have natural conversations with users
- Interactive guidance provides better UX than rigid scripted prompts
- Only **action commands** that perform deterministic operations (like `/complete-task`, `/prepare-completion`, `/add-to-backlog`) should execute TypeScript directly

**Q: Which types of files need executable entrypoints (`if (import.meta.main) { ... }`) and which don't?**
A: Two categories:
1. **Need entrypoints** - Files invoked via `!bun run ${CLAUDE_PLUGIN_ROOT}/path/to/file.ts`:
   - Action command implementations: `commands/scripts/complete-task.ts`, `commands/scripts/prepare-completion.ts`, `commands/scripts/backlog.ts`, etc.
   - Hook implementations: `hooks/edit-validation.ts`, `hooks/pre-tool-validation.ts`
   - These must read inputs, execute logic, and output results when run directly
2. **Don't need entrypoints** - Files that are only imported as libraries:
   - All files in `lib/` (utilities, helpers, shared code)
   - Files like `commands/scripts/context.ts` that only export helper functions
   - Templates in `templates/` directory

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All sections completed or marked N/A

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified
- [x] Edge cases documented

---

## Dependencies & Assumptions

### Dependencies
- Claude Code plugin system (public beta, October 2025)
- Bun runtime for executing TypeScript hooks and commands
- Existing dependencies: `@anthropic-ai/claude-agent-sdk`, `ccusage`
- Git/GitHub for marketplace repository hosting
- Semantic-release for automated versioning

### Assumptions
- Plugin system conventions remain stable (Claude Code is in public beta)
- Users have Bun installed or can install it
- Users can access GitHub to add marketplace
- Existing `.claude/` file structure is compatible with plugin approach
- Team members have permission to trust repository folders for auto-installation

---

## Open Questions

*None - all clarifications gathered during specification phase*
