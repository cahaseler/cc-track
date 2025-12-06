# Technical Plan: Migrate Specify Command to Script

## Summary

Create a `specify.ts` script that handles all infrastructure operations for the `/cc-track:specify` command (git branch, spec folder, metadata, CLAUDE.md update, GitHub issue). Update the command to invoke the skill to get the script path, then run the script.

## Technical Context

| Aspect | Choice |
|--------|--------|
| **Language/Version** | TypeScript (strict mode) |
| **Runtime** | Bun |
| **Primary Dependencies** | None new - uses existing lib functions |
| **Testing** | Bun test with colocated tests |
| **Architecture** | Single script in skills/cc-track-tools/scripts/ |

## Constitution Check

| Guardrail | Status | Notes |
|-----------|--------|-------|
| Max runtime deps (5) | ✅ Pass | No new deps |
| Max file size (500 lines) | ✅ Pass | Script ~150-200 lines expected |
| Dependency injection | ✅ Pass | Will use deps parameter pattern |
| Colocated tests | ✅ Pass | specify.test.ts alongside specify.ts |
| Plugin-native | ✅ Pass | Uses skill/script pattern |

No constitution violations.

## Project Structure Changes

```
skills/cc-track-tools/
├── scripts/
│   ├── specify.ts         # NEW - infrastructure operations
│   └── specify.test.ts    # NEW - colocated tests
├── lib/
│   └── (existing - no changes needed)
└── SKILL.md               # UPDATE - document new script

commands/
└── specify.md             # UPDATE - use skill invocation pattern
```

## Technical Design

### specify.ts Script

**Input Interface:**
```typescript
interface SpecifyOptions {
  title: string;
  taskId?: string;  // Auto-generate if not provided
}
```

**Output Interface:**
```typescript
interface SpecifyResultData {
  taskId: string;
  featureName: string;
  branch: string;
  specDir: string;
  metadataPath: string;
  claudeMdUpdated: boolean;
  github?: {
    issue: number;
    url: string;
  };
}
```

**Dependencies (from existing libs):**
- `spec-helpers.ts`: getNextTaskId, generateFeatureName, createSpecDirectory, createMetadata
- `git-helpers.ts`: GitHelpers.createTaskBranch
- `github-helpers.ts`: GitHubHelpers.createGitHubIssue
- `config.ts`: isGitHubIntegrationEnabled, getGitHubConfig
- `context.ts`: CommandResult, CommandDeps

**Operations (in order):**
1. Validate inputs (title required, .cc-track exists, CLAUDE.md exists)
2. Generate task ID (use getNextTaskId if not provided)
3. Generate feature name from title (use generateFeatureName)
4. Check spec directory doesn't already exist
5. Create git branch: `{taskId}-{featureName}`
6. Create spec directory
7. Create .metadata.json
8. Update CLAUDE.md to reference new spec
9. Create GitHub issue (if enabled)
10. Return structured result

**Error Handling:**
- Spec dir exists → error with message
- Branch exists → error with guidance
- .cc-track missing → error suggesting setup
- CLAUDE.md missing → error
- GitHub fails → warn but continue (non-blocking)

### Command Update (specify.md)

**Key Change:** Infrastructure creation happens FIRST, not last. This prevents Claude from getting distracted with research before the branch/folder exist.

**New Flow:**

```markdown
## Phase 0: Create Infrastructure FIRST

### Step 0a: Determine Task Name
If user provided a clear task name/description, use it.
If unclear, ask ONE question: "What should this feature be called?"

### Step 0b: Get Script Path via Skill
Invoke the `cc-track:cc-track-tools` skill to get the base directory.

### Step 0c: Run Specify Script
```bash
bun {base_directory}/scripts/specify.ts "{title}"
```

### Step 0d: Confirm Infrastructure Created
Parse JSON output and confirm:
- Branch created and checked out
- Spec directory created
- Metadata initialized
- CLAUDE.md updated
- GitHub issue created (if enabled)

## Phase 1: Socratic Questioning (AFTER infrastructure exists)
Now proceed with questioning, but we're already on the right branch
and have the spec folder ready.

## Phase 2: Write spec.md
Use Write tool to create spec.md in the already-created spec directory.
```

**Rationale:** Running the script first ensures:
1. We're on the feature branch before any work happens
2. Spec folder exists for any research files
3. Claude can't get distracted with research before infrastructure exists
4. If something fails, we fail fast before investing time in questioning

### Test Plan

**Happy Path Tests:**
- Creates branch, folder, metadata, updates CLAUDE.md
- Auto-generates task ID when not provided
- Creates GitHub issue when enabled

**Error Path Tests:**
- Fails gracefully when spec dir exists
- Fails gracefully when branch exists
- Fails gracefully when .cc-track missing
- Warns but continues when GitHub fails

**Integration Points:**
- Verify with actual file system operations
- Verify git operations (can mock execSync)

## Task Planning Approach

The `/cc-track:tasks` command will generate tasks following this order:
1. Create specify.ts with core logic and DI
2. Add tests for specify.ts
3. Update SKILL.md documentation
4. Update specify.md command
5. Run full validation suite
6. Manual integration test

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Git operations fail | Low | Medium | Use try/catch with clear error messages |
| GitHub API fails | Medium | Low | Non-blocking, warn and continue |
| CLAUDE.md format changes | Low | High | Use regex pattern matching |

## Dependencies on Existing Code

All dependencies are internal (no external packages):
- `spec-helpers.ts` - ID generation, directory creation
- `git-helpers.ts` - Branch operations
- `github-helpers.ts` - Issue creation
- `config.ts` - Feature flags
- `context.ts` - Command infrastructure

No changes needed to these files.
