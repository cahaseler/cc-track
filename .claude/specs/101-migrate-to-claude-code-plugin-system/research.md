# Research: Migrate to Claude Code Plugin System

## Technology Decisions

### Decision: TypeScript + Bun Runtime
- **Chosen**: TypeScript 5.x with Bun runtime
- **Rationale**:
  - Already using this stack successfully in current implementation
  - Bun provides built-in TypeScript support without compilation step
  - Faster execution than Node.js
  - Plugin conventions support TypeScript with Bun
- **Alternatives Considered**:
  - Node.js: More mature ecosystem but slower, requires additional build tooling
  - Compiled to JavaScript: Loses developer experience benefits, adds build complexity
- **Tradeoffs**: Bun is newer with smaller ecosystem, but benefits outweigh risks for our use case

### Decision: Claude Code Plugin Structure
- **Chosen**: Standard plugin directory layout per Claude Code conventions
- **Rationale**:
  - Required for Claude Code plugin system compatibility
  - Clear separation of concerns (commands/, hooks/, lib/, scripts/, templates/)
  - Proven pattern from existing plugin ecosystem (johnlindquist/claude-hooks, others)
- **Structure**:
  ```
  cc-track-plugin/
  ├── .claude-plugin/
  │   └── plugin.json          # Plugin metadata
  ├── commands/                 # Slash commands (markdown files)
  ├── hooks/                    # Event hooks (TypeScript)
  │   ├── hooks.json           # Hook registration
  │   ├── edit-validation.ts   # PostToolUse hook
  │   └── pre-tool-validation.ts # PreToolUse hook
  ├── lib/                      # Shared utilities
  ├── scripts/                  # Non-hook scripts (statusline)
  ├── templates/                # Reference templates
  └── package.json             # Dependencies
  ```
- **Alternatives Considered**:
  - Flat structure: Would violate plugin conventions
  - Keep src/ wrapper: Unnecessary, plugin conventions don't use it
- **Tradeoffs**: Must follow conventions exactly or risk plugin system incompatibility

### Decision: Separate Hooks Per Event Type
- **Chosen**: Individual hook files for each event type
- **Rationale**:
  - No longer compiling to single binary, so no need for unified entry point
  - Clearer code organization and maintainability
  - Easier testing and debugging
  - Follows plugin best practices
- **Alternatives Considered**:
  - Unified hook dispatcher: Adds unnecessary complexity without binary compilation
  - Keep current structure: Would carry over npm-package architecture unnecessarily
- **Tradeoffs**: More files but clearer responsibilities

### Decision: @semantic-release/git for Dual Version Management
- **Chosen**: Use `@semantic-release/git` plugin with assets configuration
- **Rationale**:
  - Can update both package.json and .claude-plugin/plugin.json simultaneously
  - Standard semantic-release plugin, well-maintained
  - Supports glob patterns and multiple file targets
- **Configuration**:
  ```json
  {
    "plugins": [
      "@semantic-release/commit-analyzer",
      "@semantic-release/release-notes-generator",
      ["@semantic-release/npm", { "npmPublish": false }],
      ["@semantic-release/git", {
        "assets": [
          "package.json",
          ".claude-plugin/plugin.json"
        ]
      }],
      "@semantic-release/github"
    ]
  }
  ```
- **Alternatives Considered**:
  - Custom plugin: Unnecessary complexity, standard plugin handles our needs
  - Only version plugin.json: Loses package.json versioning for dependencies
  - Manual version sync: Error-prone, defeats automation purpose
- **Tradeoffs**: Requires both files stay in sync, but automation ensures consistency

### Decision: Bun Test for Testing
- **Chosen**: Keep existing Bun test suite, update for plugin structure
- **Rationale**:
  - Already have comprehensive test coverage (366 unit tests)
  - Bun test is fast and well-integrated with our workflow
  - Tests are for code quality, not distribution method
- **Migration Approach**:
  - Update import paths to reflect new structure
  - Add tests for npm detection logic
  - Add tests for dependency checking
  - Update test fixtures for plugin paths
- **Alternatives Considered**:
  - Switch to Jest: No benefit, would require migration effort
  - Minimal testing: Would lose valuable quality assurance
- **Tradeoffs**: Test updates required but preserves existing investment

### Decision: Markdown Migration Guide
- **Chosen**: Comprehensive markdown guide that Claude can read and execute
- **Rationale**:
  - Claude can parse markdown and guide users step-by-step
  - Human-readable for reference
  - Version controlled with plugin
  - Can include code snippets and troubleshooting
- **Structure**:
  ```markdown
  # Migration Guide: npm to Claude Code Plugin

  ## Prerequisites
  - [ ] Bun installed
  - [ ] Claude Code with plugin support

  ## Step 1: Uninstall npm package
  \`\`\`bash
  npm uninstall -g cc-track
  \`\`\`

  ## Step 2: Install plugin...
  ```
- **Alternatives Considered**:
  - Automated migration command: Could be added later, manual first for safety
  - PDF or other format: Not Claude-readable
- **Tradeoffs**: Manual steps but safer and more transparent

### Decision: Dedicated Marketplace Repository
- **Chosen**: Separate `cc-track-marketplace` repository from development repo
- **Rationale**:
  - Clean separation of development vs distribution
  - Marketplace only needs plugin metadata and source reference
  - Can pin specific plugin versions in marketplace
  - Follows Claude Code plugin ecosystem patterns
- **Structure**:
  ```
  cc-track-marketplace/
  ├── .claude-plugin/
  │   └── marketplace.json
  └── README.md
  ```
- **Alternatives Considered**:
  - Same repo as development: Conflates concerns, harder to manage releases
  - Multiple plugin marketplace: Unnecessary complexity for single plugin
- **Tradeoffs**: One more repo to manage but cleaner organization

## Best Practices Research

### Claude Code Plugin Conventions
- Researched johnlindquist/claude-hooks and other TypeScript plugin examples
- Key findings:
  - Hooks use TypeScript with type safety
  - `${CLAUDE_PLUGIN_ROOT}` environment variable for plugin-relative paths
  - hooks.json registers which files handle which events
  - Commands use markdown with bash execution via `!` prefix
  - Templates can reference plugin directory without copying

### Dependency Management
- Claude Code plugins support package.json
- Dependencies installed via `bun install` in plugin directory
- Common pattern: Check dependencies on first run, guide installation if missing
- Best practice: Block execution with clear error if dependencies missing

### Migration Patterns
- Research shows per-project migration is common for plugin ecosystems
- Users can have multiple projects at different migration stages
- Detection logic (check for npm global install) prevents conflicts
- Clear error messages guide users through resolution

## Performance Considerations

### Plugin Load Time
- TypeScript execution via Bun is fast (<100ms for typical hooks)
- No compilation step needed at runtime
- Plugin files loaded on-demand by Claude Code

### Command Execution
- Bun scripts execute faster than Node.js equivalents
- Direct TypeScript execution eliminates build step
- Expect similar or better performance than npm version

## Security Considerations

### Dependency Verification
- Setup command verifies dependencies before allowing execution
- Clear error messages prevent partial/broken installations
- No auto-installation to avoid surprise dependency downloads

### npm Detection
- Check for global npm package prevents conflicts
- Block execution with clear guidance prevents unpredictable behavior
- Users maintain control over uninstall process

## Migration Risks

### Risk: Plugin System API Changes
- **Probability**: Medium (Claude Code plugins in public beta)
- **Impact**: High (could break plugin functionality)
- **Mitigation**: Follow official conventions strictly, monitor Claude Code releases

### Risk: User Data Loss During Migration
- **Probability**: Low (migration preserves all files)
- **Impact**: Critical (users lose work)
- **Mitigation**: Explicit preservation of `.claude/` directory, migration guide emphasizes backup

### Risk: Dependency Installation Failures
- **Probability**: Medium (users may lack bun, network issues)
- **Impact**: Medium (blocks usage but recoverable)
- **Mitigation**: Clear error messages, setup verification, documentation

### Risk: npm/Plugin Coexistence Conflicts
- **Probability**: High (users may forget to uninstall npm)
- **Impact**: Medium (confusing errors)
- **Mitigation**: Explicit detection and blocking with clear instructions
