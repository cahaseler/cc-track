# Learned Mistakes

**Purpose:** Document errors encountered and their correct resolutions to avoid repeating mistakes

**Instructions:**
- This file is automatically updated by the pre_compact hook
- Each entry shows an error pattern and the correct solution
- Review these before attempting similar operations

---

## Error Patterns

*(Entries will be added here by the pre_compact hook)*
### Session: 2025-09-10 15:47
- When bash commands with complex syntax like `$(date +%Y-%m-%d)` fail with "syntax error near unexpected token", the shell is likely escaping special characters incorrectly - use simpler commands or store intermediate results
- Multiple consecutive Edit failures on the same file followed by successful resolution indicates the file needed to be read first - always Read before Edit on files not in context
- When validation tests with intentional errors (like TypeScript type mismatches) are created but validation doesn't trigger, check if the validation hook is actually enabled in the configuration
- Git commit messages with newlines may need special handling - use single-line messages or proper quoting/escaping for multi-line commits
- When Biome check with --reporter=json flag produces output that jq can't parse, the output likely isn't valid JSON - check Biome's actual output format first
- Sequences of failed edits to config files that suddenly succeed suggest the file structure changed between attempts - always re-read configuration files after external modifications

### Session: 2025-09-10 14:39
- When encountering "File has not been read yet" errors from Edit tool, always use Read tool first before attempting any edits
- When tail/grep on JSONL files return truncated output, the JSON is being cut off mid-entry - use more specific filters or line limits
- Interactive git commands (git rebase -i) will always fail in automated contexts - use non-interactive alternatives
- When debugging hooks that aren't executing, verify the hook path in settings.json matches the actual file location
- Tool response structure varies by context - check for specific fields (like .plan) rather than generic success indicators
- When multiple Edit attempts fail with "String to replace not found", the file structure may have changed - use Read to get current content
- TypeScript type errors with 'object' type require explicit interface definitions or type assertions to access properties
- When autofix tools modify visibility modifiers (removing 'private'), this is usually correct behavior for fixing external access issues
- Biome config errors about unknown keys indicate version incompatibility - check documentation for supported options
- When grep searches are consistently blocked, switch to alternative approaches like todo updates rather than retrying

### Session: 2025-09-10 11:29
- When grep operations are consistently blocked by user hooks, avoid further grep attempts and switch to alternative approaches like updating todo lists or using different tools
- After Edit operations are rejected with "user doesn't want to proceed", the underlying issue is typically a hook blocking the action rather than the edit content itself
- When debugging hooks that aren't firing, check the hook's file path in settings.json - mismatched paths between actual hook location and configuration are a common cause
- Emergency debug logging to /tmp files can fail silently if the hook never executes - verify hook execution first before relying on debug output
- When tail/grep commands on log files return truncated JSON, the output is being cut off mid-entry - use more specific time ranges or line limits to get complete entries
- File copy operations may be blocked by hooks even when the destination directory exists - this indicates a policy restriction rather than a filesystem issue

### Session: 2025-09-10 08:55
- When attempting git interactive operations (git rebase -i), these require terminal interaction and will fail in automated contexts - use non-interactive alternatives
- When Edit tool fails repeatedly on the same file, verify the file has been read into context first before attempting further edits
- When providing multi-line commit messages to git or other commands, watch for quote escaping issues - consider using simpler single-line messages or heredoc syntax

### Session: 2025-09-09 19:21
- When analyzing JSONL transcript files, use jq with proper type checking: `select(.toolUseResult and (.toolUseResult | type == "object"))` to avoid parsing errors on mixed data types
- For extracting error messages from tool results, check if toolUseResult is a string type first with `(.toolUseResult | type == "string")` before attempting string operations
- File counting operations like `grep -c` are more reliable than complex jq parsing when determining the number of matching entries in JSONL files
- When working with Claude CLI enrichment features, always implement proper error handling and fallback mechanisms since CLI operations can fail silently
- When executing external commands from within a hook, always set cwd to a neutral directory like '/tmp' to avoid triggering recursive hooks in the project directory
- Claude CLI ignores the --output-format json flag - to get JSON responses, must explicitly instruct in the prompt with "ONLY JSON" repeated multiple times and examples
- When parsing Claude CLI responses, expect wrapper format {"type":"result","result":"actual content"} and extract the inner content
- Set generous timeouts (2+ minutes) for Claude CLI calls as complex prompts take time to process

### Manual Entry: 2025-09-10 14:30 (Task 017/018)
- When TypeScript reports a method doesn't exist on a class, check if the visibility modifier was changed before assuming the method was deleted
- Autofix tools generally make safe changes - removing 'private' from a method called externally is correct behavior
- Always read the full file context before claiming code was deleted - grep/search alone can be misleading
- If autofix tools appear to have made destructive changes, audit systematically rather than panicking
- Changing 'any' to 'unknown' requires type guards or type assertions to access properties
