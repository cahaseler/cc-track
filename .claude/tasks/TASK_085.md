# Fix NPM Package Version Display Issue

**Purpose:** Remove the redundant prepublishOnly script that overwrites correctly-versioned executables built by semantic-release, causing npm packages to show "1.0.0-dev" instead of the actual version.

**Status:** in_progress
**Started:** 2025-09-21 19:22
**Task ID:** 085

## Requirements
- [ ] Remove the `prepublishOnly` script from package.json line 42
- [ ] Verify that semantic-release prepareCmd builds executables with correct version
- [ ] Test that next npm publish contains correctly-versioned executable
- [ ] Document the fix in decision log

## Success Criteria
- npm package executable shows correct version (not "1.0.0-dev")
- GitHub release executables continue to work correctly
- No rebuild occurs during npm publish process
- Version consistency between npm package and GitHub releases

## Technical Approach

### Root Cause Analysis
The issue occurs because of execution order conflict:

1. **semantic-release prepareCmd** (`.releaserc.json:10`): Builds executables with `--define 'process.env.BUILD_VERSION="${nextRelease.version}"'`
2. **@semantic-release/npm** plugin: Runs `npm publish`
3. **npm prepublishOnly hook** (`package.json:42`): Triggers `bun run build` WITHOUT version define
4. **Result**: Versioned executable gets overwritten with "1.0.0-dev" default

### Verified Implementation
The semantic-release configuration already handles executable building correctly:
- `.releaserc.json:8-12`: @semantic-release/exec plugin with prepareCmd
- Builds 3 executables with version injection: cc-track, cc-track-linux, cc-track-windows.exe
- Uses `--define 'process.env.BUILD_VERSION="${nextRelease.version}"'`

## Implementation Details

### Current prepublishOnly Script Location
File: `package.json:42`
```json
"prepublishOnly": "bun run build",
```

### Fix Implementation
Simply delete line 42 from package.json. No replacement needed.

### Version Injection Mechanism
File: `src/cli/index.ts:17`
```typescript
const VERSION = process.env.BUILD_VERSION || '1.0.0-dev';
```

### Semantic-Release Build Configuration
File: `.releaserc.json:8-12`
```json
[
  "@semantic-release/exec",
  {
    "prepareCmd": "bun run scripts/embed-resources.ts && bun build src/cli/index.ts --compile --define 'process.env.BUILD_VERSION=\"${nextRelease.version}\"' --outfile dist/cc-track && bun build src/cli/index.ts --compile --target=bun-linux-x64 --define 'process.env.BUILD_VERSION=\"${nextRelease.version}\"' --outfile dist/cc-track-linux && bun build src/cli/index.ts --compile --target=bun-windows-x64 --define 'process.env.BUILD_VERSION=\"${nextRelease.version}\"' --outfile dist/cc-track-windows.exe"
  }
]
```

## Current Focus
Remove the prepublishOnly script from package.json:42

## Research Findings

### Evidence of Issue
- **Test Build Without Version**: `bun run build` produces executable showing "1.0.0-dev"
- **Test Build With Version**: Manual semantic-release style build shows correct version "1.37.0-test"
- **GitHub Releases**: v1.37.0 executable correctly shows "1.37.0" (104,550,609 bytes)
- **NPM Package**: Same version shows "1.0.0-dev" (104,550,635 bytes) - different file size confirms different build

### Historical Context
- **TASK_048**: Added prepublishOnly script for npm package safety
- **TASK_046**: Implemented BUILD_VERSION injection mechanism
- **TASK_027**: Added semantic-release with exec plugin for versioned builds

### Execution Order Verification
1. semantic-release runs prepareCmd → builds versioned executables
2. @semantic-release/npm runs → triggers npm publish
3. npm publish runs prepublishOnly → rebuilds without version (THE BUG)
4. npm packages the newly-rebuilt unversioned executable

## Next Steps
1. Delete `"prepublishOnly": "bun run build",` from package.json:42
2. Test build process still works correctly
3. Verify next release will have properly versioned npm package

## Open Questions & Blockers
None - the fix is straightforward and well-understood.

## Resolution Notes
This is a simple one-line deletion that fixes version consistency between npm packages and GitHub releases. The prepublishOnly script was originally added for safety but became harmful when semantic-release was properly configured to build versioned executables.

<!-- github_issue: 113 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/113 -->
<!-- issue_branch: 113-fix-npm-package-version-display-issue -->