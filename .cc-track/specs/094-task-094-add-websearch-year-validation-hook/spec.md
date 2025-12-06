# Feature Specification: TASK_094: Add WebSearch Year Validation Hook

**Feature ID**: `094`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Implement smart detection in the `pre-tool-validation` hook to prevent Claude from searching for outdated year patterns like "topic 2024" when the current year is 2025, ensuring search queries use current year for better results.

## Requirements

- [ ] Add WebSearch detection to `src/hooks/pre-tool-validation.ts:166-169` alongside existing Edit/Write/MultiEdit tools
- [ ] Extract and analyze query from `tool_input.query` field for WebSearch tools
- [ ] Detect year patterns using regex: `\b(20\d{2})\b` where year < current year (2025)
- [ ] Block outdated searches with educational feedback explaining the issue and suggesting corrected query
- [ ] Allow legitimate historical searches with comparison keywords or explicit historical context
- [ ] Add comprehensive test coverage in `src/hooks/pre-tool-validation.test.ts` following existing test patterns
- [ ] Add configuration option to `track.config.json` to enable/disable feature (default: enabled)
- [ ] Update settings.json to enable WebSearch validation alongside existing tools

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
