# Fix GitHub Build Version Numbers

**Purpose:** Update the build process to inject the actual release version into binaries instead of showing hardcoded "1.0.0", using semantic-release environment variables at build time.

**Status:** completed
**Started:** 2025-09-14 21:21
**Task ID:** 046

## Requirements
- [x] Update `src/cli/index.ts` to use build-time injected version with fallback
- [x] Modify `.releaserc.json` exec plugin's `prepareCmd` to use `--define` flag for version injection
- [x] Ensure local builds show "1.0.0-dev" to distinguish from releases
- [x] Ensure release binaries show correct semantic version
- [x] Test local build shows development version
- [x] Test manual build with version injection works correctly

## Success Criteria
- Local builds (`bun run build`) show "1.0.0-dev" version
- Manual version injection test works: `bun build src/cli/index.ts --compile --define BUILD_VERSION='"test"' --outfile dist/test && dist/test --version` shows "test"
- Next GitHub release automatically embeds correct version in binaries
- No package.json updates required during release process
- No additional commits needed during release

## Technical Approach
Use Bun's `--define` flag to inject `BUILD_VERSION` environment variable at compile time. Modify the CLI to read from `process.env.BUILD_VERSION` with fallback to development version. Update semantic-release configuration to pass the version during the prepare step using `--define BUILD_VERSION='"${nextRelease.version}"'`.

## Current Focus

Task completed on 2025-09-14

## Open Questions & Blockers
None - all issues resolved.

## Next Steps
Task is complete and ready for the next GitHub release to test the implementation.

## Recent Progress

Successfully implemented build-time version injection for GitHub releases:

1. **Updated `src/cli/index.ts`**: Changed hardcoded version to use `process.env.BUILD_VERSION || '1.0.0-dev'`, allowing build-time injection with local development fallback.

2. **Fixed `.releaserc.json`**: Updated the exec plugin's `prepareCmd` to inject version using Bun's `--define` flag with the correct syntax: `--define 'process.env.BUILD_VERSION="${nextRelease.version}"'`

3. **Verified functionality**:
   - Local builds show `1.0.0-dev` as expected
   - Manual test with `--define 'process.env.BUILD_VERSION="2.0.0-test"'` correctly shows the injected version
   - The solution avoids package.json updates and extra commits during release

The key discovery was that Bun's `--define` flag requires the full `process.env.BUILD_VERSION` path, not just `BUILD_VERSION`. This ensures the next GitHub release will properly embed version numbers in the compiled binaries.

<!-- github_issue: 33 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/33 -->
<!-- issue_branch: 33-fix-github-build-version-numbers -->