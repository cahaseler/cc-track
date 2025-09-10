# ccusage Integration for cc-track

## What ccusage Provides

### statusline Command Output
```bash
🤖 Sonnet | 💰 $0.05 session / $65.04 today / $16.68 block (1h 48m left) | 🔥 $5.30/hr | 🧠 N/A
```

Components:
- Model name
- Session cost
- Daily total cost
- **Current billing block (5-hour windows, API limits reset)**
- **Time remaining in block (crucial for rate limits!)**
- Burn rate per hour
- Context usage percentage (when transcript available)

### Key Features for cc-track
1. **No parsing needed** - ccusage handles transcript parsing
2. **Cached output** - 1-second refresh by default
3. **Context thresholds** - Green <50%, Yellow <80%, Red >80%
4. **Cost tracking** - Session, daily, hourly burn rate
5. **Visual indicators** - Emojis for status

## Integration Strategy

### Status Line Script
```bash
#!/bin/bash
# .claude/statusline.sh

input=$(cat)

# Get ccusage info (already formatted)
USAGE_INFO=$(echo "$input" | bunx ccusage statusline 2>/dev/null)

# Get current task
TASK=""
if [ -f ".claude/current_task.md" ]; then
    TASK=$(head -n1 .claude/current_task.md | sed 's/# //')
    TASK=" | 📋 $TASK"
fi

# Get planning mode status
PLAN=""
if [ -f ".claude/planning_active" ]; then
    PLAN=" | 🎯 Planning"
fi

# Combine everything
echo "${USAGE_INFO}${TASK}${PLAN}"
```

### Result
```bash
🤖 Sonnet | 💰 $0.05 session / $65.04 today | 🧠 45% | 📋 implement-auth | 🎯 Planning
```

## ccusage Commands for Hooks

### In PreCompact Hook
```bash
# Get current session info before compaction
ccusage session --json | jq '.sessions[0]' > .claude/pre_compact_session.json
```

### In SessionStart Hook
```bash
# Check if approaching token limits
TOKENS=$(ccusage session --json | jq '.sessions[0].totalTokens')
if [ "$TOKENS" -gt 140000 ]; then
    echo "⚠️ Approaching 160k token limit - consider manual compact"
fi
```

### For Daily Reports
```bash
# Generate daily summary
ccusage daily --breakdown > .claude/daily_usage.txt
```

## Configuration Options

### ccusage statusline flags
- `--context-low-threshold 50` - Green below 50%
- `--context-medium-threshold 80` - Yellow 50-80%
- `--visual-burn-rate emoji-text` - Show burn rate
- `--cost-source both` - Show both CC and calculated costs
- `--refresh-interval 1` - Cache for 1 second

### Environment Variables
```bash
export CCUSAGE_OFFLINE=true  # Use cached pricing
export FORCE_COLOR=1          # Enable colors
```

## Benefits for cc-track

1. **Accurate token counting** - No need to parse transcripts
2. **Real-time monitoring** - See context usage live
3. **Cost awareness** - Track spending per session/day
4. **Warning system** - Visual indicators for limits
5. **Performance** - Cached output, minimal overhead
6. **API limit awareness** - 5-hour blocks show when rate limits reset
7. **Strategic timing** - Plan intensive work for new block periods

## Example Integration

### Complete Status Line
```bash
#!/bin/bash
input=$(cat)

# Base ccusage info
BASE=$(echo "$input" | bunx ccusage statusline --visual-burn-rate emoji)

# Extract context percentage for logic
CONTEXT=$(echo "$BASE" | grep -oP '🧠 \K\d+' || echo "0")

# Extract time remaining in block
TIME_LEFT=$(echo "$BASE" | grep -oP '\(\K[^)]+(?= left\))' || echo "")

# Add warnings if needed
WARNING=""
if [ "$CONTEXT" -gt 80 ]; then
    WARNING=" ⚠️ COMPACT SOON"
fi

# Check if block is almost over (less than 30 min)
if [[ "$TIME_LEFT" =~ ^([0-9]+)m$ ]] && [ "${BASH_REMATCH[1]}" -lt 30 ]; then
    WARNING="$WARNING ⏰ BLOCK RESET SOON"
fi

# Task info
TASK=""
if [ -f ".claude/current_task.md" ]; then
    TASK=" | 📋 $(head -n1 .claude/current_task.md | sed 's/# //')"
fi

echo "${BASE}${TASK}${WARNING}"
```

This gives us a complete picture without manual parsing!