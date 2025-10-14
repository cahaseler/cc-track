# Centralized Logging System

**Purpose:** Create a centralized, structured logging system for all cc-pars components to improve debugging and monitoring.

**Status:** completed
**Started:** 2025-09-10 09:40
**Task ID:** 011

## Requirements
- [x] Create central logger module with level-based logging
- [x] Implement automatic daily log rotation
- [x] Add JSON structured output format
- [x] Configure via cc-pars.config.json
- [x] Integrate with all hooks (capture_plan, stop_review, etc.)
- [x] Create log viewer command for easy access
- [x] Clean up old ad-hoc logging code
- [x] Add retention policy (7 days default)

## Success Criteria
- All hooks and scripts use centralized logging
- Logs are structured and searchable
- Can debug the capture_plan approval issue
- Old logs are automatically cleaned up
- No performance impact on hook execution
- Zero external dependencies

## Technical Approach
1. **Built-in logger**: No external dependencies, simple but effective
2. **JSON Lines format**: One JSON object per line for easy parsing
3. **File-based**: Logs to `.claude/logs/` directory
4. **Configurable levels**: ERROR, WARN, INFO, DEBUG, TRACE
5. **Context injection**: Automatic source, timestamp, session ID

## Recent Progress
- Successfully implemented core logger module (`.claude/lib/logger.ts`) with all required features
- Integrated centralized logging with capture_plan, stop_review, pre_compact, and post_compact hooks
- Created log viewer command (`/view-logs`) for easy access and searching
- Added logging configuration to cc-pars.config.json with DEBUG level enabled
- Logger is actively working as evidenced by structured JSON logs in `.claude/logs/2025-09-10.jsonl`
- Successfully debugging capture_plan approval issue through detailed logging

## Current Focus
Task completed on 2025-09-10

## Open Questions & Blockers
- Should we add log shipping in the future?
- How to handle very large log files?
- Should hooks have individual log level overrides?

## Next Steps
1. Create logger.ts module
2. Add config options
3. Update capture_plan.ts first (to debug issue)
4. Roll out to other hooks
5. Create viewer command