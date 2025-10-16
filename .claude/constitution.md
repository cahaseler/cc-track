# Project Constitution

**Version**: 1.1.0
**Ratified**: 2025-10-15
**Last Amended**: 2025-10-15 (TASK_102: Clarified environment variable usage)

## Purpose

This constitution establishes the technical guardrails and architectural principles for cc-track (Task Review And Context Keeper). It defines what is and isn't allowed in the project architecture, serving as validation criteria for all technical plans.

---

## Core Architectural Principles

### I. Radical Simplicity (YAGNI)
- Build only what is needed right now
- No speculative features or "what if" scenarios
- Simple solutions strongly preferred over clever ones
- The best code is no code
- Complexity requires explicit justification with specific current need

### II. Plugin-Native Architecture
- Distributed as Claude Code plugin via git repository
- TypeScript executed by Bun runtime (no compilation to binary)
- Hooks and MCP servers reference `${CLAUDE_PLUGIN_ROOT}` (available when Claude Code spawns processes)
- Slash commands use `${CC_TRACK_SCRIPTS_ROOT}` (scripts copied to known location by SessionStart hook)
- Separate hook files per event type (no unified dispatcher)
- Templates stay in plugin directory (not copied to projects)

### III. Minimal Dependencies
- Prefer zero external runtime dependencies when possible
- Current approved dependencies: `ccusage`, `@anthropic-ai/claude-agent-sdk`
- New dependencies require explicit justification
- Bun provides built-in TypeScript, testing, and package management

---

## Architectural Guardrails

### Complexity Limits
- **Maximum Runtime Dependencies**: 5 (currently 2: ccusage + claude-agent-sdk)
- **Maximum File Size**: 500 lines (triggers refactor discussion)
- **Maximum Function Complexity**: Cyclomatic complexity <15 (prefer <10)
- **Hook Execution Time**: <60s timeout (real-time validation <1s)

### Prohibited Patterns (unless explicitly justified)
- Binary compilation (plugin uses TypeScript execution)
- Unified hook dispatcher (separate files per event type)
- External runtime dependencies without clear need
- Copying template files to projects (reference from plugin)
- Mixed npm package + plugin distribution (plugin only)

### Required Patterns
- Dependency injection for testability (constructor or deps parameter)
- Conventional commit format (feat:, fix:, docs:, chore:, etc.)
- Semantic versioning via automated semantic-release
- Per-project configuration in `.claude/track.config.json`
- Logs outside project directory (default: `~/.local/share/cc-track/logs/`)

---

## Code Quality Standards

### Quality Gates (must pass before merge)
- [ ] All tests passing (minimum 422 tests, target 80%+ coverage)
- [ ] TypeScript strict mode passing (zero errors)
- [ ] Biome linting passing (zero warnings)
- [ ] Knip unused code check (document intentional exceptions)
- [ ] Pre-commit hooks passing (never skip)

### Test Requirements
- **Location**: Colocated with source (*.test.ts alongside implementation)
- **Parallel Safety**: All tests must run in parallel without conflicts
- **Isolation**: Per-test mocks, no shared mutable state
- **Output**: Pristine test output (capture expected errors in tests)
- **Coverage**: 80% minimum line coverage, currently 83%+

### Code Style
- **TypeScript**: Strict mode required
- **Naming**: camelCase functions/variables, PascalCase classes, kebab-case files
- **File Headers**: ABOUTME comments (2 lines) explaining file purpose
- **Formatting**: Biome auto-formatting, match surrounding code style

---

## Performance Standards

### Hook Execution
- **Real-time validation** (edit-validation, pre-tool-validation): <1s
- **Automated operations** (pre-compact, stop): <30s
- **Maximum timeout**: 60s (Claude Code limit)

### Test Suite
- **Full suite**: <10s with parallel execution
- **Individual test files**: <2s

### Statusline Generation
- **Execution time**: <500ms
- **Caching**: Use when appropriate (e.g., ccusage API calls)

---

## Distribution Model

### Plugin Architecture
- **Source Repository**: Main repo contains all plugin files (commands/, hooks/, lib/, scripts/, templates/)
- **Marketplace Repository**: Separate repo with `.claude-plugin/marketplace.json` referencing source repo
- **Installation**: Users add marketplace, install plugin via `/plugin` commands
- **Updates**: Semantic-release automation updates plugin.json version on merge to main

### Versioning Strategy
- **Format**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Automation**: semantic-release reads conventional commits
- **Triggers**: feat: (minor), fix: (patch), BREAKING CHANGE: (major)
- **Version Location**: `.claude-plugin/plugin.json`

### Repository Structure
```
.claude-plugin/          # Plugin metadata
  plugin.json           # Plugin manifest
  hooks.json            # Hook registrations
commands/               # Slash command implementations
  scripts/              # TypeScript command logic
hooks/                  # Hook implementations
lib/                    # Shared libraries
scripts/                # Statusline and utilities
templates/              # Project initialization templates
```

---

## Technology Constraints

### Runtime Environment
- **Execution**: Bun (not Node.js)
- **Language**: TypeScript with strict mode
- **Package Manager**: Bun (lockfile: bun.lock)
- **Testing**: Bun's built-in test runner

### Plugin Integration
- **Commands**: Markdown files with `!bun run ${CC_TRACK_SCRIPTS_ROOT}/script.ts` (scripts installed by SessionStart hook)
- **Hooks**: Registered in `.claude-plugin/hooks.json`, use `${CLAUDE_PLUGIN_ROOT}`, executed via `bun run`
- **Statusline**: Command-based, defined in project `.claude/settings.json`
- **Configuration**: Per-project `.claude/track.config.json`

---

## Project-Specific Guidelines

### Context Management Architecture
- **Persistent Context**: Core principles in product_context.md, system_patterns.md, decision_log.md
- **Active Tasks**: Spec folders in `.claude/specs/NNN-feature-name/`
- **Configuration**: Per-project track.config.json enables/disables features
- **Workflow**: Spec-driven (/specify → /clarify → /plan → /tasks)

### Hook Design Constraints
- **Separation**: One hook file per event type (edit-validation.ts, pre-tool-validation.ts)
- **Registration**: Central `.claude-plugin/hooks.json` declares all hooks
- **Execution**: Direct TypeScript execution by Bun, no wrapper scripts
- **Blocking Behavior**: Only validation hooks block (edit-validation, pre-tool-validation)

### Feature Configuration
- **Mechanism**: `.claude/track.config.json` in each project
- **Scope**: Per-project (not global)
- **Options**: Enable/disable hooks, configure validation, set preferences
- **Flexibility**: Projects can customize cc-track behavior

---

## Governance

### Constitutional Authority
- This constitution defines technical constraints for cc-track
- All `/plan` commands validate designs against these principles
- Violations require explicit justification documented in decision_log.md
- Architecture changes require constitutional amendment

### Amendment Process
1. Propose change with clear rationale
2. Document why current constraint no longer fits
3. Assess impact on existing architecture
4. Update version (semantic versioning)
5. Record amendment in decision_log.md with full context
6. Update "Last Amended" date

### Enforcement
- `/plan` command validates against constitution automatically
- Pull request reviews check compliance
- Breaking changes flagged for constitutional review

---

## References

### Related Documents
- **System Patterns**: `.claude/system_patterns.md` - Implementation patterns and conventions
- **Decision Log**: `.claude/decision_log.md` - Historical architectural decisions
- **Product Context**: `.claude/product_context.md` - Product vision and goals
- **Workflow Guide**: `.claude/cc-track-workflow.md` - Development workflow

### External Standards
- **Conventional Commits**: https://www.conventionalcommits.org/
- **Semantic Versioning**: https://semver.org/
- **Claude Code Plugins**: https://docs.claude.com/en/docs/claude-code/plugins
- **Bun Documentation**: https://bun.sh/docs

---

**Note**: When creating a plan with `/plan`, the system will automatically check this constitution and require justification for any violations.
