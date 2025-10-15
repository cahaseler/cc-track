---
shortname: view-logs
description: View and search centralized logs
usage: /view-logs [what you want to see]
allowed-tools: Read, Grep, Bash
---

# View Logs Command

Help the user view and search the centralized logs based on their request.

## Log File Format
- Logs are stored in `.claude/logs/` as JSONL files (one JSON object per line)
- Named by date: `2025-09-10.jsonl`
- Each line contains: `{"timestamp":"...","level":"...","source":"...","message":"...","context":{...}}`

## How to Handle User Requests

1. **Understand what they want**: Recent errors? Logs from a specific hook? Search for a pattern?

2. **Find the right files**:
   ```bash
   ls -la .claude/logs/
   ```

3. **Use appropriate tools**:
   - For simple tail/recent: `tail -n 20 .claude/logs/2025-09-10.jsonl`
   - For filtering by field: `grep '"source":"capture_plan"' .claude/logs/*.jsonl`
   - For level filtering: `grep '"level":"ERROR"' .claude/logs/*.jsonl`
   - For message search: `grep -i "plan was not approved" .claude/logs/*.jsonl`
   - For pretty printing: `jq '.' .claude/logs/2025-09-10.jsonl`

4. **Format nicely**: Extract key fields and present them clearly. Consider using jq if available:
   ```bash
   cat .claude/logs/2025-09-10.jsonl | jq -r '[.timestamp, .level, .source, .message] | @tsv'
   ```

## Examples
- "show me recent errors" → grep for ERROR level in today's log
- "what happened with capture_plan" → grep for that source
- "last 50 logs" → tail the most recent log file
- "search for approval" → grep across all logs for that pattern

The user's request is in: $ARGUMENTS