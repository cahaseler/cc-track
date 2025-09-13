# Learned Mistakes

**Purpose:** Document errors encountered and their correct resolutions to avoid repeating mistakes

**Instructions:**
- This file is automatically updated by the pre_compact hook
- Each entry shows an error pattern and the correct solution
- Review these before attempting similar operations

---

## Error Patterns

*(Entries will be added here by the pre_compact hook)*

### Session: 2025-09-13 18:29
- When using `bun test` or `bun run`, don't assume the entire test suite will run - specific file targeting may be necessary
- For Biome linting, use `--write --unsafe` when standard write fails to force formatting
- When integration tests fail, try environment variables like `SKIP_INTEGRATION_TESTS=true` as a workaround
- If Edit operations fail repeatedly, always use Read to verify the current file content first
- Timeouts and integration test failures often indicate deeper issues with the test implementation, not just the code being tested
- Multiple failed recovery attempts suggest the need to radically change approach
- When tool operations fail across multiple attempts, step back and reassess the entire approach rather than repeatedly trying similar methods

### Session: 2025-09-12 15:09
- **SDK migration patterns**: When replacing CLI calls with SDK calls, remove all temp file operations and execSync dependencies - the SDK handles everything internally
- **Test dependency updates**: When migrating from CLI to SDK in code, update test mocks to match the new dependency structure (replace execSync/fileOps mocks with SDK mocks)
- **Process cleanup**: Use `pkill -f <pattern>` with `|| echo "Process not found"` to gracefully handle when processes aren't running
- **Test timeout debugging**: When tests timeout after 2 minutes, the issue is likely in the test code itself (infinite loops, missing await) not the code being tested
- **Async function signatures**: When converting sync functions (execSync) to async (SDK calls), update the function signature to async and all callers to use await
- **Mock object structure changes**: When refactoring from CLI to SDK, test mocks need matching structure changes - SDK mocks return objects with success/text/error properties

### Session: 2025-09-12 08:53
- **Hook rejection recovery**: When a hook blocks an edit with "The user doesn't want to proceed", the rejection message indicates what validation failed - fix the root cause rather than retrying the same edit
- **Complex string replacements in YAML headers**: When editing YAML frontmatter with multiline strings, Edit operations may fail to find exact matches - use smaller, more unique portions of the string for replacement
- **JSON parsing of CLI output**: When piping command output to `jq` fails with parse errors, the output likely isn't JSON - run the command without jq first to see the actual output format
- **Truncated command output**: When command output appears cut off mid-JSON (ending with incomplete fields), the output exceeded buffer limits - use simpler output formats or specific flags to get complete results
- **Git log on non-existent branches**: When `git log <branch>` fails, verify the branch exists first with `git branch -a` rather than assuming branch naming conventions

### Session: 2025-09-12 21:17
- When tail truncates Biome check output mid-error, use head or specific line counts to see the beginning of error messages which contain the actual error details
- Test timeouts (2m+) often indicate infinite loops or hanging operations in test code - check for missing await statements or improper mock implementations
- When bun test output shows only passing tests at the beginning, failures are likely at the end - use grep with fail patterns or check the test summary counts
- Use `grep -E "^\(fail\)"` to extract only failing test names from bun test output, avoiding partial matches in test descriptions
- When multiple test files produce mixed output, run them individually or use focused patterns to isolate specific failures
- Error recovery often succeeds with simpler, more targeted operations (Glob, Grep) rather than complex commands after initial failures

### Session: 2025-09-12 20:50
- **TypeScript unused variable errors**: Variables/imports marked as "declared but never read" (TS6133) need to be either removed or prefixed with underscore to indicate intentional non-use
- **Mock object updates in tests**: When adding new properties to mock objects that appear multiple times, use MultiEdit with replace_all:true or update each occurrence individually with unique context

### Session: 2025-09-11 19:41
- When TypeScript reports type errors after adding mocks, use type assertions like `as any` on mock objects rather than trying to match complex type signatures
- Create helper functions like `createMockLogger()` to avoid repetitive mock definitions across multiple test cases
- Directory listings with `ls` fail on non-existent paths - verify parent directory exists before attempting to list subdirectories
- File paths in error messages may be truncated - use grep with specific patterns to find the full context
- When updating documentation files that track progress, use `tail` to check the current end state before attempting edits

### Session: 2025-09-11 15:43
- **Git pull with divergent branches**: When git pull shows "divergent branches" hint, use `git pull --rebase origin <branch>` to avoid merge commits, or `git pull --merge` if merge is preferred
- **Incomplete error messages**: When git operations show truncated hints (ending with "...h"), the full message likely recommends using `--rebase` or `--merge` flags explicitly

### Session: 2025-09-11 12:42
- When mocking exec errors for tests, set the appropriate error property based on the tool being tested (stderr for TypeScript, stdout for Biome)
- Use grep with line numbers (`grep -n`) to quickly locate specific patterns when debugging Edit failures
- Complex mock objects in tests should be defined once and reused rather than recreated in each test case
- When Write fails with "File has not been read yet", create the parent directory first with mkdir or verify it exists with ls

### Session: 2025-09-11 10:30
- When bun test output shows truncated test names with "(fail)" prefix, use more specific test name patterns or increase output lines to see full error context
- When test mocks throw errors, ensure the error object has the correct properties (stderr for TypeScript errors, stdout for Biome errors) that the code expects
- Directory paths cannot be read with the Read tool — use ls or Bash commands to list directory contents instead
- When hooks block operations repeatedly, check what validation is failing and fix that root cause rather than retrying the same edit
- When grep with complex regex patterns fails, use simpler patterns or switch to line-based searching with sed
- Timeout errors in validation hooks need special handling — check for error.code === 'ETIMEDOUT' in addition to error messages

### Session: 2025-09-11 08:49
- Use sed with line ranges (e.g., `sed -n '760,770p'`) to quickly inspect specific sections of files when debugging test failures
- Use grep with specific patterns like `grep -n "as any"` to quickly locate TypeScript type issues that need fixing
- When fixing TypeScript 'any' types, use type assertions like `error as { code?: string }` or create proper type definitions
- When bun test doesn't support a reporter flag (like --reporter=minimal), just run without it rather than trying alternatives
- Use `grep -oE "pattern" | sort | uniq -c | sort -rn` to get frequency counts of specific error patterns in output

### Session: 2025-09-11 23:23
- **Missing file recovery**: When Read operations fail on expected files, immediately Write/copy from the original location rather than retrying Read

### Session: 2025-09-11 22:25
- **Biome CLI flags**: Use `--write` instead of `--apply` or `--fix` flags with biome check command
- **Git pre-push hooks**: When push fails due to linting/type errors, fix the specific errors shown rather than bypassing with --no-verify
- **GitHub PR creation**: Use `--base` and `--head` flags explicitly when default branch detection fails
- **Unused variables in catch blocks**: Prefix with underscore (e.g., `_commitError`) to satisfy linters
- **No-op edits**: When old_string and new_string are identical, the Edit tool correctly rejects the operation
- **Git hooks location**: Pre-push hooks are in `.git/hooks/pre-push` not `/.git/hooks/pre-push` (missing dot in path)
- **Biome output parsing**: Use `--reporter=summary` with text matching rather than `--reporter=json` for simpler validation checks

### Session: 2025-09-11 21:13
- When TypeScript reports "implicitly has an 'any' type" errors, add explicit type annotations to parameters and variables
- Type assertions like `error as { stdout?: string; stderr?: string }` are more maintainable than using 'any' type
- When renaming projects, expect to find references in unexpected places - use grep extensively to find all occurrences

### Session: 2025-09-12 17:00
- **Feature creep without permission**: Never add unrequested features like GitHub labels that require external configuration - stick to the specified requirements
- **Silent failures from optional features**: When adding "nice to have" features, they can break core functionality if they fail (e.g., label creation failing prevented issue creation)
- **Assumption about user environments**: Don't assume users have customized GitHub repos with specific labels - tools should work with standard configurations

### Session: 2025-09-12 21:20 (Log Parser Implementation)
- **Parallel test contamination from mock.module()**: Used mock.module() for fs operations in log-parser tests, causing parallel test failures - this is the THIRD time making this exact mistake despite it being documented
- **Correct dependency injection pattern for stream-based file operations**:
  - Define FileOps interface: `{ createReadStream: typeof createReadStream }`
  - Accept via constructor: `constructor(filePath: string, fileOps?: FileOps, logger?: Logger)`
  - Create fresh mocks per test: `createMockFileOps(testData)` that returns `Readable.from(lines)`
  - NEVER use mock.module() or global mocks for file operations
- **Stream processing vs readline**: Direct stream processing with manual line buffering is more testable than readline.createInterface
- **Test isolation**: Each test must create its own mock instances and call mock.restore() in beforeEach/afterEach

### Common Patterns (Consolidated)
- **File operations**: Always use Read tool before Edit operations on files not in context. When "String to replace not found" occurs, Read the file first to get current content
- **MultiEdit patterns**: When getting "Found X matches but replace_all is false", either set replace_all:true or provide more unique context. When later edits fail with "String not found", earlier edits may have already modified the text
- **Test output**: Console output can be truncated mid‑suite; don't infer success from visible "(pass)" lines alone. Re‑run with focused patterns or verify summarized pass/fail counts
- **Git operations**:
  - When "Your branch is ahead of origin" appears with uncommitted changes, commit first before pushing
  - When checkout fails due to uncommitted changes, use `git stash` first, then checkout and `git stash pop`
  - Commands like `git rebase -i` require terminal interaction and fail in automated contexts
  - Use heredoc syntax or single-line messages for commit messages with newlines
- **TypeScript patterns**:
  - Mock functions require explicit parameter types to avoid implicit 'any' errors
  - Use type assertions like `error as { code?: string }` rather than 'any' type
  - Variables marked as "declared but never read" need removal or underscore prefix
- **Hook issues**: When hooks aren't firing, verify the hook path in settings.json matches the actual file location
- **JSONL parsing**: When tail/grep on JSONL files return truncated output, use more specific filters or line limits to avoid mid-entry cuts

### Claude CLI Specific
- When parsing Claude CLI responses, expect wrapper format {"type":"result","result":"actual content"} and extract the inner content
- Set generous timeouts (2+ minutes) for Claude CLI calls as complex prompts take time to process
- When executing external commands from within a hook, always set cwd to a neutral directory like '/tmp' to avoid triggering recursive hooks in the project directory

### JSONL and jq Patterns
- When analyzing JSONL transcript files, use jq with proper type checking: `select(.toolUseResult and (.toolUseResult | type == "object"))` to avoid parsing errors on mixed data types
- For extracting error messages from tool results, check if toolUseResult is a string type first with `(.toolUseResult | type == "string")` before attempting string operations
- File counting operations like `grep -c` are more reliable than complex jq parsing when determining the number of matching entries in JSONL files

### Biome and TypeScript Validation
- When Biome check with --reporter=json flag produces output that jq can't parse, the output likely isn't valid JSON - check Biome's actual output format first
- When autofix tools modify visibility modifiers (removing 'private'), this is usually correct behavior for fixing external access issues
- Biome config errors about unknown keys indicate version incompatibility - check documentation for supported options
- Changing 'any' to 'unknown' requires type guards or type assertions to access properties

### Manual Entry: 2025-09-10 14:30 (Task 017/018)
- When TypeScript reports a method doesn't exist on a class, check if the visibility modifier was changed before assuming the method was deleted
- Autofix tools generally make safe changes - removing 'private' from a method called externally is correct behavior
- Always read the full file context before claiming code was deleted - grep/search alone can be misleading
- If autofix tools appear to have made destructive changes, audit systematically rather than panicking