---
description: Clean up and reduce bloat in context files
---

# Context Maintenance

## Purpose

Over time, context files (system_patterns.md, decision_log.md, progress_log.md, etc.) accumulate outdated, redundant, or irrelevant content. This bloat increases token usage, makes files harder to navigate, and dilutes truly important context.

This command provides structured guidance for periodically cleaning these files while preserving valuable information.

## When to Run

Run this command when you notice:
- Context files feeling bloated or hard to scan
- Update Log sections growing excessively long
- Duplicate information across multiple files
- Outdated references (old versions, superseded decisions)
- Token counts increasing without proportional value

## Safety Reminder

Git provides a complete safety net. If you accidentally delete something important, you can always recover it from git history. Be bold in removing bloat.

---

## General Cleanup Principles

### Explicit Rules for Common Cases

**ALWAYS remove:**
1. **Duplicate information** - If the same pattern/decision appears in multiple files, consolidate to one canonical location
2. **Outdated version references** - "TypeScript 4.x" when now on 5.x, "Node 16" when using 18+
3. **Superseded decisions** - Earlier decisions that were later overruled by subsequent ones
4. **Verbose Update Log entries** - Trim to major milestones only, remove play-by-play details
5. **Template entries** - Remove example entries like "Template Entry" or "## Template" sections
6. **Low-impact details** - Bug fixes documented as "decisions", minor implementation details

**ALWAYS consolidate:**
1. **Similar patterns** - Multiple testing patterns → one comprehensive entry
2. **Related decisions** - Multiple git workflow tweaks → single decision with evolution
3. **Redundant progress updates** - "Started task X" + "Completed task X" → just "Completed task X"

### Judgment Principles for Edge Cases

**Preserve:**
- Context that explains **"why"** over **"what"** - Rationale is more valuable than implementation details
- **Active patterns** still reflected in current codebase
- **Decision rationale** even if implementation changed - The reasoning remains valuable
- **Warnings** about what NOT to do or failed approaches
- **Major architectural decisions** that shaped the project

**Balance:**
- **Completeness vs. Focus** - Aim for comprehensive but not exhaustive
- **History vs. Relevance** - Keep historical context that informs present, remove outdated noise
- **Detail vs. Clarity** - Enough detail to understand, not so much it obscures

### Cross-File Consolidation

When the same information appears in multiple context files, consolidate to a single canonical location:

**Where to consolidate:**
- **`.cc-track/decision_log.md`** → For one-time choices with rationale (why we chose X over Y)
- **`.cc-track/system_patterns.md`** → For ongoing practices and conventions (how we always do X)
- **`.cc-track/progress_log.md`** → Never store details here - just task IDs and brief descriptions

**Common duplication patterns:**
1. **Architecture decisions repeated as patterns** - Keep detailed rationale in `.cc-track/decision_log.md`, brief reference in `.cc-track/system_patterns.md` if it's an active pattern
2. **Implementation details in both progress and decision logs** - Remove from `.cc-track/progress_log.md` (should just reference spec folder), keep decision rationale in `.cc-track/decision_log.md` only if it's architecturally significant
3. **Same example code in multiple pattern descriptions** - Consolidate to one canonical pattern, reference it from others

**After consolidation:**
1. Update any cross-references to point to the canonical location
2. Replace removed content with brief pointer: "See `.cc-track/decision_log.md` [YYYY-MM-DD] for rationale"
3. Check for broken references after removing/consolidating content

**When duplication is acceptable:**
- Brief mention in one file, full detail in another (e.g., "We use DI for testability" in patterns vs. full decision rationale in decision_log)
- Different perspectives on same topic (e.g., decision rationale vs. implementation pattern)

---

## File-Specific Guidance

### system_patterns.md

**Common Bloat:**
- Deprecated patterns no longer used in codebase
- Duplicate pattern descriptions (e.g., multiple DI examples)
- Overly detailed Update Log entries (e.g., minor additions)
- Excessive code examples when one would suffice

**Cleanup Rules:**
1. Remove patterns not reflected in current code
2. Consolidate similar patterns into single comprehensive entries
3. **Aggressively trim Update Log** - Keep only major pattern additions, remove minor tweaks
4. Replace multiple code examples with one canonical example
5. Remove implementation details that duplicate code comments

**Preserve:**
- Active patterns in current use
- Rationale for unusual/non-standard choices
- Warnings about anti-patterns
- Tool preferences and their reasoning

### decision_log.md

**Common Bloat:**
- Overly detailed "decision process" narratives (15-20 lines per decision)
- Decisions superseded by later ones without clear marking
- Low-impact decisions that don't affect architecture (bug fixes, typos)
- "Template Entry" examples at the end
- Note sections in the middle of entries

**Cleanup Rules:**
1. Mark or remove superseded decisions - Add "SUPERSEDED BY [entry YYYY-MM-DD]" or remove entirely if no longer relevant
2. **Aggressively trim verbose explanations** - 5-8 lines is usually sufficient, not 15-20
3. Remove "Template Entry" examples
4. Move "Note on Decision Criteria" to header if it's cluttering the log
5. Consolidate related decisions (e.g., multiple authentication tweaks)
6. Remove decisions that are really bug fixes or corrections

**Preserve:**
- Major architectural decisions
- Decision rationale (why chosen, alternatives rejected)
- Warnings about failed approaches
- Reversibility assessments
- Implications that are still relevant

### progress_log.md

**Common Bloat (MOST BLOATED FILE):**
- Exhaustive "Details" sections with file lists and multi-line descriptions
- Redundant "Key Achievement" sections that repeat Details
- "Files:" listings that enumerate every touched file
- Template entry examples
- Session-by-session play-by-play
- "Started" entries without corresponding completion

**Cleanup Rules:**
1. **Keep entries to 1-2 lines** - Progress log is an INDEX, not documentation
2. **Reference spec/task files for details** - "See .cc-track/specs/NNN-feature-name/ for details"
3. **Remove "Details:", "Files:", "Key Achievement:" subsections** - All bloat
4. **Remove incomplete "Started" entries** - Only keep Completed, Abandoned, Blocked statuses
5. Remove template entries
6. Consolidate multiple status updates for same task into single entry
7. **Format**: `[YYYY-MM-DD] - Completed: TASK_NNN - Brief description (see .cc-track/specs/NNN-name/)`

**Preserve:**
- Task ID and brief one-line description
- Reference to spec folder for details
- Blocked/Failed entries with brief reason
- Major pivot points (when they don't have associated tasks)

**Example of good entries:**
```
[2025-10-17] - Completed: TASK_103 - Context maintenance command (see .cc-track/specs/103-context-maintenance-command/)
[2025-10-15] - Completed: TASK_099 - Migrated to Claude Agent SDK (see .cc-track/specs/099-sdk-migration/)
```

### product_context.md

**Cleanup:**
- Remove outdated goals or features no longer pursued
- Update feature lists to reflect current state
- Trim Non-Goals section if it's listing obvious exclusions

**Preserve:**
- Current vision and purpose
- Core features and target audience
- Update log for major directional changes

### code_index.md

**Cleanup:**
- Remove entries for deleted files or moved files
- Update paths that have changed
- Remove duplicate descriptions

**Preserve:**
- Current file structure
- Key file purposes
- Useful navigation hints

### user_context.md

**Cleanup:**
- Remove outdated preferences that have changed
- Consolidate similar observations

**Preserve:**
- Recent communication learnings
- Working style preferences
- Technical preferences
- Important reminders about collaboration

### backlog.md

**Cleanup:**
- Remove completed items (check progress_log.md)
- Consolidate similar suggestions into one entry
- Remove ideas that are no longer relevant

**Preserve:**
- Future ideas still worth considering
- Timestamps (helps assess relevance)

---

## Recommended Workflow

Follow this sequence for systematic cleanup:

1. **Start with system_patterns.md** (usually most bloated)
   - Scan Update Log first - easiest wins
   - Then consolidate patterns
   - Remove deprecated entries

2. **Move to decision_log.md**
   - Check for template entries
   - Mark superseded decisions
   - Trim verbose entries aggressively

3. **Then progress_log.md** (often the most bloated)
   - Remove redundant Key Achievement sections
   - Consolidate file listings
   - Trim exhaustive details
   - Remove incomplete Started entries

4. **Finally, other context files**
   - product_context.md
   - code_index.md
   - user_context.md
   - backlog.md

5. **Review diffs before saving**
   - Check you haven't accidentally deleted important context
   - Verify consolidations make sense
   - Ensure preserved content is still readable

---

## Completion Checklist

After cleaning each file type, verify:

- [ ] All files reviewed (system_patterns, decision_log, progress_log, others)
- [ ] Duplicate information consolidated across files
- [ ] Outdated references removed (old versions, superseded decisions)
- [ ] **Update Log sections aggressively trimmed**
- [ ] Template entries removed
- [ ] Important context preserved (rationale, warnings, active patterns)
- [ ] Diffs reviewed for accidental deletions
- [ ] Files feel leaner and more focused
- [ ] Token counts reduced (qualitative improvement)

---

## Tips for Success

- **Be aggressive with Update Logs** - They're prime bloat sources
- **When in doubt, consolidate** - Prefer one clear entry over multiple similar ones
- **Preserve "why" over "what"** - Rationale ages better than implementation details
- **Trust git** - You can always recover if you delete too much
- **Focus on signal-to-noise** - Every line should add value
- **Review diffs** - Catch mistakes before committing
