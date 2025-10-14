# Add API Timer Display Configuration

**Purpose:** Add a new configuration option to control when the API window timer is displayed in the statusline, showing remaining time in the current 5-hour window for API limits.

**Status:** completed
**Started:** 2025-09-11 20:28
**Task ID:** 024

## Requirements
- [ ] Update track.config.json with new `api_timer` feature
- [ ] Add `display` option with values: "hide", "show", "sonnet-only"
- [ ] Set default to "sonnet-only"
- [ ] Update .claude/lib/config.ts to include api_timer in DEFAULT_CONFIG
- [ ] Ensure api_timer is recognized as valid feature in config validation
- [ ] Update .claude/statusline.sh to read api_timer display setting
- [ ] Extract API window time from ccusage output (format: "X h Y m left")
- [ ] Implement "show" mode: Add timer as separate block between model and daily cost
- [ ] Implement "sonnet-only" mode: Add "(reset in X h Y m)" next to model name if model contains "Sonnet"
- [ ] Implement "hide" mode: Don't display timer at all
- [ ] Update template statusline.sh with same changes

## Success Criteria
- Configuration option properly controls timer display behavior
- "Show" mode displays: `🚅 Claude 3.5 Sonnet | ⏰ 2h 15m left | 💰 $273.44 today`
- "Sonnet-only" mode displays: `🚅 Claude 3.5 Sonnet (reset in 2h 15m) | 💰 $273.44 today`
- "Hide" mode shows no timer
- Timer helps users track when they can switch back to Opus after hitting usage caps
- All changes work consistently across both active and template statusline files

## Technical Approach
1. Add new configuration structure to both config files
2. Parse ccusage output to extract window reset time
3. Implement conditional display logic based on configuration setting
4. Apply changes to both active and template statusline scripts

## Current Focus

Task completed on 2025-09-11

## Open Questions & Blockers
- Need to verify exact format of ccusage output for API window time extraction
- Confirm parsing logic works reliably with different time formats

## Next Steps
1. Update track.config.json with api_timer configuration
2. Update .claude/lib/config.ts with corresponding changes
3. Test configuration validation works properly
4. Implement statusline parsing and display logic

<!-- branch: feature/api-timer-config-024 -->