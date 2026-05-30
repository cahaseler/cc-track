# System Patterns

**Purpose:** Records established technical patterns, architectural decisions, coding standards, and recurring workflows. Ensures consistency and maintainability.

**Instructions:**
- Document significant, recurring patterns and standards
- Explain rationale behind chosen patterns
- Update when new patterns adopted or existing modified
- Append updates with: `[YYYY-MM-DD HH:MM] - [Description of Pattern/Change]`

---

## Architectural Patterns

### Hook-Based Architecture
- Event-driven system using Claude Code's hook system
- Hooks respond to specific events (PreToolUse, PostToolUse, Stop, etc.)
- Stateless hooks communicate via file system
- JSON input via stdin, output controls flow

### File-Based State Management
- All state stored in `.cc-track/` directory
- Markdown files for human-readable context
- JSON/JSONL for machine-readable data
- File imports via CLAUDE.md for automatic context inclusion

### Template-Based Initialization
- Templates stored in `templates/` directory
- Safe copying (no overwrites of existing content)
- Backup existing files before modification

## Design Patterns

### Command Pattern
- Slash commands defined in plugin's `commands/*.md` directory
- YAML frontmatter for metadata
- Markdown body contains instructions for Claude
- Bash execution via `!` prefix

### Observer Pattern
- Hooks observe Claude Code events
- Multiple hooks can respond to same event
- Exit codes control flow (0=success, 2=block)

### Skill-Based Script Execution
- Skills provide base directory path when invoked via Skill tool
- Scripts in `skills/cc-track-tools/scripts/` are TypeScript files run with bun
- Commands invoke skill first to get path, then run scripts
- Solves Claude Code bug where `${CLAUDE_PLUGIN_ROOT}` unavailable in slash commands
- Scripts use `process.cwd()` for project root, skill path for lib imports

### Autoflow Hook Coordination
- Three hooks coordinate for autonomous operation:
  - `UserPromptSubmit`: Activation/deactivation via keyword detection
  - `PermissionRequest`: Deny permissions with "find safe alternative" guidance
  - `Stop`: Evaluate if Claude should continue using Claude SDK
- State shared via `.cc-track/.autoflow-state.json`
- Per-message opt-in: autoflow only active when "autoflow" keyword in message
- Throttle detection: 3 continuations per 5-minute window prevents runaway sessions
- Battle-tested evaluation prompt from double-shot-latte project (60+ scenarios)

## Coding Standards & Conventions

### Naming Conventions
- Functions: camelCase (e.g., `captureplan`, `extractContext`)
- Variables: camelCase for locals, UPPER_SNAKE for constants
- Classes: PascalCase (not used much)
- Files: kebab-case for scripts, snake_case for context files

### Code Style
- Indentation: 2 spaces for TypeScript/JSON
- Line length: Not strictly enforced
- Comments: Minimal in code, extensive in markdown docs

### Git Conventions
- Branch naming: feature/description-taskid, bug/description-taskid
- Commit messages: Conventional commits format (feat:, fix:, docs:, chore:, etc.)
- Automated releases: Semantic-release with GitHub Actions
- PR process: GitHub integration with automated workflows

## Testing Patterns

### Test Framework and Organization
- **Framework:** Bun test with built-in mocking support
- **Test location:** Tests colocated with source files (e.g., `commands/backlog.test.ts`)
- **Coverage target:** 428+ tests covering 83%+ of files
- **Test naming:** `*.test.ts` files alongside implementation

### Dependency Injection for Testability
- **Principle:** Inject side effects (filesystem, child_process, network, config, logging) via constructor args or deps parameter
- **Production defaults:** Provide narrow interfaces and production defaults inside modules; tests pass mocks, production uses defaults
- **No mutable state:** Avoid module-level mutable state; if caching required, expose reset (e.g., `clearConfigCache()`)
- **Per-test isolation:** Each test creates fresh instances and restores with `mock.restore()` to avoid cross-test leakage

### DI Implementation Patterns

**Deps object (hooks):**
```typescript
// Example: preToolValidationHook(input, deps)
export async function exampleHook(input: HookInput, deps: {
  execSync?: typeof execSync;
  fileOps?: { existsSync: typeof existsSync };
  logger?: ReturnType<typeof createLogger>;
} = {}) {
  const exec = deps.execSync || execSync;
  const fs = deps.fileOps || { existsSync };
  const log = deps.logger || createLogger('example');
  // ...use exec, fs, log...
  return { continue: true };
}
```

**Constructor injection (libs):**
```typescript
// Example: GitHelpers(exec?, getGitConfig?, claudeSDK?)
export class MyService {
  constructor(
    private exec: ExecFn = defaultExec,
    private fs: FileOps = defaultFs,
    private log = createLogger('my-service')
  ) {}

  run(cwd: string) {
    this.exec('echo hi', { cwd });
  }
}
```

**Command deps objects:**
```typescript
// Example: runCompleteTask(options, deps)
export interface CompleteTaskDeps {
  console: ConsoleLike;
  process: ProcessLike;
  fs: FileSystemLike;
  time: TimeLike;
  logger: () => LoggerLike;
  // ... other dependencies
}
```

### Shared Test Utilities
The codebase provides reusable test utilities in `test-utils/command-mocks.ts`:

```typescript
import {
  createMockLogger,
  createMockConsole,
  createMockProcess,
  createMockFileSystem,
  createTestDeps,
  createMockCompleteTaskDeps
} from '../test-utils/command-mocks';

// Create all test dependencies at once
const deps = createTestDeps({ cwd: '/project', fixedDate: '2025-01-01' });

// Or create individual mocks
const logger = createMockLogger();
const console = createMockConsole();
const fs = createMockFileSystem({ '/file.txt': 'content' });

// Command-specific helpers
const taskDeps = createMockCompleteTaskDeps({ /* initial files */ });
```

### Parallel-Safe Testing
- Always inject per-test instances: `new GitHelpers(mockExec, mockGetGitConfig, mockClaudeSDK)`
- Reset global mocks between tests: `beforeEach(() => { mock.restore(); clearConfigCache(); })`
- Prefer DI over `mock.module` for Node built-ins
- If `mock.module` unavoidable, restore in `afterEach` with fresh dynamic imports
- Avoid mutating process-wide state (e.g., `process.env`) without restoration

### Integration Testing
- Test complete workflows rather than isolated units for complex commands
- Example: `complete-task-integration.test.ts` tests full success path, failure/rollback, option flags, edge cases
- Mock all external dependencies (git, github, file system, time)
- Verify state changes and side effects comprehensively

### Mocking Strategy
- **File system:** Use mock FileSystemLike interface with in-memory Map
- **Process execution:** Mock execSync with predefined command responses
- **Console output:** Capture log/error/warn calls to arrays for assertion
- **Time:** Mock Date.now() and date string generation for deterministic tests
- **Config cache:** Call `clearConfigCache()` in beforeEach when config involved

## Workflow Patterns

### Development Workflow
1. Research and document in `/docs`
2. Create templates in `/templates`
3. Implement scripts in `/scripts`
4. Create commands in `/commands`
5. Test with actual Claude Code session

### Hook Implementation Pattern
1. Read JSON from stdin
2. Process based on event type
3. Output JSON for control flow
4. Exit with appropriate code

### Context Update Pattern
1. Hooks append to logs (don't modify)
2. Templates provide structure
3. Claude updates during sessions
4. PreCompact extracts and preserves

## Tool Preferences

- **Runtime:** Bun over Node.js (faster, built-in TypeScript)
- **File operations:** Claude Code tools (Read/Write) over fs operations
- **Search:** Grep tool over bash grep
- **Package management:** Bun's built-in over npm/yarn
- **Shell scripts:** Bash for simple, TypeScript for complex
- **JSON parsing:** jq in bash, native in TypeScript

## Implementation Guidelines

### Safety First
- Never overwrite files with content
- Always create backups before modifications
- Check existence before operations
- Graceful handling of missing dependencies

### Performance Considerations
- Hooks have timeout limits (60s default)
- Batch operations when possible
- Cache expensive operations (like ccusage)
- Minimize blocking operations

### User Experience
- Clear, actionable error messages
- Progress indicators for long operations
- Warnings before destructive actions
- Non-intrusive by default

---

## Release Management

### Semantic Release Process
- Automated versioning based on conventional commit messages
- GitHub Actions workflow builds cross-platform binaries (Linux x64, Windows x64)
- Releases triggered on push to master branch
- Binary assets automatically attached to GitHub releases
- Changelog generation from commit history
- Version bumps: feat (minor), fix (patch), BREAKING CHANGE (major)

### Commit Message Generation
- All automated commits use conventional format
- GitHelpers.generateCommitMessage() generates conventional commits via Claude CLI
- Stop-review hook: `wip:` for work in progress, `docs:` for documentation
- Complete-task command: `feat:` for task completion, `docs:` for final updates
- Backward compatibility: Code recognizes both `[wip]` and `wip:` formats

## Logging Configuration

### Log Directory Location
- Logs are written to system-appropriate directories outside the project to avoid VS Code file notifications
- Configurable via `logging.directory` in track.config.json
- Default locations follow platform conventions:
  - **Linux/WSL**: `~/.local/share/cc-track/logs/` (XDG Base Directory spec)
  - **macOS**: `~/Library/Logs/cc-track/`
  - **Windows**: `%LOCALAPPDATA%\cc-track\logs\`
- Supports tilde expansion and environment variables in configured paths
- Log retention is automatically managed (default 7 days)

## Claude Code Integration Patterns

### Claude CLI Response Parsing
- Claude CLI wraps responses in `{"response": ...}` JSON structure
- Always parse and extract the inner content when processing CLI output
- Handle both successful responses and error states

### Hook Debugging
- Check execution logs for hook traces (platform-specific locations):
  - **Linux/WSL**: `~/.local/share/cc-track/logs/`
  - **macOS**: `~/Library/Logs/cc-track/`
  - **Windows**: `%LOCALAPPDATA%\cc-track\logs\`
- Each hook invocation logs input, processing steps, and output
- Use `LOG_LEVEL=DEBUG` environment variable for verbose output

### External Tool Timeouts
- Claude SDK calls use 10-minute default timeout
- Always configure bash timeout to match or exceed tool timeout

## Validation Patterns

### Pre-Tool Validation
- Unified PreToolUse hook for all validation before tool execution
- Branch protection validates current branch before allowing edits
- Task file validation prevents improper status changes
- Validation order: branch protection → task validation
- Clear user messaging with actionable next steps

### Branch Protection Implementation
- Configurable protected branches list (default: main, master)
- Optional gitignored file exemption for protected branches
- Uses GitHelpers for branch detection
- git check-ignore for gitignore status checking
- Guides users to planning mode for feature branch creation

## Multi-Agent Code Review Pattern

### Two-Phase Find-Then-Score
- Phase 1: specialized single-track reviewer agents run in parallel (foreground), each hunting one class of problem; agents output unscored findings only
- Phase 2: one isolated `issue-scorer` (no conversation history) validates each unique finding against the actual code, scoring 0/25/50/75/100
- Orchestrator deduplicates by exact file:line, filters score < 50, then routes by count (0 / 1 / >1 → `/cc-track:fix-issues`)
- Single-track agents (one problem class each) are intentional: it keeps each agent digging for the most *critical* issue rather than returning early on the most *obvious* one. Do not consolidate reviewers into multi-angle agents.

### Reviewer Model Assignment
- **Sonnet** for reviewers that make semantic/architectural judgments: `bug-scanner`, `altitude-reviewer`, `spec-compliance-reviewer`, `guidelines-reviewer`
- **Haiku** for reviewers that do bounded comparison / search-and-lookup: `plan-adherence`, `task-completion`, `comment-compliance`, `duplication-detector`, `dead-code-detector`
- Rule of thumb: if the task has a reasoning floor (judging intent, layer, or rule-vs-preference), use Sonnet; if it's pattern-match + reference-trace, Haiku is well-matched even under skeptical single-track framing

## Update Log

[2025-01-09] - Initial patterns documented
[2025-10-15] - Expanded testing patterns with comprehensive DI/mocking guidance
[2025-12-06] - Added skill-based script execution pattern
[2025-12-06] - Added Claude Code integration patterns (CLI parsing, hook debugging, timeouts)
[2025-12-06] - Updated paths from .claude/ to .cc-track/
[2025-12-19] - Added Autoflow Hook Coordination pattern (three-hook system for autonomous operation)
[2026-05-30] - Added Multi-Agent Code Review pattern (two-phase find-then-score, reviewer model assignment); removed stale Codex/CodeRabbit external-tool timeout note after legacy cleanup