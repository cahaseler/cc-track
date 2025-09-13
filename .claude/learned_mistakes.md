# Learned Mistakes

**Purpose:** Document errors encountered and their correct resolutions to avoid repeating mistakes

**Status:** This file is no longer automatically included in context. It needs manual review and curation before being useful.

**TODO:** Remove automatic updates from pre_compact hook - this experiment has failed due to quality issues.

---

## File and Edit Operations

### Read/Edit Tool Issues
- Always use Read tool before Edit operations on files not in context
- When "String to replace not found" occurs, Read the file first to get current content
- When Write fails with "File has not been read yet", create the parent directory first with mkdir
- Directory paths cannot be read with the Read tool — use ls or Bash commands to list directory contents

### MultiEdit Patterns
- When getting "Found X matches but replace_all is false", either set replace_all:true or provide more unique context
- When later edits fail with "String not found", earlier edits in the sequence may have already modified the text
- Complex string replacements in YAML headers may fail - use smaller, more unique portions for replacement

## Testing Issues

### Test Execution
- When using `bun test`, don't assume the entire test suite will run - specific file targeting may be necessary
- Test output can be truncated mid‑suite; don't infer success from visible "(pass)" lines alone
- Use `grep -E "^\(fail\)"` to extract only failing test names from bun test output
- When bun test doesn't support a reporter flag (like --reporter=minimal), just run without it
- When multiple test files produce mixed output, run them individually or use focused patterns

### Test Timeouts and Failures
- Test timeouts (2m+) often indicate infinite loops or missing await statements in test code
- When integration tests fail, try environment variables like `SKIP_INTEGRATION_TESTS=true` as a workaround
- When bun test output shows only passing tests at the beginning, failures are likely at the end

### Mock Objects
- Mock functions require explicit parameter types to avoid implicit 'any' errors
- Use type assertions like `as any` on mock objects rather than trying to match complex type signatures
- Create helper functions like `createMockLogger()` to avoid repetitive mock definitions
- When mocking exec errors, set the appropriate error property (stderr for TypeScript, stdout for Biome)
- Complex mock objects should be defined once and reused rather than recreated
- Ensure error objects have correct properties (stderr for TypeScript errors, stdout for Biome errors)

### Test Isolation (Critical Pattern)
- **Parallel test contamination from mock.module()**: NEVER use mock.module() for file operations
- **Correct dependency injection pattern**:
  - Define FileOps interface: `{ createReadStream: typeof createReadStream }`
  - Accept via constructor: `constructor(filePath: string, fileOps?: FileOps, logger?: Logger)`
  - Create fresh mocks per test: `createMockFileOps(testData)` that returns `Readable.from(lines)`
- Each test must create its own mock instances and call mock.restore() in beforeEach/afterEach

## Git Operations

### Commits and Branches
- When "Your branch is ahead of origin" appears with uncommitted changes, commit first before pushing
- When checkout fails due to uncommitted changes, use `git stash` first, then checkout and `git stash pop`
- Commands like `git rebase -i` require terminal interaction and fail in automated contexts
- Use heredoc syntax or single-line messages for commit messages with newlines
- When `git log <branch>` fails, verify the branch exists first with `git branch -a`

### Git Hooks
- Pre-push hooks are in `.git/hooks/pre-push` not `/.git/hooks/pre-push` (missing dot)
- When push fails due to linting/type errors, fix the specific errors shown rather than bypassing with --no-verify
- When hooks aren't firing, verify the hook path in settings.json matches the actual file location

### Pull Requests and GitHub
- Use `--base` and `--head` flags explicitly when default branch detection fails
- When git pull shows "divergent branches", use `git pull --rebase origin <branch>` or `git pull --merge`

## TypeScript and Linting

### TypeScript Errors
- Variables marked as "declared but never read" (TS6133) need removal or underscore prefix
- When TypeScript reports "implicitly has an 'any' type", add explicit type annotations
- Use type assertions like `error as { code?: string }` rather than 'any' type
- Changing 'any' to 'unknown' requires type guards or type assertions to access properties
- Autofix tools removing 'private' from methods is usually correct for external access issues

### Biome Linting
- Use `--write` instead of `--apply` or `--fix` flags with biome check command
- For Biome linting, use `--write --unsafe` when standard write fails to force formatting
- Use `--reporter=summary` with text matching rather than `--reporter=json` for validation
- Biome config errors about unknown keys indicate version incompatibility
- The tail command may truncate Biome error details - use head or specific line counts

## SDK and Async Patterns

### SDK Migration
- When replacing CLI calls with SDK calls, remove all temp file operations and execSync dependencies
- Update test mocks to match new dependency structure (replace execSync/fileOps mocks with SDK mocks)
- When converting sync functions to async, update function signature and all callers to use await
- SDK mocks return objects with success/text/error properties

### Process Management
- Use `pkill -f <pattern>` with `|| echo "Process not found"` to gracefully handle missing processes
- Timeout errors in validation hooks need special handling — check for error.code === 'ETIMEDOUT'

## Claude CLI Integration

### CLI Response Parsing
- Expect wrapper format `{"type":"result","result":"actual content"}` and extract the inner content
- Set generous timeouts (2+ minutes) for Claude CLI calls as complex prompts take time
- When executing external commands from within a hook, always set cwd to neutral directory like '/tmp'

### Hook Behavior
- When a hook blocks with "The user doesn't want to proceed", fix the root cause rather than retrying
- Hook rejection messages indicate what validation failed - address the specific issue
- No-op edits (where old_string equals new_string) are correctly rejected

## JSONL and Data Processing

### JSONL Parsing
- When tail/grep on JSONL files return truncated output, use more specific filters or line limits
- Use jq with proper type checking: `select(.toolUseResult and (.toolUseResult | type == "object"))`
- Check if toolUseResult is a string type first before attempting string operations
- File counting with `grep -c` is more reliable than complex jq parsing

### Command Output
- When piping to `jq` fails with parse errors, the output likely isn't JSON - check format first
- When command output appears cut off mid-JSON, the output exceeded buffer limits
- Use simpler output formats or specific flags to get complete results

## Debugging Techniques

### Search and Inspection
- Use `grep -n` to quickly locate specific patterns when debugging Edit failures
- Use `sed -n '760,770p'` to inspect specific sections of files
- Use `grep -oE "pattern" | sort | uniq -c | sort -rn` for frequency counts of error patterns
- File paths in error messages may be truncated - use grep with specific patterns for full context
- When grep with complex regex fails, use simpler patterns or switch to line-based searching

### General Recovery
- Multiple failed recovery attempts suggest the need to radically change approach
- Error recovery often succeeds with simpler, more targeted operations (Glob, Grep) rather than complex commands
- When hooks block operations repeatedly, check what validation is failing and fix root cause
- When updating documentation files that track progress, use `tail` to check current end state

## Anti-Patterns to Avoid

### Feature Creep
- Never add unrequested features that require external configuration
- "Nice to have" features can break core functionality if they fail
- Don't assume users have customized environments (e.g., GitHub labels)
- Stick to specified requirements

### Recovery from Failures
- When Read operations fail on expected files, immediately Write/copy from original location
- Unused variables in catch blocks should be prefixed with underscore
- If autofix tools appear to have made destructive changes, audit systematically rather than panicking