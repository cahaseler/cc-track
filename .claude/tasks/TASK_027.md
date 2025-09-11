# Add Semantic Release with Automatic GitHub Release Publishing

**Purpose:** Implement semantic-release with GitHub Actions to automatically determine version numbers, generate changelogs, create GitHub releases, and build/upload cross-platform executables based on conventional commits.

**Status:** planning
**Started:** 2025-09-11 15:57
**Task ID:** 027

## Requirements
- [ ] Install semantic-release dependencies (`semantic-release`, `@semantic-release/github`, `@semantic-release/exec`)
- [ ] Create `.releaserc.json` configuration file with plugins for commit analysis, changelog generation, and GitHub integration
- [ ] Add cross-platform build scripts to package.json for Linux and Windows targets
- [ ] Create `.github/workflows/release.yml` GitHub Actions workflow
- [ ] Configure build matrix for `bun-linux-x64` and `bun-windows-x64` targets
- [ ] Update GitHelpers.generateCommitMessage() to return conventional commit format
- [ ] Update complete-task command to use conventional commit format
- [ ] Update stop-review hook to use conventional commit format for auto-commits
- [ ] Update system prompts to generate conventional commits
- [ ] Configure GitHub workflow permissions for releases and asset uploads
- [ ] Update .gitignore to handle dist/ directory appropriately
- [ ] Add commit validation (commitlint or husky) to enforce conventional commit format

## Success Criteria
- [ ] Semantic-release automatically determines versions based on conventional commits
- [ ] GitHub releases are created automatically with generated changelogs
- [ ] Cross-platform binaries (Linux/Windows) are built and attached to releases
- [ ] All commit message generation follows conventional commit format
- [ ] Version bumps work correctly: feat (minor), fix (patch), BREAKING CHANGE (major)
- [ ] Workflow triggers on push to master branch
- [ ] Manual release process can be phased out

## Technical Approach
- Use semantic-release with GitHub Actions integration
- Implement cross-platform compilation using Bun's build targets
- Migrate all commit message generation to conventional commit format
- Configure automated asset uploads to GitHub releases
- Use build matrix for parallel Linux/Windows compilation

## Current Focus
Phase 1: Setup Dependencies and Configuration
- Install semantic-release packages
- Create .releaserc.json configuration
- Add build scripts to package.json

## Open Questions & Blockers
- Need to verify current package.json structure and existing build setup
- Confirm GitHub repository permissions for automated releases
- Determine which conventional commit types to support (feat, fix, chore, docs, etc.)
- Validate Bun's cross-compilation capabilities for target platforms

## Next Steps
1. Examine current package.json and build configuration
2. Install semantic-release dependencies
3. Create .releaserc.json configuration file
4. Add cross-platform build scripts
5. Create GitHub Actions workflow file

<!-- branch: feature/semantic-release-setup-027 -->