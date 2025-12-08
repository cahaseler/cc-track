---
description: Scoped dead code analysis & cleanup with parallel subagent investigation
allowed-tools: Task, Bash, Read, Write, Edit, Glob, Grep
---

# /cc-track:spotless - Analyze scoped changes for dead code and artifacts

## Description
- **What** — Analyze a scoped working set (commit range, unstaged changes, or spec branch) to identify dead code, orphaned artifacts, and remnants from abandoned implementation attempts; dispatch parallel subagents to investigate and validate findings
- **Outcome** — Clean code with all dead artifacts from recent work removed; validated removal tasks ready for execution

## Variables

### Dynamic Variables
- `commit_id`: Optional starting commit - analyzes all changes **from and including this commit** through HEAD plus staged/unstaged/untracked
  - **INCLUDES** the commit_id commit itself and all subsequent commits through HEAD
  - If commit_id equals HEAD, working set will be staged + unstaged + untracked only
  - If commit_id is invalid or not in history, **STOP and ask user for guidance**
- `scope_mode`: One of: `commit_range`, `unstaged`, `spec_branch`, `context` — determines working set

### Static Variables
- `analysis_dir`: .cc-track/analysis/spotless
- `reports_subdir`: {analysis_dir}/area_reports
- `validation_subdir`: {analysis_dir}/validations
- `max_parallel_agents`: 4

## Arguments

Optional scope specification passed via $ARGUMENTS. If ambiguous, ask user to clarify.

**Examples:**
- `/cc-track:spotless abc123` — Analyze from commit abc123 through HEAD
- `/cc-track:spotless unstaged` — Analyze staged/unstaged/untracked only
- `/cc-track:spotless spec` — Analyze changes on current spec branch vs main
- `/cc-track:spotless context` — Analyze files discussed in current session

---

## Step 1: Determine Working Set Scope

### Action: DetermineScope
Identify which files to analyze based on arguments or user input.

**If** arguments contain a commit SHA or ref:
1. Validate commit exists: `git rev-parse --verify {commit_id}^{commit} 2>/dev/null`
   - **If validation fails**: STOP and ask "Commit {commit_id} is invalid or not found. Please provide a valid commit SHA or ref."
2. Gather working set:
   - Committed changes: `git log --name-only --pretty=format: {commit_id}^..HEAD | sort -u`
   - Staged: `git diff --cached --name-only`
   - Unstaged: `git diff --name-only`
   - Untracked: `git ls-files --others --exclude-standard`
   - **Working Set** = UNION of all four

**ElseIf** arguments specify "unstaged" or "staged":
- Staged: `git diff --cached --name-only`
- Unstaged: `git diff --name-only`
- Untracked: `git ls-files --others --exclude-standard`
- **Working Set** = UNION of all three

**ElseIf** arguments specify "spec" or current branch is a spec branch (NNN-feature-name pattern):
1. Detect base branch: `git merge-base HEAD main` (or master)
2. Changes on spec branch: `git diff --name-only $(git merge-base HEAD main)..HEAD`
3. Plus staged/unstaged/untracked
4. **Working Set** = UNION of all

**ElseIf** arguments specify "context":
- Ask user: "Which files from our current session should I analyze? List files/directories or say 'all discussed files'"
- **Wait** for user response
- **Working Set** = User-specified files

**Else** (scope ambiguous):
- Ask user to clarify scope:
  1. From a specific commit (provide SHA)
  2. Current unstaged/staged changes only
  3. Changes on current spec branch vs main
  4. Files we've discussed in this session
- **Wait** for user selection

### Action: SetupDirectories
```bash
mkdir -p .cc-track/analysis/spotless/area_reports
mkdir -p .cc-track/analysis/spotless/validations
mkdir -p .cc-track/analysis/spotless/removal_tasks
```

### Action: RecordWorkingSet
Save working set to `.cc-track/analysis/spotless/working_set.json`:
```json
{
  "scope_mode": "commit_range|unstaged|spec_branch|context",
  "commit_range": "abc123..HEAD",
  "files": ["src/foo.ts", "src/bar.ts"],
  "timestamp": "2025-01-01T00:00:00Z"
}
```

---

## Step 2: Analyze Working Set for Dead Code Patterns

### Action: IdentifyDeadCodePatterns
Scan working set files for common dead code indicators.

**Patterns to detect** (ordered by likelihood after AI changes):

1. **Orphaned imports** — imports with no usage in the file
2. **Unused functions/variables** — declared but never called/referenced
3. **Commented-out code blocks** — large blocks of commented code (>5 lines)
4. **Debug artifacts** — console.log, debugger statements, TODO/FIXME from current work
5. **Dead branches** — unreachable code paths, always-false conditions
6. **Orphaned exports** — exports not imported anywhere in codebase
7. **Duplicate implementations** — similar code suggesting abandoned refactor
8. **Test artifacts** — `.only`, skipped tests, test data that should be removed
9. **AI code slop** — patterns inconsistent with codebase style:
   - Excessive comments a human wouldn't add
   - Unnecessary defensive checks/try-catch in trusted codepaths
   - Casts to `any` to bypass type issues
   - Over-documentation of obvious code
   - Verbose patterns where codebase uses concise ones

For each file in working set: identify potential issues with file:line references.

### Action: ChunkAnalysis
Group findings by file/module for parallel investigation:
- Create 2-5 investigation chunks based on working set size
- Each chunk: area name, files, identified patterns, investigation focus

### Action: SaveInitialFindings
Write to `.cc-track/analysis/spotless/initial_findings.md`:
- Pattern counts by type
- File list per pattern
- Investigation priorities

---

## Step 3: Analyze Duplication & Naming

### Action: DetectDuplication
Find repeated code patterns in working set.

**Patterns to detect:**
- Copy-pasted logic (>5 similar lines, 2+ instances)
- Nearly-identical functions with cosmetic differences
- Repeated type definitions or interfaces
- Same validation/transform/fetch patterns across files

**Output per cluster:**
- All instance locations (file:line)
- Pattern description
- Extraction recommendation (where to consolidate)
- Effort estimate (low/medium/high)

Ignore intentional duplication (test fixtures, generated code).

### Action: AuditNaming
Identify semantic drift and clarity issues.

**Semantic drift** (names no longer match expanded scope):
- Functions doing more than name implies
- Files/components that outgrew original purpose
- Variables representing broader state than name suggests

**Clarity issues:**
- Generic names that could be specific (`data`, `result`, `info`, `item`, `temp`)
- `handle*` functions with complex multi-step logic
- Catch-all files (`utils.ts`, `helpers.ts`) over 200 lines

**Convention inconsistency:**
- Mixed `get*/fetch*/load*` for same operation type
- Mixed `handle*/on*` for event handlers
- Singular/plural inconsistency

### Action: GenerateReports
Write to `.cc-track/analysis/spotless/duplication_report.md` and `.cc-track/analysis/spotless/naming_report.md`.

Use timestamped variants if files already exist (never overwrite).

---

## Step 4: Dispatch Investigation Subagents

### Action: SpawnSubagents
Launch parallel investigation agents (up to 4) using the Task tool with subagent_type="general-purpose".

**Investigation prompt template:**
```
You are investigating recent changes in {area_name} for dead code artifacts.

**Context**: These files were recently modified. Look for artifacts from failed implementation attempts, abandoned branches, or incomplete refactors.

**Files in scope**: {file_list}
**Initial patterns detected**: {patterns_for_area}

**Your task**:
1. Review all files in scope thoroughly
2. For EACH potential issue, verify:
   - Is this code actually unused? (check imports, calls, references)
   - Is this a remnant from a failed approach? (check git history if needed)
   - Could this break something if removed? (check dependencies)
3. Categorize findings:
   - SAFE_TO_REMOVE: Confirmed dead code, no dependencies
   - NEEDS_VALIDATION: Likely dead but needs confirmation
   - KEEP: Actually used or unclear
4. Document evidence for each finding

**Output format**: Markdown report with sections per issue type.
**Critical**: Be conservative. When in doubt, mark NEEDS_VALIDATION.

Save your report to: .cc-track/analysis/spotless/area_reports/{area_name}_report.md
```

**Wait** for all investigation subagents to complete.

---

## Step 5: Validate High-Risk Findings

### Action: ConsolidateReports
Read all investigation reports from `.cc-track/analysis/spotless/area_reports/`.

Group findings:
- SAFE_TO_REMOVE
- NEEDS_VALIDATION
- KEEP

Extract high-risk items from SAFE_TO_REMOVE:
- Function/class deletions
- File deletions
- Export removals

### Action: SpawnValidationAgents
For high-risk items, launch validation subagents:

**Validation prompt template:**
```
You are validating a finding from dead code analysis.

**Original finding**:
{finding_description}
{file_path}:{line_numbers}
{reasoning_from_investigation}

**Your task**:
1. Search codebase for ANY usage (dynamic imports, string refs, reflection)
2. Check test files for usage
3. Verify the code is actually dead, not just indirectly used
4. Determine: CONFIRMED_SAFE, UNSAFE, or UNCERTAIN

**Output**: Markdown with verdict, evidence, reasoning.

Save to: .cc-track/analysis/spotless/validations/{finding_id}_validation.md
```

**Wait** for all validation subagents to complete.

---

## Step 6: Generate Removal Tasks

### Action: ReconcileFindings
Create final removal list from validation results:
- CONFIRMED_SAFE → approved for removal
- UNSAFE → document why, exclude
- UNCERTAIN → flag for manual review

### Action: GenerateSummary
Create `.cc-track/analysis/spotless/cleanup_summary.md`:

```markdown
# Dead Code Cleanup Summary

**Scope**: {scope_mode} - {commit_range or description}
**Files Analyzed**: {count}
**Generated**: {timestamp}

## Executive Summary

- Total issues found: X
- Safe to remove: Y
- Manual review required: Z
- Excluded (kept): W

## Safe Removals

| File | Lines | Type | Description |
|------|-------|------|-------------|
| src/foo.ts | 45-67 | Unused function | `oldHelper()` never called |

## Manual Review Required

| File | Lines | Type | Why Review Needed |
|------|-------|------|-------------------|
| src/bar.ts | 12 | Orphaned export | May be dynamically imported |

## Duplication Clusters

{clusters from duplication_report.md}

## Naming Issues

{issues from naming_report.md}

## Excluded Items

| File | Lines | Reason |
|------|-------|--------|
| src/baz.ts | 100-120 | Used via reflection |
```

### Action: CreateRemovalTasks
For each CONFIRMED_SAFE finding, create `.cc-track/analysis/spotless/removal_tasks/task_{id}.md`:

```markdown
# Removal Task: {id}

**Type**: {Unused function | Orphaned file | Dead import | etc.}
**File**: {path}
**Lines**: {start}-{end}
**Evidence**: {why this is confirmed dead}

## Action Required

{Specific removal instructions - delete file, remove lines, etc.}

## Verification

After removal, verify:
- [ ] TypeScript compiles
- [ ] Tests pass
- [ ] No runtime errors
```

---

## Step 7: Execute Approved Removals (User-Triggered)

**Note**: This step only executes when user explicitly approves tasks.

Present summary and ask:
> Found X items safe to remove. Review `.cc-track/analysis/spotless/cleanup_summary.md` for details.
>
> Options:
> 1. Execute all safe removals
> 2. Execute specific tasks (provide IDs)
> 3. Review individual tasks first
> 4. Skip execution for now

**If user approves:**

### Action: ExecuteRemovals
For each approved task:
1. Read task file for removal instructions
2. Execute removal (Edit tool for line removal, delete for files)
3. Log to `.cc-track/analysis/spotless/changes_log.md`

### Action: VerifyRemovals
After all removals:
1. Run TypeScript check: `bunx tsc --noEmit`
2. Run tests: `bun test`
3. **If failures**: Report which removal caused it, suggest rollback

### Action: GenerateExecutionReport
Write `.cc-track/analysis/spotless/execution_report.md`:
- Tasks executed
- Verification results
- Any rollbacks needed

---

## Success Criteria

### Step 1 - Scope
- [ ] Scope mode determined
- [ ] Commit validated (if applicable)
- [ ] Working set recorded
- [ ] Directories created

### Step 2 - Pattern Analysis
- [ ] Dead code patterns scanned
- [ ] Analysis chunked (2-5 chunks)
- [ ] Initial findings saved

### Step 3 - Duplication & Naming
- [ ] Duplicate clusters identified
- [ ] Semantic drift detected
- [ ] Reports generated (no overwrites)

### Step 4 - Investigation
- [ ] Subagents dispatched (up to 4)
- [ ] All reports collected

### Step 5 - Validation
- [ ] High-risk items identified
- [ ] Validation agents completed
- [ ] Findings categorized

### Step 6 - Summary
- [ ] Cleanup summary generated
- [ ] Removal tasks created
- [ ] User presented with options

### Step 7 - Execution (if approved)
- [ ] Approved removals executed
- [ ] Verification passed
- [ ] Execution report generated
