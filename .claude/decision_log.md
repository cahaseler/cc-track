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
- **Decision:** Use Sonnet for task enrichment, keep Sonnet for code review, use Haiku for simple text generation
- **Rationale:** Task enrichment requires complex structured output generation that Haiku cannot reliably produce
- **Alternatives Considered:** 
  - Haiku for all CLI calls: Too limited for complex tasks
  - Opus for everything: Too expensive for simple operations
  - Mixed approach (Haiku for simple, Sonnet for complex): Adopted - Haiku works well for branch/commit names
- **Implications:** Slightly higher cost for task creation but ensures reliable task structure
- **Reversibility:** Easy - just change the model parameter in capture_plan.ts

[2025-09-10 08:00] - Keep Task Branches After Merge
- **Context:** User feedback during git branching feature implementation
- **Decision:** Keep task branches after merging rather than deleting them
- **Rationale:** Branches serve as backup and reference for completed work
- **Alternatives Considered:** 
  - Delete branches after merge: Cleaner but loses reference
  - Archive branches: More complex, unnecessary
- **Implications:** Task branches accumulate over time, user can manually clean up old ones
- **Reversibility:** Easy - can delete branches manually anytime

[2025-09-10 09:25] - Use Git Log Instead of Tracker File for Non-Task Commits
- **Context:** Needed to track consecutive non-task commits to suggest task creation
- **Decision:** Use git log directly to count commits without TASK_ references
- **Rationale:** Git history is the source of truth - no need to duplicate state in a tracker file
- **Alternatives Considered:** 
  - JSON tracker file: Adds complexity, can get out of sync with reality
  - Database/SQLite: Overkill for simple counting
  - Environment variable: Would lose state between sessions
- **Implications:** Simpler implementation, no state management needed, always accurate
- **Reversibility:** Easy - could add tracking later if more complex logic needed

[2025-09-10 14:10] - Built-in Logger Over External Dependencies for Centralized Logging
- **Context:** Needed centralized logging system to debug hooks and improve monitoring, user suggested adze library
- **Decision:** Implemented built-in logger module without external dependencies
- **Rationale:** Keep cc-pars lightweight, avoid dependency management complexity, full control over features
- **Alternatives Considered:** 
  - adze library: Adds external dependency, not significantly better than built-in solution
  - winston or pino: Too heavy for this use case, adds complexity
  - Simple console.log: Not structured, no file persistence, no level control
- **Implications:** Zero runtime dependencies, complete control over logging behavior, easier debugging
- **Reversibility:** Easy - could swap in external library later if needed, interface is compatible

[2025-09-10 15:40] - Consolidate Hook Files to Single Location Over Distributed Architecture
- **Context:** Discovered duplicate hook files in both `hooks/` and `.claude/hooks/` directories with different features scattered across copies, causing configuration and execution issues
- **Decision:** Consolidate all hook files into `.claude/hooks/` directory and update all import paths and settings references
- **Rationale:** Single source of truth prevents version conflicts, simplifies maintenance, ensures consistent feature availability, and resolves configuration inheritance issues
- **Alternatives Considered:** 
  - Keep distributed approach: Would require complex synchronization and duplicate maintenance effort
  - Merge selectively: Too error-prone to track which features were where
  - Use symlinks: Added complexity without solving the fundamental organization issue
- **Implications:** All hooks now in single location, import paths consistent, settings.json simplified, easier debugging and maintenance
- **Reversibility:** Easy - could distribute again if needed, but unlikely to be beneficial

[2025-09-10 17:00] - Biome Over ESLint for cc-pars Linting
- **Context:** Needed to set up TypeScript type checking and linting for code quality
- **Decision:** Use Biome for linting/formatting instead of ESLint + Prettier
- **Rationale:** Biome is 100x faster, zero configuration complexity, single tool instead of multiple, Bun-optimized
- **Alternatives Considered:** 
  - ESLint + Prettier: More mature, has TypeScript unsafe-* rules, plugin ecosystem, but much slower and complex
  - TSLint: Deprecated in favor of ESLint
  - Just TypeScript: No style/formatting enforcement
- **Implications:** Missing some type-aware rules (noUnsafeAssignment, etc.) but acceptable for simple codebase
- **Reversibility:** Easy - could switch to ESLint later if needed, configs are similar

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