# Feature Specification: Add Semantic Release with Automatic GitHub Release Publishing

**Feature ID**: `027`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Implement semantic-release with GitHub Actions to automatically determine version numbers, generate changelogs, create GitHub releases, and build/upload cross-platform executables based on conventional commits.

## Requirements

- [x] Install semantic-release dependencies (`semantic-release`, `@semantic-release/github`, `@semantic-release/exec`)
- [x] Create `.releaserc.json` configuration file with plugins for commit analysis, changelog generation, and GitHub integration
- [x] Add cross-platform build scripts to package.json for Linux and Windows targets
- [x] Create `.github/workflows/release.yml` GitHub Actions workflow
- [x] Configure build matrix for `bun-linux-x64` and `bun-windows-x64` targets
- [x] Update GitHelpers.generateCommitMessage() to return conventional commit format
- [x] Update complete-task command to use conventional commit format
- [x] Update stop-review hook to use conventional commit format for auto-commits
- [x] Update system prompts to generate conventional commits
- [x] Configure GitHub workflow permissions for releases and asset uploads
- [ ] Update .gitignore to handle dist/ directory appropriately
- [ ] Add commit validation (commitlint or husky) to enforce conventional commit format

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
