# Learned Mistakes

**Purpose:** Document errors encountered and their correct resolutions to avoid repeating mistakes

**Instructions:**
- This file is automatically updated by the pre_compact hook
- Each entry shows an error pattern and the correct solution
- Review these before attempting similar operations

---

## Error Patterns

*(Entries will be added here by the pre_compact hook)*
### Session: 2025-09-10 11:29
- When grep operations are consistently blocked by user hooks, avoid further grep attempts and switch to alternative approaches like updating todo lists or using different tools
- When multiple Edit operations fail with "File has not been read yet" errors, the issue persists across different files in the same session - this indicates a context problem rather than a file-specific issue
- After Edit operations are rejected with "user doesn't want to proceed", the underlying issue is typically a hook blocking the action rather than the edit content itself
- When debugging hooks that aren't firing, check the hook's file path in settings.json - mismatched paths between actual hook location and configuration are a common cause
- Emergency debug logging to /tmp files can fail silently if the hook never executes - verify hook execution first before relying on debug output
- When tail/grep commands on log files return truncated JSON, the output is being cut off mid-entry - use more specific time ranges or line limits to get complete entries
- File copy operations may be blocked by hooks even when the destination directory exists - this indicates a policy restriction rather than a filesystem issue

### Session: 2025-09-10 08:55
- When attempting git interactive operations (git rebase -i), these require terminal interaction and will fail in automated contexts - use non-interactive alternatives
- When Edit tool fails repeatedly on the same file, verify the file has been read into context first before attempting further edits
- When bash commands are blocked by user hooks, the operation itself may be restricted - switch to using allowed tools or modify the approach entirely
- When providing multi-line commit messages to git or other commands, watch for quote escaping issues - consider using simpler single-line messages or heredoc syntax
- When a tool operation is rejected with "user doesn't want to proceed", this indicates a hook is blocking the action - read the relevant command/configuration files to understand the intended workflow
- After multiple failed Edit attempts on a file, the consistent fallback pattern of reading a different file (add-to-backlog.md) suggests checking for command documentation or alternative approaches
- When slash commands fail with missing arguments, the error handling logic in the command file itself may need adjustment rather than trying to edit it repeatedly

### Session: 2025-09-09 19:21
- When encountering "File has not been read yet" errors during Edit operations, always use the Read tool first to load the file into context before attempting edits
- After updating Claude CLI with `claude update`, verify the update succeeded with `claude --version` before proceeding with dependent operations
- When analyzing JSONL transcript files, use jq with proper type checking: `select(.toolUseResult and (.toolUseResult | type == "object"))` to avoid parsing errors on mixed data types
- For extracting error messages from tool results, check if toolUseResult is a string type first with `(.toolUseResult | type == "string")` before attempting string operations
- When grep operations are blocked by user hooks, consider that the pattern or command may trigger security filters - simplify the search or use different filtering approaches
- File counting operations like `grep -c` are more reliable than complex jq parsing when determining the number of matching entries in JSONL files
- When working with Claude CLI enrichment features, always implement proper error handling and fallback mechanisms since CLI operations can fail silently
- When executing external commands from within a hook, always set cwd to a neutral directory like '/tmp' to avoid triggering recursive hooks in the project directory
- Claude CLI ignores the --output-format json flag - to get JSON responses, must explicitly instruct in the prompt with "ONLY JSON" repeated multiple times and examples
- When parsing Claude CLI responses, expect wrapper format {"type":"result","result":"actual content"} and extract the inner content
- Set generous timeouts (2+ minutes) for Claude CLI calls as complex prompts take time to process
