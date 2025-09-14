# NPM Global Package Installation System for cc-track

**Purpose:** Implement a comprehensive NPM global installation system that publishes cc-track as a package with Bun-compiled binary, enabling users to install globally and use Claude-driven setup for intelligent project configuration.

**Status:** planning
**Started:** 2025-09-14 08:38
**Task ID:** 048

## Requirements
- [ ] Update package.json with "bin" field pointing to ./dist/cc-track
- [ ] Add "files" field to package.json including dist/, templates/, .claude/commands/
- [ ] Add npm metadata (description, keywords, repository, author, license)
- [ ] Create init command (src/commands/init.ts) that generates setup slash command
- [ ] Create setup-templates command to copy templates from package location
- [ ] Create setup-commands command to copy command files to project
- [ ] Bundle templates and commands directories with npm package
- [ ] Configure binary to read resources from import.meta.dir relative paths
- [ ] Create .npmignore to exclude development files
- [ ] Add prepublishOnly script to ensure build before publish
- [ ] Design setup-cc-track.md slash command content for Claude instructions
- [ ] Implement Claude-driven project analysis and configuration
- [ ] Handle backup creation for existing files during setup
- [ ] Exclude setup-cc-track.md from recursive copying
- [ ] Configure semantic-release version synchronization

## Success Criteria
- [ ] Users can install with `npm install -g cc-track`
- [ ] `cc-track init` creates proper setup slash command
- [ ] Claude can run `/setup-cc-track` and complete full configuration
- [ ] All templates and commands are properly copied to project
- [ ] Project-specific configuration is intelligently generated
- [ ] Installation works across different project types and structures
- [ ] Binary correctly locates bundled resources in global npm install

## Technical Approach
- Publish Bun-compiled binary via npm with bundled resources
- Use import.meta.dir for resource location in global installs
- Claude-driven setup provides intelligent project analysis
- Two-phase installation: npm global install + Claude setup
- Resource bundling preserves npm package directory structure

## Recent Progress
- Defined comprehensive NPM global installation approach with Claude-driven setup
- Designed two-phase installation: `npm install -g cc-track` + `cc-track init` + Claude setup
- Clarified resource bundling strategy using npm "files" field and import.meta.dir
- Planned Claude-driven setup via setup-cc-track.md slash command for transparency
- Established technical approach using Bun-compiled binary with bundled resources

## Current Focus
Update package.json configuration and create init command structure

## Open Questions & Blockers
- How does import.meta.dir behave in npm global installations?
- Need to test resource path resolution across different npm versions
- Verify semantic-release integration with npm publishing workflow

## Next Steps
1. Update package.json with bin field and npm metadata
2. Implement init command that creates setup slash command
3. Create setup-templates and setup-commands functionality
4. Test resource bundling and path resolution
5. Configure .npmignore and publishing scripts

<!-- github_issue: 37 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/37 -->
<!-- issue_branch: 37-npm-global-package-installation-system-for-cc-track -->