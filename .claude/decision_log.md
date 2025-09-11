# Decision Log

**Purpose:** Immutable record of significant decisions made throughout the project lifecycle. Captures context, rationale, and implications of key choices.

**Instructions:**
- Log decisions with notable impact on project direction, architecture, or implementation
- Include *why* the decision was made and alternatives considered
- Do **NOT** modify existing entries - append chronologically
- Format: `[YYYY-MM-DD HH:MM] - [Summary of Decision]` followed by details

---

## Log Entries

[2025-09-10 17:20] - Filter Documentation from Stop Review Diffs Instead of Prompt Changes
- **Context:** Stop review hook was flagging documentation updates as deviations, wasting tokens on large .md files
- **Decision:** Parse and filter git diff to exclude .md files before sending to Claude for review
- **Rationale:** Filtering at diff level saves tokens AND prevents false positives more reliably than prompt instructions
- **Alternatives Considered:**
  - Just update prompt to tell Claude to ignore .md files: Still wastes tokens, less reliable
  - Exclude .md files from git diff command: Complex, loses tracking of what changed
  - Disable review for all documentation: Too broad, might miss actual issues
- **Implications:** Significant token savings, cleaner review process, auto-approval for doc-only changes
- **Reversibility:** Easy - could remove filtering logic and revert to sending full diffs

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

[2025-09-10 14:10] - Built-in Logger Over External Dependencies for Centralized Logging
- **Context:** Needed centralized logging system to debug hooks and improve monitoring, user suggested adze library
- **Decision:** Implemented built-in logger module without external dependencies
- **Rationale:** Keep cc-track lightweight, avoid dependency management complexity, full control over features
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

[2025-09-10 20:00] - Project Rename from cc-pars to cc-track with Train Branding
- **Context:** Original "cc-pars" name was unclear and unmemorable, needed better branding that conveyed purpose
- **Decision:** Rename to "cc-track" (Task Review And Context Keeper) with subtle train theming
- **Rationale:** "Track" works both for task tracking AND "staying on track" metaphor, clear namespace, practical for CLI usage
- **Alternatives Considered:** 
  - "TRACK" (all caps): Too shouty, inconsistent with naming conventions
  - Just "track": Too generic, conflicts with common commands
  - Heavy train puns (derailment, all aboard): Would harm clarity and professionalism
- **Implications:** Complete rebrand across 51 files, new visual identity with 🚅 and 🛤️, cost tier emojis for better UX
- **Reversibility:** Easy but disruptive - would require another mass rename

[2025-09-10 21:30] - Configurable API Timer Display Over Fixed Implementation  
- **Context:** API rate limit windows vary by user/usage patterns, some users want to see timer always, others find it cluttering
- **Decision:** Implement three-mode configuration: "hide", "show", "sonnet-only" (default)
- **Rationale:** "sonnet-only" is optimal default (most users hit Sonnet limits), but flexibility needed for different workflows
- **Alternatives Considered:** 
  - Always show timer: Clutters statusline for users who don't hit limits
  - Never show timer: Users hitting limits lose valuable feedback
  - Hard-coded smart logic: Too complex, can't account for all usage patterns
- **Implications:** More configuration surface area but significantly better user experience for rate limit management
- **Reversibility:** Easy - could remove configuration and default to any of the three modes

[2025-09-10 21:45] - Two-Line Statusline Format Over Single Line
- **Context:** Statusline becoming cluttered with model, cost, rate, tokens, branch, and task information
- **Decision:** Split into two lines: technical info (model/cost/rate/tokens) on line 1, project context (branch/task) on line 2
- **Rationale:** Improves readability, logical grouping of information types, prevents text overflow issues
- **Alternatives Considered:** 
  - Abbreviate information: Loses useful detail
  - Conditional display: Complex logic, inconsistent appearance
  - Horizontal scrolling: Poor UX in terminal
- **Implications:** More vertical space usage but significantly better information hierarchy and readability
- **Reversibility:** Easy - just change the line break logic in statusline.sh

[2025-09-11 02:30] - GitHub Integration via gh CLI Over Direct API Calls
- **Context:** Needed to implement GitHub integration for automatic issue creation and PR workflow
- **Decision:** Use gh CLI wrapper functions instead of direct GitHub API calls or octokit library
- **Rationale:** gh CLI handles authentication transparently, respects rate limits, works with existing user credentials, zero npm dependencies
- **Alternatives Considered:** 
  - octokit library: Adds external dependency, requires API token management, more complex authentication
  - Direct REST API calls: Would need to handle authentication, rate limiting, and error handling manually
  - GitHub Actions integration: Too complex for simple issue/PR creation, requires workflow files
- **Implications:** Users must have gh CLI installed and authenticated, but get seamless GitHub integration without token management
- **Reversibility:** Easy - wrapper functions abstract the implementation, could swap to octokit later if needed

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