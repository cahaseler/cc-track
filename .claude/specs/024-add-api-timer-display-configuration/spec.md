# Feature Specification: Add API Timer Display Configuration

**Feature ID**: `024`
**Created**: 2025-10-14
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

Add a new configuration option to control when the API window timer is displayed in the statusline, showing remaining time in the current 5-hour window for API limits.

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

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use `/clarify` to refine this specification.
