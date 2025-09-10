#!/bin/bash
# cc-track status line - displays essential info without clutter

input=$(cat)

# Get model name from input
MODEL=$(echo "$input" | jq -r '.model.display_name' 2>/dev/null || echo "Unknown")
MODEL="🚅 $MODEL"

# Get today's actual cost from ccusage daily JSON (more accurate than statusline)
TODAY=$(date +%Y-%m-%d)
TODAY_COST=$(echo "$input" | bunx ccusage daily --json 2>/dev/null | jq -r --arg date "$TODAY" '.daily[] | select(.date == $date) | .totalCost // 0' | xargs printf "%.2f")

# Get ccusage statusline for other info (hourly rate and tokens)
USAGE_RAW=$(echo "$input" | bunx ccusage statusline 2>/dev/null || echo "")

# Extract hourly rate and tokens from statusline (these are accurate)
HOURLY_RATE_RAW=$(echo "$USAGE_RAW" | grep -oP '\$[\d.]+/hr' || echo "")
if [ -n "$HOURLY_RATE_RAW" ]; then
    RATE_NUM=$(echo "$HOURLY_RATE_RAW" | grep -oP '[\d.]+')
    if (( $(echo "$RATE_NUM > 20" | bc -l) )); then
        HOURLY_RATE="🔥 $HOURLY_RATE_RAW"
    else
        HOURLY_RATE="$HOURLY_RATE_RAW"
    fi
fi
TOKENS_INFO=$(echo "$USAGE_RAW" | grep -oP '🧠 [\d,]+ \(\d+%\)' | sed 's/🧠 //' || echo "")

# Get current git branch
BRANCH=$(git branch --show-current 2>/dev/null || echo "")
if [ -n "$BRANCH" ]; then
    BRANCH=" | $BRANCH"
fi

# Get active task from CLAUDE.md
TASK=""
if [ -f "CLAUDE.md" ]; then
    TASK_FILE=$(grep "^@.claude/tasks/TASK_" CLAUDE.md | sed 's/@//' | head -1)
    if [ -n "$TASK_FILE" ] && [ -f "$TASK_FILE" ]; then
        # Read first line (title) from task file
        TASK_TITLE=$(head -1 "$TASK_FILE" | sed 's/^# //')
        if [ -n "$TASK_TITLE" ]; then
            TASK=" | $TASK_TITLE"
        fi
    elif grep -q "@.claude/no_active_task.md" CLAUDE.md; then
        TASK=" | 🛤️ Project is on track"
    fi
fi

# Build the statusline dynamically, only including fields with data
OUTPUT="$MODEL"

# Add cost if available with emoji based on amount
if [ "$TODAY_COST" != "0.00" ] && [ -n "$TODAY_COST" ]; then
    COST_NUM=$(echo "$TODAY_COST" | bc)
    if (( $(echo "$COST_NUM >= 300" | bc -l) )); then
        OUTPUT="$OUTPUT | 🤑 \$$TODAY_COST today"
    elif (( $(echo "$COST_NUM >= 200" | bc -l) )); then
        OUTPUT="$OUTPUT | 💰 \$$TODAY_COST today"
    elif (( $(echo "$COST_NUM >= 100" | bc -l) )); then
        OUTPUT="$OUTPUT | 💸 \$$TODAY_COST today"
    elif (( $(echo "$COST_NUM >= 50" | bc -l) )); then
        OUTPUT="$OUTPUT | 💵 \$$TODAY_COST today"
    else
        OUTPUT="$OUTPUT | 🪙 \$$TODAY_COST today"
    fi
fi

# Add hourly rate if available
if [ -n "$HOURLY_RATE" ]; then
    OUTPUT="$OUTPUT | $HOURLY_RATE"
fi

# Add tokens if available
if [ -n "$TOKENS_INFO" ]; then
    OUTPUT="$OUTPUT | $TOKENS_INFO"
fi

# Add branch if available
if [ -n "$BRANCH" ]; then
    OUTPUT="$OUTPUT$BRANCH"
fi

# Add task if available
if [ -n "$TASK" ]; then
    OUTPUT="$OUTPUT$TASK"
fi

echo "$OUTPUT"