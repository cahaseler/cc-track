# Decision Log

**Purpose:** Immutable record of significant decisions made throughout the project lifecycle. Captures context, rationale, and implications of key choices.

**Instructions:**
- Log decisions with notable impact on project direction, architecture, or implementation
- Include *why* the decision was made and alternatives considered
- Do **NOT** modify existing entries - append chronologically
- Format: `[YYYY-MM-DD HH:MM] - [Summary of Decision]` followed by details

---

## Log Entries

[2025-09-09 19:30] - Pivot from General Context Extraction to Error Pattern Learning
- **Context:** Initial pre_compact hook using regex parsing extracted nothing useful from transcripts
- **Decision:** Focus exclusively on extracting error patterns and their resolutions
- **Rationale:** Error patterns provide concrete, actionable learning that directly improves future performance
- **Alternatives Considered:** 
  - General context summarization: Too vague, loses specifics
  - Full transcript preservation: Too large, hits token limits
  - Manual annotation: Requires user intervention
- **Implications:** Pre-compact hook now builds knowledge base of mistakes to avoid
- **Reversibility:** Easy - could add additional extraction modules later

[2025-09-09 19:45] - Use SessionStart Hook for Post-Compaction Updates
- **Context:** Need to update task documentation after compaction but have no access to summary
- **Decision:** Use SessionStart hook with "compact" matcher to inject instructions to Claude
- **Rationale:** Instructions become part of Claude's context after reset, ensuring documentation updates
- **Alternatives Considered:** 
  - Parse compaction summary: Not available in hook data
  - Store state externally: Complex state management required
  - Manual updates: Defeats automation purpose
- **Implications:** Claude automatically updates task files after each compaction
- **Reversibility:** Easy - hook can be disabled or modified

[2025-09-10 02:00] - Run External Commands from Neutral Directory
- **Context:** Stop hook calling Claude CLI from project directory caused infinite recursion
- **Decision:** All external command execution must use cwd: '/tmp' or other neutral directory
- **Rationale:** Commands run in project directory trigger that project's hooks, creating recursion
- **Alternatives Considered:** 
  - Disable hooks during CLI calls: No API for temporary disabling
  - Use environment variable flag: Would require modifying hook detection logic
  - Run in user home: Could trigger user-level hooks
- **Implications:** All hooks must specify cwd when executing external commands
- **Reversibility:** Easy - just change cwd parameter

### Note on Decision Criteria
Bug fixes, typo corrections, and fixing incorrect implementations are NOT decisions - they're corrections. Only log actual architectural or design choices where multiple valid approaches exist.

[2025-09-10 07:40] - Use Sonnet for Task Enrichment Instead of Haiku
- **Context:** Initial attempt to use Haiku for task enrichment to save costs resulted in broken task files
- **Decision:** Use Sonnet for task enrichment, keep Sonnet for code review, remove model param from other uses
- **Rationale:** Task enrichment requires complex structured output generation that Haiku cannot reliably produce
- **Alternatives Considered:** 
  - Haiku for all CLI calls: Too limited for complex tasks
  - Opus for everything: Too expensive for simple operations
  - Mixed approach (Haiku for simple, Sonnet for complex): Good balance but task enrichment proved too complex for Haiku
- **Implications:** Slightly higher cost for task creation but ensures reliable task structure
- **Reversibility:** Easy - just change the model parameter in capture_plan.ts

### Template Entry
```
[YYYY-MM-DD HH:MM] - [Decision Summary]
- **Context:** [What prompted this decision]
- **Decision:** [What was decided]
- **Rationale:** [Why this choice was made]
- **Alternatives Considered:** 
  - [Alternative 1]: [Why rejected]
  - [Alternative 2]: [Why rejected]
- **Implications:** [What this means for the project]
- **Reversibility:** [Easy/Hard/Impossible to change later]
```