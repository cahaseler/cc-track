# Learned Mistakes

**Purpose:** Document errors encountered and their correct resolutions to avoid repeating mistakes

**Instructions:**
- This file is automatically updated by the pre_compact hook
- Each entry shows an error pattern and the correct solution
- Review these before attempting similar operations

---

## Error Patterns

*(Entries will be added here by the pre_compact hook)*

### Common Patterns (Consolidated)
- **File has not been read yet**: Always use Read tool before Edit operations on files not in context
- **String to replace not found**: When this occurs, Read the file first to get current content rather than relying on assumed state
- **Interactive git commands**: Commands like `git rebase -i` require terminal interaction and fail in automated contexts - use non-interactive alternatives
- **Hook path issues**: When hooks aren't firing, verify the hook path in settings.json matches the actual file location
- **MultiEdit replace_all**: When getting "Found X matches but replace_all is false", either set replace_all:true or provide more unique context
- **TypeScript type errors**: 'any' type errors require explicit type annotations or type assertions to access properties
- **Git commit messages with newlines**: Use heredoc syntax or single-line messages to avoid quote escaping issues
- **Grep blocking by hooks**: When grep is consistently blocked, switch to alternative approaches like TodoWrite or different tools
- **JSONL parsing**: When tail/grep on JSONL files return truncated output, use more specific filters or line limits to avoid mid-entry cuts
- **Bash complex syntax**: Commands like `$(date +%Y-%m-%d)` may fail with "syntax error near unexpected token" - use simpler commands or store intermediate results

### Claude CLI Specific
- Claude CLI ignores the --output-format json flag - must explicitly instruct in the prompt with "ONLY JSON" repeated multiple times and examples
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
