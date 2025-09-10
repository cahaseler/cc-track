# cc-pars Architecture Design

## Overview
cc-pars (Claude Code - Plan, Analyze, Refine, Succeed) is a comprehensive system for optimizing Claude Code workflows through intelligent context management, task tracking, and quality assurance.

## Core Components

### 1. Dynamic CLAUDE.md Structure
```markdown
# Project: [Project Name]

## Active Task
@.claude/active_task.md

## Product Vision
@.claude/product_context.md

## System Patterns
@.claude/system_patterns.md

## Decision Log
@.claude/decision_log.md

## Code Index
@.claude/code_index.md

## Instructions
- If user requests a complex task without a plan, suggest: "This looks like it needs planning. Press Shift+Tab twice to enter plan mode."
- Always check active task for current requirements
- Validate work against documented patterns and decisions

[Original user instructions continue...]
```

### 2. File Structure
```
.claude/
├── settings.json           # Hook configurations
├── statusline.sh          # Custom status line
├── active_task.md         # Current task & state (from roopars)
├── product_context.md     # Project vision & goals (from roopars)
├── system_patterns.md     # Technical patterns & standards (from roopars)
├── decision_log.md        # Immutable decision record (from roopars)
├── progress_log.md        # Task execution tracking (from roopars)
├── code_index.md          # Codebase structure & imports
├── edit_log.jsonl         # Tracking edits for batched review
├── plans/                 # Captured plans
│   └── YYYY-MM-DD-*.md
├── hooks/
│   ├── capture_plan.ts    # PreToolUse for ExitPlanMode
│   ├── track_edit.ts      # PostToolUse for batched validation
│   ├── pre_compact.ts     # PreCompact context preservation
│   ├── check_completion.ts # Stop hook for validation
│   └── session_start.ts   # SessionStart initialization
└── utils/
    ├── context_extractor.ts
    ├── plan_enricher.ts
    ├── edit_analyzer.ts
    └── completion_checker.ts
```

## Hook System Design

### 1. Plan Capture Hook (PreToolUse)
```typescript
// Intercepts ExitPlanMode tool use
{
  "matcher": "ExitPlanMode",
  "hooks": [{
    "type": "command",
    "command": "bun run .claude/hooks/capture_plan.ts"
  }]
}
```

**Workflow:**
1. Detect ExitPlanMode tool call
2. Extract plan from tool_input
3. Save to `.claude/plans/YYYY-MM-DD-HH-MM.md`
4. Create/update `.claude/active_task.md`
5. Enrich with project context
6. Return enriched plan to Claude

### 2. Context Preservation Hook (PreCompact)
```typescript
// Runs before compaction
{
  "hooks": {
    "PreCompact": [{
      "hooks": [{
        "type": "command",
        "command": "bun run .claude/hooks/pre_compact.ts"
      }]
    }]
  }
}
```

**Preservation Categories:**
1. **Environment & Config**
   - Database type, connection strings
   - API endpoints, auth methods
   - Environment variables
   - Package.json dependencies

2. **Codebase Structure**
   - Directory tree
   - Key files and their purposes
   - Import relationships
   - Function/class registry

3. **Current State**
   - Git branch and status
   - Recent commands and outputs
   - Test results
   - Error messages

4. **Patterns & Decisions**
   - Coding conventions used
   - Architecture patterns
   - Tool preferences (MCP vs CLI)
   - User preferences from messages

### 3. Quality Assurance Hooks

#### A. Edit Validator (PostToolUse)
```typescript
// After Edit/Write operations - batched review
{
  "matcher": "Edit|Write|MultiEdit",
  "hooks": [{
    "type": "command",
    "command": "bun run .claude/hooks/track_edit.ts"
  }]
}
```

**Batched Validation Process:**
1. Log each edit to `.claude/edit_log.jsonl`
2. After 3rd edit, analyze all recent changes
3. If diverging from spec:
   - "Recent edits seem to diverge from task requirements:"
   - List specific divergences
   - Suggest corrections
4. Reset counter after review

#### B. Completion Checker (Stop)
```typescript
// When Claude tries to stop
{
  "Stop": [{
    "hooks": [{
      "type": "command",
      "command": "bun run .claude/hooks/check_completion.ts"
    }]
  }]
}
```

**Completion Criteria:**
1. Parse Claude's last message for completion claims
2. Check against task requirements
3. Run test suite if applicable
4. If incomplete, block with exit code 2:
   ```
   BLOCKED: Task not complete
   - Tests failing: 3
   - Missing: Error handling
   - TODO: Documentation
   Continue working? (suggest next steps)
   ```

### 4. Session Start Hook
```typescript
// Initialize session with context
{
  "SessionStart": [{
    "hooks": [{
      "type": "command",
      "command": "bun run .claude/hooks/session_start.ts"
    }]
  }]
}
```

**Session Initialization:**
1. Check for incomplete tasks
2. Load recent decisions
3. Verify context files exist
4. Log session start

## Status Line Design
```bash
#!/bin/bash
# .claude/statusline.sh

input=$(cat)

# Get ccusage info
USAGE=$(echo "$input" | bunx ccusage statusline --visual-burn-rate emoji)

# Extract key metrics
CONTEXT=$(echo "$USAGE" | grep -oP '🧠 \K\d+' || echo "0")
BLOCK_TIME=$(echo "$USAGE" | grep -oP '\(\K[^)]+(?= left\))' || echo "")

# Task status
TASK=""
if [ -f ".claude/active_task.md" ]; then
    TASK_NAME=$(grep "^# " .claude/active_task.md | head -1 | sed 's/# //')
    TASK_STATUS=$(grep "^Status: " .claude/active_task.md | sed 's/Status: //')
    TASK=" | 📋 $TASK_NAME ($TASK_STATUS)"
fi

# Warnings
WARNINGS=""
[ "$CONTEXT" -gt 80 ] && WARNINGS="$WARNINGS ⚠️ COMPACT"
[[ "$BLOCK_TIME" =~ ^([0-9]+)m$ ]] && [ "${BASH_REMATCH[1]}" -lt 30 ] && WARNINGS="$WARNINGS ⏰ RESET"

echo "${USAGE}${TASK}${WARNINGS}"
```

## TDD-Inspired Workflow

### 1. Task Lifecycle
```markdown
# .claude/active_task.md
# Implement user authentication

## Status: planning
## Branch: feature/auth
## Started: 2025-01-09

## Requirements
- [ ] JWT token generation
- [ ] Login endpoint
- [ ] Logout endpoint
- [ ] Token refresh
- [ ] Tests passing

## Context
Database: PostgreSQL
Framework: Next.js 14
Auth library: jose
```

### 2. Progressive Validation
Instead of strict TDD, use progressive validation:

1. **Planning Phase**
   - Require plan before implementation
   - Enrich plan with test requirements
   - Define success criteria

2. **Implementation Phase**
   - Validate each edit against plan
   - Run relevant tests after changes
   - Track coverage improvements

3. **Completion Phase**
   - Block premature completion
   - Require all tests passing
   - Verify requirements met
   - Suggest missing pieces

### 3. Automated Reviews
```bash
# Run after significant changes
claude -p "Review recent changes for task: $(cat .claude/active_task.md)" \
  --allowedTools "Read,Grep" \
  --output-format json | \
  bun run .claude/utils/process_review.ts
```

## Context Management Strategy

### 1. Three-Tier Context
1. **Persistent** (always in CLAUDE.md imports)
   - Project metadata
   - Core conventions
   - Active task

2. **Cached** (in enriched files, refreshed periodically)
   - Code index
   - Recent decisions
   - Common patterns

3. **Dynamic** (gathered as needed)
   - Current git status
   - Test results
   - Recent errors

### 2. Smart Compaction
Before compaction:
1. Extract all file paths touched
2. Extract all functions/classes mentioned
3. Extract all decisions made
4. Extract all errors and solutions
5. Update persistent/cached files
6. Let default compaction proceed

## Implementation Priority

### Phase 1: Core Infrastructure
1. CLAUDE.md with imports
2. Basic hooks (plan capture, pre-compact)
3. Status line with ccusage
4. Active task tracking

### Phase 2: Quality Assurance
1. Completion checker
2. Edit validator
3. Task enrichment
4. Automated reviews

### Phase 3: Advanced Features
1. Smart context extraction
2. Pattern learning
3. Preference tracking
4. Multi-task management

## Success Metrics
- Context survival rate after compaction
- Task completion accuracy
- Reduced "forgot context" incidents
- Faster task resumption
- Lower token usage via better context

## Configuration Example
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "ExitPlanMode",
      "hooks": [{
        "type": "command",
        "command": "bun run .claude/hooks/capture_plan.ts"
      }]
    }],
    "PostToolUse": [{
      "matcher": "Edit|Write|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "bun run .claude/hooks/validate_edit.ts"
      }]
    }],
    "PreCompact": [{
      "hooks": [{
        "type": "command",
        "command": "bun run .claude/hooks/pre_compact.ts"
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "bun run .claude/hooks/check_completion.ts"
      }]
    }]
  },
  "statusLine": {
    "type": "command",
    "command": ".claude/statusline.sh"
  }
}
```