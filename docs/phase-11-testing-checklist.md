# Phase 11: Final Validation Testing Checklist

**Status**: Ready to begin
**Marketplace**: https://github.com/cahaseler/cc-track-marketplace
**Plugin Repo**: https://github.com/cyanheads/cc-track

---

## Pre-Testing Setup

### 1. Ensure Plugin Code is on Main Branch

The marketplace points to your main branch. Before testing:

```bash
# Verify you're on the migration branch
git branch --show-current  # Should show: 101-migrate-to-claude-code-plugin-system

# Merge to main (or create PR and merge)
git checkout main
git merge 101-migrate-to-claude-code-plugin-system
git push origin main

# Push the tag
git push origin last-npm-release
```

### 2. Create Test Environment

Set up a fresh project for testing:

```bash
# Create test project
mkdir ~/test-cc-track-plugin
cd ~/test-cc-track-plugin
git init
echo "# Test Project" > README.md
git add README.md
git commit -m "Initial commit"
```

---

## T097: Install Plugin in Fresh Claude Code Instance ⬜

### Test Steps:

1. **Add Marketplace**
   ```bash
   /plugin marketplace add cahaseler/cc-track-marketplace
   ```
   - [ ] Command executes without error
   - [ ] Marketplace added successfully

2. **Install Plugin**
   ```bash
   /plugin install cc-track@cc-track-marketplace
   ```
   - [ ] Plugin downloads successfully
   - [ ] Plugin installed to `~/.claude/plugins/cc-track/`
   - [ ] No error messages

3. **Verify Plugin Structure**
   ```bash
   ls ~/.claude/plugins/cc-track/
   ```
   Expected files:
   - [ ] `.claude-plugin/` directory exists
   - [ ] `hooks/` directory exists
   - [ ] `commands/` directory exists
   - [ ] `lib/` directory exists
   - [ ] `templates/` directory exists
   - [ ] `package.json` exists
   - [ ] `hooks.json` exists

4. **Install Dependencies**
   ```bash
   cd ~/.claude/plugins/cc-track
   bun install
   ```
   - [ ] Dependencies install successfully
   - [ ] `node_modules/` created
   - [ ] No errors reported

**Result**: ⬜ PASS / ⬜ FAIL

**Notes**:
```
[Add any issues or observations here]
```

---

## T098: Run Through Quickstart Guide ⬜

### Test Steps:

1. **Navigate to Test Project**
   ```bash
   cd ~/test-cc-track-plugin
   claude-code
   ```

2. **Run Setup Command**
   ```
   /setup-cc-track
   ```
   - [ ] Setup wizard launches
   - [ ] Prompts for feature selection
   - [ ] Creates `.claude/` directory
   - [ ] Creates `CLAUDE.md`
   - [ ] Creates `track.config.json`
   - [ ] Copies all template files
   - [ ] No errors reported

3. **Verify Setup Output**
   ```bash
   ls -la .claude/
   ```
   Expected files:
   - [ ] `CLAUDE.md`
   - [ ] `track.config.json`
   - [ ] `product_context.md`
   - [ ] `system_patterns.md`
   - [ ] `decision_log.md`
   - [ ] `code_index.md`
   - [ ] `user_context.md`
   - [ ] `cc-track-workflow.md`
   - [ ] `backlog.md`
   - [ ] `specs/` directory

4. **Check Configuration**
   ```bash
   cat .claude/track.config.json
   ```
   - [ ] JSON is valid
   - [ ] Features reflect setup choices
   - [ ] No syntax errors

**Result**: ⬜ PASS / ⬜ FAIL

**Notes**:
```
[Add any issues or observations here]
```

---

## T099: Verify All Slash Commands Execute Correctly ⬜

Test each command with `${CLAUDE_PLUGIN_ROOT}`:

### 1. `/specify` Command
```
/specify "Add user authentication system"
```
- [ ] Command executes
- [ ] Claude asks clarifying questions
- [ ] Creates spec directory (e.g., `.claude/specs/001-user-authentication/`)
- [ ] Creates `spec.md`
- [ ] Creates `.metadata.json`
- [ ] Creates git branch
- [ ] Updates `CLAUDE.md`

### 2. `/clarify` Command
```
/clarify
```
- [ ] Loads active spec
- [ ] Identifies ambiguities
- [ ] Asks structured questions
- [ ] Updates spec.md with answers

### 3. `/plan` Command
```
/plan
```
- [ ] Loads spec.md
- [ ] Creates plan.md
- [ ] No TypeScript path errors
- [ ] Plan references correct file paths

### 4. `/tasks` Command
```
/tasks
```
- [ ] Loads plan.md
- [ ] Creates tasks.md
- [ ] Tasks properly formatted
- [ ] No execution errors

### 5. `/add-to-backlog` Command
```
/add-to-backlog "Test backlog item"
```
- [ ] Executes via `${CLAUDE_PLUGIN_ROOT}/commands/backlog.ts`
- [ ] Appends to `.claude/backlog.md`
- [ ] Item includes timestamp
- [ ] No TypeScript errors

### 6. `/prepare-completion` Command
```
/prepare-completion
```
- [ ] Executes via `${CLAUDE_PLUGIN_ROOT}/commands/prepare-completion.ts`
- [ ] Runs validation checks
- [ ] Shows validation results
- [ ] No path resolution errors

### 7. `/complete-task` Command
```
/complete-task
```
- [ ] Executes via `${CLAUDE_PLUGIN_ROOT}/commands/complete-task.ts`
- [ ] Updates task status
- [ ] Git operations work
- [ ] No path resolution errors

### 8. `/constitution` Command
```
/constitution
```
- [ ] Creates `.claude/constitution.md` if missing
- [ ] Prompts for guardrails
- [ ] Saves successfully

### 9. `/config-track` Command
```
/config-track
```
- [ ] Loads current configuration
- [ ] Shows feature status
- [ ] Can modify settings
- [ ] Saves changes

**Result**: ⬜ PASS / ⬜ FAIL

**Notes**:
```
[Add any issues or observations here]
```

---

## T100: Verify Hooks Trigger Correctly ⬜

### 1. Edit Validation Hook (PostToolUse)

Test TypeScript validation:

```bash
# Create a TypeScript file with an error
echo "const x: string = 123;" > test.ts
```

In Claude Code:
```
Read the file test.ts and fix the type error
```

- [ ] Hook triggers on file edit
- [ ] TypeScript error detected
- [ ] Blocks until fixed
- [ ] Shows clear error message

### 2. Pre-Tool Validation Hook (PreToolUse)

**Test Branch Protection:**

```bash
# Switch to main branch
git checkout main
```

In Claude Code, try to edit a file:
```
Edit README.md to add a description
```

- [ ] Hook blocks edit attempt
- [ ] Shows branch protection message
- [ ] Guides to planning mode
- [ ] Does NOT allow edit on protected branch

**Test Gitignored File Exemption:**

```bash
# Create gitignored file
echo "test-file.log" >> .gitignore
git add .gitignore
git commit -m "Add gitignore"
```

In Claude Code:
```
Edit test-file.log
```

- [ ] Hook allows edit (gitignored file exemption)
- [ ] No blocking message

**Test Task Validation:**

Try to manually edit task metadata:
```
Edit .claude/specs/001-user-authentication/.metadata.json to change status
```

- [ ] Hook blocks edit
- [ ] Shows task validation message
- [ ] Prevents manual status changes

**Result**: ⬜ PASS / ⬜ FAIL

**Notes**:
```
[Add any issues or observations here]
```

---

## T101: Test npm Detection ⬜

### Test Steps:

1. **Install npm Version (if not already installed)**
   ```bash
   npm install -g cc-track
   ```

2. **Restart Claude Code**
   ```bash
   # Exit and restart Claude Code in the test project
   cd ~/test-cc-track-plugin
   claude-code
   ```

3. **Trigger Pre-Tool Validation**
   ```
   Read README.md
   ```

4. **Verify Detection**
   - [ ] Hook detects npm installation
   - [ ] Shows conflict error message
   - [ ] Error message includes uninstall instructions
   - [ ] Blocks operation
   - [ ] Message mentions: `npm uninstall -g cc-track`

5. **Cleanup**
   ```bash
   npm uninstall -g cc-track
   ```

**Result**: ⬜ PASS / ⬜ FAIL

**Notes**:
```
[Add any issues or observations here]
```

---

## T102: Test Dependency Error Messages ⬜

### Test Steps:

1. **Remove node_modules**
   ```bash
   cd ~/.claude/plugins/cc-track
   rm -rf node_modules
   ```

2. **Restart Claude Code**
   ```bash
   cd ~/test-cc-track-plugin
   claude-code
   ```

3. **Trigger Pre-Tool Validation**
   ```
   Read README.md
   ```

4. **Verify Error Message**
   - [ ] Hook detects missing dependencies
   - [ ] Shows clear error message
   - [ ] Includes installation instructions
   - [ ] Message mentions: `cd ~/.claude/plugins/cc-track && bun install`
   - [ ] Blocks operation until fixed

5. **Cleanup**
   ```bash
   cd ~/.claude/plugins/cc-track
   bun install
   ```

**Result**: ⬜ PASS / ⬜ FAIL

**Notes**:
```
[Add any issues or observations here]
```

---

## T103: Final Test Suite Run ⬜

Run the complete test suite:

```bash
cd ~/projects/cc-pars  # Your development repo
bun test
```

### Verify:
- [ ] All tests pass
- [ ] No test failures
- [ ] No test errors
- [ ] Total test count: 428+ tests

**Result**: ⬜ PASS / ⬜ FAIL

**Test Output**:
```
[Paste test summary here]
```

---

## T104: Review All File Movements Complete ⬜

### Verify Cleanup:

1. **No files left in src/**
   ```bash
   # Should show "No such file or directory"
   ls src/ 2>&1
   ```
   - [ ] `src/` directory does not exist

2. **dist/ removed or gitignored**
   ```bash
   git status
   ```
   - [ ] `dist/` not in git (either removed or gitignored)
   - [ ] If present, only contains old binary for backward compat

3. **src/commands/slash-commands/ empty**
   ```bash
   # Should show "No such file or directory"
   ls src/commands/slash-commands/ 2>&1
   ```
   - [ ] Directory does not exist

4. **All code moved to plugin root**
   ```bash
   ls -la
   ```
   Expected directories:
   - [ ] `hooks/` exists
   - [ ] `commands/` exists
   - [ ] `lib/` exists
   - [ ] `templates/` exists
   - [ ] `scripts/` exists
   - [ ] `.claude-plugin/` exists

5. **No npm CLI artifacts**
   ```bash
   ls commands/*.ts | grep -E "(init|setup-commands|setup-templates)\.ts"
   ```
   - [ ] Should return empty (files deleted)

6. **No embedded resources**
   ```bash
   ls lib/embedded-resources.ts 2>&1
   ```
   - [ ] Should show "No such file or directory"

**Result**: ⬜ PASS / ⬜ FAIL

**Notes**:
```
[Add any issues or observations here]
```

---

## Final Summary

### Test Results:
- [ ] T097: Install Plugin - **PASS** / **FAIL**
- [ ] T098: Quickstart Guide - **PASS** / **FAIL**
- [ ] T099: Slash Commands - **PASS** / **FAIL**
- [ ] T100: Hooks - **PASS** / **FAIL**
- [ ] T101: npm Detection - **PASS** / **FAIL**
- [ ] T102: Dependency Errors - **PASS** / **FAIL**
- [ ] T103: Test Suite - **PASS** / **FAIL**
- [ ] T104: File Movement Review - **PASS** / **FAIL**

### Overall Phase 11 Result:
⬜ **ALL TESTS PASSED** - Migration complete! 🎉
⬜ **TESTS FAILED** - See notes and fix issues

### Issues Found:
```
[List any issues that need to be addressed]
```

### Next Steps:
- [ ] Fix any failing tests
- [ ] Update tasks.md with results
- [ ] Mark TASK_101 as complete
- [ ] Create release/tag if all tests pass
