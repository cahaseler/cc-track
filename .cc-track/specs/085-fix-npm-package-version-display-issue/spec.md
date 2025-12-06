# Feature Specification: Fix NPM Package Version Display Issue

**Feature ID**: `085`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Remove the redundant prepublishOnly script that overwrites correctly-versioned executables built by semantic-release, causing npm packages to show "1.0.0-dev" instead of the actual version.

## Requirements

- [ ] Remove the `prepublishOnly` script from package.json line 42
- [ ] Verify that semantic-release prepareCmd builds executables with correct version
- [ ] Test that next npm publish contains correctly-versioned executable
- [ ] Document the fix in decision log

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
