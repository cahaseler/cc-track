# Learned Mistakes

**Purpose:** Document errors encountered and their correct resolutions to avoid repeating mistakes

**Instructions:**
- This file is automatically updated by the pre_compact hook
- Each entry shows an error pattern and the correct solution
- Review these before attempting similar operations

---

## Error Patterns

*(Entries will be added here by the pre_compact hook)*

### Session: 2025-09-12 08:53
- **Hook rejection recovery**: When a hook blocks an edit with "The user doesn't want to proceed", the rejection message indicates what validation failed - fix the root cause rather than retrying the same edit
- **Complex string replacements in YAML headers**: When editing YAML frontmatter with multiline strings, Edit operations may fail to find exact matches - use smaller, more unique portions of the string for replacement
- **JSON parsing of CLI output**: When piping command output to `jq` fails with parse errors, the output likely isn't JSON - run the command without jq first to see the actual output format
- **Truncated command output**: When command output appears cut off mid-JSON (ending with incomplete fields), the output exceeded buffer limits - use simpler output formats or specific flags to get complete results
- **Git log on non-existent branches**: When `git log <branch>` fails, verify the branch exists first with `git branch -a` rather than assuming branch naming conventions

### Session: 2025-09-12 21:17
- When git status shows "Your branch is ahead of origin" with uncommitted changes, commit first before pushing - the push will fail until changes are staged and committed
- When tail truncates Biome check output mid-error, use head or specific line counts to see the beginning of error messages which contain the actual error details
- Test timeouts (2m+) often indicate infinite loops or hanging operations in test code - check for missing await statements or improper mock implementations
- When bun test output shows only passing tests at the beginning, failures are likely at the end - use grep with fail patterns or check the test summary counts
- Use `grep -E "^\(fail\)"` to extract only failing test names from bun test output, avoiding partial matches in test descriptions
- When multiple test files produce mixed output, run them individually or use focused patterns to isolate specific failures
- Error recovery often succeeds with simpler, more targeted operations (Glob, Grep) rather than complex commands after initial failures

### Session: 2025-09-12 20:50
- **Git push prerequisites**: When "Your branch is ahead of origin" appears, ensure all changes are committed before pushing - uncommitted changes will block the push
- **TypeScript unused variable errors**: Variables/imports marked as "declared but never read" (TS6133) need to be either removed or prefixed with underscore to indicate intentional non-use
- **Biome check output parsing**: The tail command may truncate error details - use full output or specific error counts rather than relying on truncated messages
- **Mock object updates in tests**: When adding new properties to mock objects that appear multiple times, use MultiEdit with replace_all:true or update each occurrence individually with unique context

### Session: 2025-09-11 19:41
- When encountering "Found X matches but replace_all is false" errors, use MultiEdit with replace_all:true for bulk replacements across multiple occurrences
- When MultiEdit fails with "String to replace not found" on later edits, earlier edits in the sequence may have already modified the target text - split into separate Edit operations
- Test output can be truncated mid-suite showing only partial results - use specific test patterns with `-t "<pattern>"` to focus on failing tests
- When TypeScript reports type errors after adding mocks, use type assertions like `as any` on mock objects rather than trying to match complex type signatures
- Create helper functions like `createMockLogger()` to avoid repetitive mock definitions across multiple test cases
- Directory listings with `ls` fail on non-existent paths - verify parent directory exists before attempting to list subdirectories
- When git checkout fails due to uncommitted changes, either commit the changes or use `git stash` before switching branches
- File paths in error messages may be truncated - use grep with specific patterns to find the full context
- When updating documentation files that track progress, use `tail` to check the current end state before attempting edits
- TypeScript mock functions require explicit parameter types in their signatures to avoid implicit 'any' errors

### Session: 2025-09-11 15:43
- **Git checkout conflicts**: When git checkout fails due to uncommitted changes, use `git stash` first to save local changes, then checkout and `git stash pop` to restore them
- **Git pull with divergent branches**: When git pull shows "divergent branches" hint, use `git pull --rebase origin <branch>` to avoid merge commits, or `git pull --merge` if merge is preferred
- **Incomplete error messages**: When git operations show truncated hints (ending with "...h"), the full message likely recommends using `--rebase` or `--merge` flags explicitly

### Session: 2025-09-11 12:42
- When MultiEdit encounters "String to replace not found" errors, verify the exact string exists in the file with Read rather than relying on grep output
- Mock functions in tests require explicit parameter types (e.g., `mock((cmd: string) => ...)`) to avoid TypeScript implicit 'any' errors
- When mocking exec errors for tests, set the appropriate error property based on the tool being tested (stderr for TypeScript, stdout for Biome)
- When Edit reports "Found X matches but replace_all is false", use MultiEdit with replace_all:true for bulk changes or provide more unique context
- Use grep with line numbers (`grep -n`) to quickly locate specific patterns when debugging Edit failures
- Complex mock objects in tests should be defined once and reused rather than recreated in each test case
- When Write fails with "File has not been read yet", create the parent directory first with mkdir or verify it exists with ls

### Session: 2025-09-11 10:30
- When bun test output shows truncated test names with "(fail)" prefix, use more specific test name patterns or increase output lines to see full error context
- When Edit tool fails with "File has not been read yet", the Read operation may succeed but still not register the file as read — ensure a Read precedes Edit
- When test mocks throw errors, ensure the error object has the correct properties (stderr for TypeScript errors, stdout for Biome errors) that the code expects
- When MultiEdit encounters "String to replace not found" on later edits in sequence, earlier edits may have already modified the text — verify file state between edits
- Directory paths cannot be read with the Read tool — use ls or Bash commands to list directory contents instead
- When hooks block operations repeatedly, check what validation is failing and fix that root cause rather than retrying the same edit
- When grep with complex regex patterns fails, use simpler patterns or switch to line-based searching with sed
- Timeout errors in validation hooks need special handling — check for error.code === 'ETIMEDOUT' in addition to error messages

### Session: 2025-09-11 08:49
- When encountering "File has not been read yet" errors, always use Read tool first even if you've seen the file content recently in the conversation
- When Edit tool reports "String to replace not found", use Read to get actual file content instead of relying on memory or assumptions about file state
- When MultiEdit gets "Found X matches but replace_all is false", either set replace_all:true or provide more unique context strings for single replacements
- Use sed with line ranges (e.g., `sed -n '760,770p'`) to quickly inspect specific sections of files when debugging test failures
- Use grep with specific patterns like `grep -n "as any"` to quickly locate TypeScript type issues that need fixing
- When fixing TypeScript 'any' types, use type assertions like `error as { code?: string }` or create proper type definitions
- For complex mock objects in tests, define a helper function like `createMockLogger()` to avoid repetitive mock definitions
- When bun test doesn't support a reporter flag (like --reporter=minimal), just run without it rather than trying alternatives
- Use `grep -oE "pattern" | sort | uniq -c | sort -rn` to get frequency counts of specific error patterns in output

### Session: 2025-09-11 23:48

### Session: 2025-09-11 23:23
- **Missing file recovery**: When Read operations fail on expected files, immediately Write/copy from the original location rather than retrying Read

### Session: 2025-09-11 22:25
- **Biome CLI flags**: Use `--write` instead of `--apply` or `--fix` flags with biome check command
- **Git pre-push hooks**: When push fails due to linting/type errors, fix the specific errors shown rather than bypassing with --no-verify
- **GitHub PR creation**: Use `--base` and `--head` flags explicitly when default branch detection fails
- **Unused variables in catch blocks**: Prefix with underscore (e.g., `_commitError`) to satisfy linters
- **Recovery pattern mismatch**: The recorded recovery attempts show reads/edits to unrelated files (track.config.json) that don't match the actual failures - this indicates misleading error logging
- **No-op edits**: When old_string and new_string are identical, the Edit tool correctly rejects the operation
- **Git hooks location**: Pre-push hooks are in `.git/hooks/pre-push` not `/.git/hooks/pre-push` (missing dot in path)
- **Biome output parsing**: Use `--reporter=summary` with text matching rather than `--reporter=json` for simpler validation checks

### Session: 2025-09-11 21:13
- When Edit tool reports "File has not been read yet", always use Read tool first even if you believe you've seen the file content recently
- When TypeScript reports "implicitly has an 'any' type" errors, add explicit type annotations to parameters and variables
 
- When TypeScript reports "implicitly has an 'any' type" errors, add explicit type annotations to parameters and variables
- When MultiEdit encounters multiple matches with replace_all:false, either set replace_all:true for all occurrences or provide more unique context strings
- Type assertions like `error as { stdout?: string; stderr?: string }` are more maintainable than using 'any' type
- When renaming projects, expect to find references in unexpected places - use grep extensively to find all occurrences

### Session: 2025-09-12 17:00
- **Feature creep without permission**: Never add unrequested features like GitHub labels that require external configuration - stick to the specified requirements
- **Silent failures from optional features**: When adding "nice to have" features, they can break core functionality if they fail (e.g., label creation failing prevented issue creation)
- **Assumption about user environments**: Don't assume users have customized GitHub repos with specific labels - tools should work with standard configurations

### Common Patterns (Consolidated)
- **File has not been read yet**: Always use Read tool before Edit operations on files not in context
- **String to replace not found**: When this occurs, Read the file first to get current content rather than relying on assumed state
- **Test output truncation**: Console output can be truncated mid‑suite; don’t infer success from visible “(pass)” lines alone. Re‑run with a focused pattern (e.g., `bun test -t "<pattern>"`) or increase output, and verify summarized pass/fail counts.
- **Interactive git commands**: Commands like `git rebase -i` require terminal interaction and fail in automated contexts - use non-interactive alternatives
- **Hook path issues**: When hooks aren't firing, verify the hook path in settings.json matches the actual file location
- **MultiEdit replace_all**: When getting "Found X matches but replace_all is false", either set replace_all:true or provide more unique context
- **TypeScript type errors**: 'any' type errors require explicit type annotations or type assertions to access properties
- **Git commit messages with newlines**: Use heredoc syntax or single-line messages to avoid quote escaping issues
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
