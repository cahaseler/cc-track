# Feature Specification: Integrate DiffSummary into Stop-Review Hook for Token Reduction

**Feature ID**: `043`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Optimize the stop-review hook by using DiffSummary with Haiku to compress large git diffs before sending to Sonnet, reducing token usage by ~80% while maintaining deviation detection capability.

## Requirements

- [x] Split large diffs into manageable chunks by file groups
- [x] Implement parallel summarization using DiffSummary with Haiku model
- [x] Create two-stage review process: compression then deviation detection
- [x] Modify `src/hooks/stop-review.ts` to add DiffSummary dependencies
- [x] Create `compressDiffForReview()` method with diff splitting logic
- [x] Update `buildReviewPrompt()` to handle compressed vs raw diffs
- [x] Modify `review()` method to call compression before building prompt
- [x] Add comprehensive tests in `src/hooks/stop-review.test.ts`
- [x] Implement fallback to truncated original diff on compression failure
- [x] Handle edge cases: small diffs, empty summaries, API rate limits
- [x] Add logging for compression statistics and performance metrics

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
