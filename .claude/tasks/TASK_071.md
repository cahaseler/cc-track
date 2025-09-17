# Add Hook Status Display to Statusline

**Purpose:** Display recent stop-review hook messages in the statusline as a workaround for Claude Code hiding hook outputs.

**Status:** in_progress
**Started:** 2025-09-17 10:29
**Task ID:** 071

## Requirements
- [ ] Modify stop-review hook to write status to `.claude/hook-status.json` with timestamp and message
- [ ] Update statusline script to read hook status and display recent messages (< 60 seconds old)
- [ ] Add third line to statusline when recent hook message exists
- [ ] Format hook status line with `🛤️ [message]` to match existing hook emoji
- [ ] Only write meaningful statuses (exclude "No changes to commit")
- [ ] Test with different stop-review statuses and verify timing

## Success Criteria
- Hook status appears in statusline within 1-2 message exchanges after stop-review
- Messages disappear after 60 seconds
- Statusline structure becomes 3 lines when hook message present, 2 lines otherwise
- Only meaningful messages are displayed (filtered out "No changes to commit")

## Technical Approach

### 1. Stop-Review Hook Modification (src/hooks/stop-review.ts)
**Location:** Line 827-832 in `generateStopOutput()` function
**Pattern:** Use existing `this.deps.fileOps || { writeFileSync }` pattern (line 550)
**Implementation:**
- Add hook status writing after line 827 (after review completion logging)
- Write JSON to `.claude/hook-status.json` with format:
  ```json
  {
    "timestamp": "2025-09-17T10:30:00.000Z", 
    "message": "Project is on track", 
    "source": "stop_review"
  }
  ```
- Filter out "No changes to commit" messages
- Use `join(projectRoot, '.claude', 'hook-status.json')` for file path

### 2. Statusline Enhancement (src/commands/statusline.ts)
**Location:** Line 193 in `generateStatusLine()` function
**Pattern:** Follow existing JSON reading pattern like `getActiveTask()` (lines 102-125)
**Implementation:**
- Add new function `getRecentHookStatus()` after `getActiveTask()` 
- Read `.claude/hook-status.json` using `deps.readFileSync` and `deps.existsSync`
- Check if timestamp is within 60 seconds of current time
- Return hook message if recent, empty string if expired/missing
- Add hook status as optional third line in `generateStatusLine()`

### 3. Statusline Structure Update
**Current Structure (lines 193-194):**
```typescript
return `${firstLine}\n${secondLine}`;
```

**New Structure:**
```typescript
const hookStatus = getRecentHookStatus(deps);
const thirdLine = hookStatus ? `🛤️ ${hookStatus}` : '';
return thirdLine ? `${thirdLine}\n${firstLine}\n${secondLine}` : `${firstLine}\n${secondLine}`;
```

## Implementation Details

### Hook Status Interface
Based on existing patterns, create interface:
```typescript
interface HookStatus {
  timestamp: string;
  message: string;
  source: string;
}
```

### File Path Construction
Use existing pattern from config.ts line 148:
```typescript
const hookStatusPath = join('.claude', 'hook-status.json');
```

### JSON Writing Pattern
Follow stop-review.ts line 550 pattern:
```typescript
const fs = this.deps.fileOps || { writeFileSync };
fs.writeFileSync(hookStatusPath, JSON.stringify(status));
```

### JSON Reading Pattern  
Follow statusline.ts line 103-124 pattern:
```typescript
if (!deps.existsSync(hookStatusPath)) return '';
const content = deps.readFileSync(hookStatusPath, 'utf-8');
const status = JSON.parse(content);
```

### Time Comparison
```typescript
const now = new Date();
const statusTime = new Date(status.timestamp);
const ageInSeconds = (now.getTime() - statusTime.getTime()) / 1000;
return ageInSeconds < 60 ? status.message : '';
```

## Recent Progress
- Discovered that Claude Code's recent update now hides hook outputs with "condensed output" feature
- Analyzed current hook implementation patterns to understand how our stop-review and edit-validation hooks work
- Confirmed stop-review hook correctly uses `systemMessage` for user-facing content (should still be visible)
- Identified that edit-validation hook incorrectly uses `reason` field instead of `additionalContext` for TypeScript/lint feedback
- Verified through logs investigation that edit-validation hook may not actually be blocking as expected

## Current Focus
Task temporarily paused while investigating Claude Code's hook output visibility changes:
1. Understanding what outputs are still visible to users after the "condensed output" update
2. Testing different JSON output methods to determine if `systemMessage` workaround is viable
3. Determining if the task is still necessary given the broader hook visibility issue

## Research Findings

### Similar Implementations Found
- **File writing pattern:** stop-review.ts:550 uses `this.deps.fileOps || { writeFileSync }`
- **JSON reading:** statusline.ts:102-125 in `getActiveTask()` function
- **Dependency injection:** statusline.ts:17-23 defines deps interface
- **Time-based filtering:** Not found in codebase - will implement new

### Key Files Identified
- **src/hooks/stop-review.ts** - Lines 36-41 (ReviewResult interface), Line 827 (completion logging)
- **src/commands/statusline.ts** - Lines 17-23 (deps interface), Lines 102-125 (JSON reading), Line 193 (output generation)
- **src/types.ts** - Existing interface patterns for reference

### Conventions to Follow
- **File operations:** Use dependency injection pattern: `this.deps.fileOps || { writeFileSync }`
- **Error handling:** Graceful fallbacks with try/catch (see statusline.ts:50-52)
- **Path construction:** Use `join()` from node:path for file paths
- **Testing:** Follow existing mock patterns in statusline.test.ts

## Next Steps
1. Modify `generateStopOutput()` in src/hooks/stop-review.ts to write hook status
2. Add `getRecentHookStatus()` function to src/commands/statusline.ts
3. Update `generateStatusLine()` to include hook status as optional third line
4. Add hook status interface to StatusLineDeps type
5. Update tests to cover new functionality

## Open Questions & Blockers
None - all patterns and implementation details identified through codebase analysis.

<!-- github_issue: 86 -->
<!-- github_url: https://github.com/cahaseler/cc-track/issues/86 -->
<!-- issue_branch: 86-add-hook-status-display-to-statusline -->