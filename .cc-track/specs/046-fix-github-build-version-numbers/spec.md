# Feature Specification: Fix GitHub Build Version Numbers

**Feature ID**: `046`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Update the build process to inject the actual release version into binaries instead of showing hardcoded "1.0.0", using semantic-release environment variables at build time.

## Requirements

- [x] Update `src/cli/index.ts` to use build-time injected version with fallback
- [x] Modify `.releaserc.json` exec plugin's `prepareCmd` to use `--define` flag for version injection
- [x] Ensure local builds show "1.0.0-dev" to distinguish from releases
- [x] Ensure release binaries show correct semantic version
- [x] Test local build shows development version
- [x] Test manual build with version injection works correctly

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
