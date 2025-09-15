# Add Comprehensive Code Review Feature to cc-track

**Purpose:** Add an optional code review feature that runs after validation passes in the prepare-completion phase, launching a Claude Code SDK agent to perform comprehensive code review and write analysis to code-reviews directory.

**Status:** completed
**Started:** 2025-09-15 08:58
**Task ID:** 054

## Requirements
- [ ] Add `code_review` section to track.config.json under `features` with `enabled` flag (default: false)
- [ ] Create `performCodeReview()` function in `src/lib/claude-sdk.ts`
- [ ] Configure function with taskId, taskTitle, taskRequirements, gitDiff, projectRoot parameters
- [ ] Use Claude SDK with Sonnet model, 10-minute timeout, 30 turns max
- [ ] Grant Read, Grep, Glob permissions plus Write/Edit to code-reviews/ directory only
- [ ] Return structured review result with markdown content
- [ ] Integrate into prepare-completion command after validation passes
- [ ] Check if review file already exists for task (glob for `code-reviews/TASK_XXX_*.md`)
- [ ] Skip review if file already exists and inform user
- [ ] If no review exists, gather task requirements, git diff, task ID and title
- [ ] Ensure code-reviews/ directory exists before writing
- [ ] Write output to `code-reviews/TASK_XXX_[DATE].md` format
- [ ] Show summary to user with path to review file
- [ ] Include task summary, requirements alignment, security assessment, code quality analysis, performance considerations, architectural concerns, improvement suggestions, and overall verdict in review file
- [ ] Add tests to prepare-completion.test.ts that mock the ClaudeSDK performCodeReview function
- [ ] Test both enabled and disabled code review scenarios
- [ ] Test skipping review when file already exists
- [ ] Test file creation and error handling

## Success Criteria
- Code review feature can be enabled/disabled via configuration
- When enabled and no existing review exists, comprehensive code review is generated after validation passes
- Review files are written to code-reviews/ directory with proper naming convention
- Existing reviews are detected and skip duplicate generation
- Feature is fully tested with appropriate mocks
- User receives clear feedback about review generation or skipping

## Technical Approach
- Extend existing ClaudeSDK patterns with new performCodeReview function
- Use dependency injection pattern consistent with other commands
- Configure agent with restricted permissions for security
- Implement idempotent behavior by checking for existing review files
- Follow existing test patterns with mock creation functions

## Recent Progress
- Researched existing codebase structure and patterns for implementing code review feature
- Analyzed validation library (src/lib/validation.ts) to understand current validation flow
- Examined existing code-reviews directory and file naming conventions (TASK_XXX_[DATE].md format)
- Investigated track.config.json structure and configuration patterns
- Reviewed Claude SDK usage patterns in claude-sdk.ts for consistent implementation
- Analyzed prepare-completion command structure and integration points
- Clarified requirements: hardcode 10-minute timeout and 30 turns max (not configurable)
- Implemented performCodeReview() function in claude-sdk.ts with all required parameters
- Added code_review configuration to track.config.json with enabled flag (default: false)
- Integrated code review into prepare-completion command after validation passes
- Implemented idempotent behavior - skips if review file already exists
- Added comprehensive test suite covering all scenarios (enabled/disabled, existing reviews, errors)
- Fixed test to expect full task content instead of just requirements section
- Successfully ran automated code review on own implementation - all requirements met
- Updated Biome configuration to treat all warnings as errors for stricter validation

## Current Focus

Task completed on 2025-09-15

## Open Questions & Blockers
None - task successfully completed with comprehensive code review feature fully operational

## Next Steps
1. Examine current track.config.json structure and config types
2. Add code_review configuration section with proper TypeScript types
3. Create performCodeReview function in claude-sdk.ts
4. Integrate review logic into prepare-completion command

<!-- github_issue: 52 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/52 -->
<!-- issue_branch: 52-add-comprehensive-code-review-feature-to-cc-track -->