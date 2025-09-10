#!/bin/bash
# cc-pars status line - displays context usage, task info, and warnings

input=$(cat)

# Get ccusage info (handles token counting and costs)
USAGE=$(echo "$input" | bunx ccusage statusline --visual-burn-rate emoji 2>/dev/null || echo "")

# Extract metrics for logic
CONTEXT=$(echo "$USAGE" | grep -oP '🧠 \K\d+' || echo "0")
BLOCK_TIME=$(echo "$USAGE" | grep -oP '\(\K[^)]+(?= left\))' || echo "")

# Task status from active_task.md
TASK=""
if [ -f ".claude/active_task.md" ]; then
    # Extract task name from first heading
    TASK_NAME=$(grep "^## Current Task" -A 2 .claude/active_task.md | grep -v "^#" | grep -v "^$" | head -1 || echo "")
    if [ -n "$TASK_NAME" ]; then
        # Extract status if it exists
        STATUS=$(grep "^- \*\*Status:\*\*" .claude/active_task.md | sed 's/.*Status:\*\* //' || echo "")
        if [ -n "$STATUS" ]; then
            TASK=" | 📋 ${TASK_NAME} (${STATUS})"
        else
            TASK=" | 📋 ${TASK_NAME}"
        fi
    fi
fi

# Build warnings
WARNINGS=""

# Context warning
if [ "$CONTEXT" -gt 80 ]; then
    WARNINGS="$WARNINGS ⚠️ COMPACT SOON"
elif [ "$CONTEXT" -gt 60 ]; then
    WARNINGS="$WARNINGS ⚡ Context: ${CONTEXT}%"
fi

# Block reset warning
if [[ "$BLOCK_TIME" =~ ^([0-9]+)m$ ]]; then
    MINUTES="${BASH_REMATCH[1]}"
    if [ "$MINUTES" -lt 30 ]; then
        WARNINGS="$WARNINGS ⏰ RESET IN ${MINUTES}m"
    fi
elif [[ "$BLOCK_TIME" =~ ^([0-9]+)h[[:space:]]([0-9]+)m$ ]]; then
    HOURS="${BASH_REMATCH[1]}"
    MINUTES="${BASH_REMATCH[2]}"
    if [ "$HOURS" -eq 0 ] && [ "$MINUTES" -lt 30 ]; then
        WARNINGS="$WARNINGS ⏰ RESET IN ${MINUTES}m"
    fi
fi

# Check for planning mode indicator
PLANNING=""
if [ -f ".claude/planning_active" ]; then
    PLANNING=" | 🎯 PLANNING"
fi

# Combine everything
echo "${USAGE}${TASK}${PLANNING}${WARNINGS}"