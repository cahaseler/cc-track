# Fix GitHub Build Version Numbers

**Purpose:** Update the build process to inject the actual release version into binaries instead of showing hardcoded "1.0.0", using semantic-release environment variables at build time.

**Status:** planning
**Started:** 2025-09-14 21:21
**Task ID:** 046

## Requirements
- [ ] Update `src/cli/index.ts` to use build-time injected version with fallback
- [ ] Modify `.releaserc.json` exec plugin's `prepareCmd` to use `--define` flag for version injection
- [ ] Ensure local builds show "1.0.0-dev" to distinguish from releases
- [ ] Ensure release binaries show correct semantic version
- [ ] Test local build shows development version
- [ ] Test manual build with version injection works correctly

## Success Criteria
- Local builds (`bun run build`) show "1.0.0-dev" version
- Manual version injection test works: `bun build src/cli/index.ts --compile --define BUILD_VERSION='"test"' --outfile dist/test && dist/test --version` shows "test"
- Next GitHub release automatically embeds correct version in binaries
- No package.json updates required during release process
- No additional commits needed during release

## Technical Approach
Use Bun's `--define` flag to inject `BUILD_VERSION` environment variable at compile time. Modify the CLI to read from `process.env.BUILD_VERSION` with fallback to development version. Update semantic-release configuration to pass the version during the prepare step using `--define BUILD_VERSION='"${nextRelease.version}"'`.

## Current Focus
Update `src/cli/index.ts` to implement version injection pattern with environment variable fallback.

## Open Questions & Blockers
- Need to verify current structure of `src/cli/index.ts` and how version is currently handled
- Need to confirm current `.releaserc.json` configuration and exec plugin setup
- Should verify Bun's `--define` flag syntax and behavior

## Next Steps
1. Examine current `src/cli/index.ts` file structure and version handling
2. Update version constant to use `process.env.BUILD_VERSION` with fallback
3. Locate and update `.releaserc.json` prepareCmd configuration
4. Test local build and manual version injection

<!-- github_issue: 33 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/33 -->
<!-- issue_branch: 33-fix-github-build-version-numbers -->