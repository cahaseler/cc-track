# TASK_078: Fix Claude SDK Copying Branch Comments from Other Task Files

## Purpose
Fix the issue where the Claude SDK copies HTML comments (like `<!-- issue_branch: ... -->`) from existing task files when creating new task files, causing branch name mismatches and breaking the complete-task PR flow.

## Status
- **Current Status**: in_progress
- **Started**: 2025-09-18 08:31
- **Estimated Completion**: TBD

## Requirements
- [x] Add explicit warning to the prompt in generateResearchPrompt function
- [x] Implement post-processing to clean up any copied comments after task file creation
- [x] Apply the same cleaning to the fallback path
- [x] Ensure correct metadata is added later by the normal flow
- [x] Test that the fix prevents branch name mismatches
- [x] Verify that the complete-task PR flow works correctly

## Success Criteria
- [x] New task files no longer contain copied HTML comments from other task files
- [x] Branch names in task files match the actual working branch
- [x] Complete-task PR flow functions correctly without branch mismatches
- [x] Existing functionality remains unaffected
- [x] Solution is minimal and focused

## Technical Approach

### 1. Prevention: Add Explicit Warning to Prompt
- Modify the `generateResearchPrompt` function after line 160
- Add clear instruction: "IMPORTANT: Do NOT copy any HTML comments (<!-- ... -->) from other task files. These are metadata added later and should not be included in your task file."

### 2. Cleanup: Post-Processing to Remove Comments
- After Claude creates the task file (line 305 in `enrichPlanWithResearch`)
- Read file content and remove any prematurely added HTML comments using regex:
  ```typescript
  // Clean up any HTML comments that shouldn't be there yet
  let content = fileOps.readFileSync(taskFilePath, 'utf-8');
  content = content.replace(/<!--\s*(github_issue|github_url|issue_branch|branch):.*?-->/g, '');
  fileOps.writeFileSync(taskFilePath, content.trim());
  ```

### 3. Fallback Path Update
- Apply the same cleaning after line 331 where the fallback creates a task file

## Recent Progress

**2025-09-18 12:40** - Task completed successfully:
- Added explicit warning to `generateResearchPrompt` about not copying HTML comments (line 161)
- Implemented post-processing cleanup using regex pattern to remove metadata comments (lines 309-319)
- Applied same cleanup to fallback path (lines 345-356)
- Extracted regex to constant `HTML_METADATA_COMMENT_REGEX` for maintainability
- Added debug logging when comments are removed for production monitoring
- Created comprehensive tests for both comment removal and prompt warning
- All 366 tests pass, TypeScript compiles, linting passes
- Code review: APPROVED with excellent scores across all categories

## Current Focus

Task completed on 2025-09-18
