# Centralized Logging System

**Purpose:** Create a centralized, structured logging system for all cc-pars components to improve debugging and monitoring.

**Status:** in_progress
**Started:** 2025-09-10 09:40
**Task ID:** 011

## Requirements
- [ ] Create central logger module with level-based logging
- [ ] Implement automatic daily log rotation
- [ ] Add JSON structured output format
- [ ] Configure via cc-pars.config.json
- [ ] Integrate with all hooks (capture_plan, stop_review, etc.)
- [ ] Create log viewer command for easy access
- [ ] Clean up old ad-hoc logging code
- [ ] Add retention policy (7 days default)

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

## Current Focus
Creating the core logger module and integrating with capture_plan to debug the approval issue

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