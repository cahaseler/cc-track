import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';

export const initCommand = new Command('init').description('Initialize cc-track in your project').action(() => {
  // Create .claude/commands directory if it doesn't exist
  const claudeDir = join(process.cwd(), '.claude');
  const commandsDir = join(claudeDir, 'commands');

  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  if (!existsSync(commandsDir)) {
    mkdirSync(commandsDir, { recursive: true });
  }

  // Create the setup slash command
  const setupCommandPath = join(commandsDir, 'setup-cc-track.md');

  if (existsSync(setupCommandPath)) {
    console.log('⚠️  setup-cc-track.md already exists. Skipping creation.');
  } else {
    const setupCommandContent = `---
allowed-tools: Bash(npx cc-track setup-templates), Bash(npx cc-track setup-commands), Bash(git status), Bash(gh auth status), Read, Grep, Glob
description: Complete cc-track setup with Claude's assistance
model: claude-sonnet-4-20250514
---

# Setup cc-track for this project

You are setting up cc-track (Task Review And Context Keeper) for this project. Follow these steps carefully.

## Step 1: Installation of Templates and Commands

!\`npx cc-track setup-templates\`
!\`npx cc-track setup-commands\`

## Step 2: Quick Environment Check

Check what tools and configurations are available:

!\`git status 2>&1\`
!\`gh auth status 2>&1\`

Read key files to understand the project:
- Check for package.json, requirements.txt, Cargo.toml, go.mod, etc.
- Look for test commands, lint commands, type checking commands

## Step 3: Configure track.config.json

The \`.claude/track.config.json\` file has been created with all features disabled by default. Now update it based on the environment and user preferences:

### Current minimal config (already created):
\`\`\`json
{
  "capture_plan": false,
  "stop_review": false,
  "edit_validation": false,
  "pre_tool_validation": false,
  "pre_compact": false,
  "post_compact": false,
  "statusline": false,
  "git_branching": false,
  "branch_protection": false,
  "code_review": false,
  "api_timer": {
    "display": "hide"
  },
  "github_integration": {
    "enabled": false,
    "auto_create_issues": false,
    "use_issue_branches": false,
    "auto_create_prs": false
  },
  "logging": {
    "level": "info",
    "retention_days": 7
  }
}
\`\`\`

### Configure features based on environment and needs:

1. **Core Task Management System**:
   - Explain: "The primary functionality of cc-track involves capturing the output of planning mode to generate TASKs, and then validating changes made against those tasks. This requires at minimum a local git repository."

   **If git is NOT available**:
   - Ask: "This doesn't appear to be a git repository. Would you like me to set up git for task tracking?"
   - If yes: run \`git init\`, help configure user.name and user.email

   **If git IS available**:
   - Ask: "Would you like to enable the core task management features (plan capture and change validation)?"
   - If yes: enable \`capture_plan: true\` and \`stop_review: true\`

   **Additional git features**:
   - Ask: "Would you like automatic git branch creation/merging for each task?"
   - If yes: enable \`git_branching: true\`

   - If the user doesn't want to set up git or enable the task management system, they can still use the edit validation feature, but most other features won't work.

2. **GitHub Integration** (if git enabled):
   **If GitHub CLI is authenticated and remote exists**:
   - Ask: "Would you like GitHub integration for automatic issue and PR management?"
   - If yes, enable \`github_integration.enabled: true\` and ask:
     - "Autoatically create GitHub issues for each task?" → \`auto_create_issues: true\`
     - "Link branches to GitHub issues?" → \`use_issue_branches: true\`
     - "Create PRs instead of direct merges?" → \`auto_create_prs: true\`

   **If GitHub CLI NOT authenticated or no remote**:
   - Explain: "GitHub integration enables automatic issue and PR management, which is very useful for tracking work."
   - If no gh auth: "Would you like help setting up GitHub CLI? (run \`gh auth login\`)"
   - If no remote: "Would you like help adding a GitHub remote repository?"

3. **Optional Features**:

   **Edit Validation** (if TypeScript/JavaScript project detected):
   - Ask: "Would you like real-time validation when editing files? This gives Claude instant feedback on lint or type issues to help fix errors as they happen."
   - If yes: enable \`edit_validation: true\`
   - If lint/typecheck commands unclear, ask: "What command runs your linter? What command runs type checking?"

   **Pre-Tool Validation**:
   - Explain: "Pre-tool validation includes task file protection (prevents marking tasks complete without using /complete-task) and optional branch protection."
   - Ask: "Would you like to enable pre-tool validation to protect task files from improper edits?"
   - If yes: enable \`pre_tool_validation: true\`

   **Branch Protection** (if git enabled):
   - Ask: "Would you like to block Claude from editing files directly on the main/master branch? This enforces a feature branch workflow."
   - If yes: enable \`branch_protection: true\`
   - Then ask: "Which branches should be protected? (default: main, master)"
   - Ask: "Should Claude be allowed to edit gitignored files on protected branches? (default: yes)"

   **Context Preservation**:
   - Ask: "Would you like automatic task documentation updates before compaction? This triggers an attempt to update the Task file before compaction to preserve progress."
   - If yes: enable \`pre_compact: true\` and \`post_compact: true\`

   **Code Review** (if task management is enabled):
   - Explain: "Code review runs a comprehensive Claude SDK agent before task completion to review changes against requirements, check for security issues, and assess code quality."
   - Ask: "Would you like automatic code review before completing tasks? (takes up to 10 minutes per review)"
   - If yes: enable \`code_review: true\`
   - Note: "This will only run once per task when validation passes, and won't block task completion."

   **Status Line**:
   - Ask: "Would you like a custom status line showing current branch, task, costs, and context usage?"
   - If yes: enable \`statusline: true\`
   - Then ask: "Do you typically use Opus or Sonnet?"
     - If Opus: set \`api_timer.display: "sonnet-only"\` (only show timer when using Sonnet)
     - If Sonnet: ask "Would you like to see the API rate limit timer?"
       - Yes: \`api_timer.display: "show"\`
       - No: \`api_timer.display: "hide"\`

   **Private Journal MCP**:
   - Check if you see tools starting with \`mcp__private-journal__\` in your available tools
   - If available:
     - Ask: "I see you have the Private Journal MCP available. Would you like cc-track to use it for preserving context and insights across sessions?"
     - If yes: enable \`private_journal: true\`
     - Explain: "This will enhance context preservation after compaction and help track technical learnings."
   - If not available:
     - Inform: "The Private Journal MCP could enhance cc-track's context preservation capabilities. You can install it from: https://github.com/modelcontextprotocol/servers (look for 'private-journal')"
     - Ask: "Would you like to configure cc-track to use it once installed?"
     - If yes: enable \`private_journal: true\` with a note that it will activate once the MCP is available

Update the config file with the user's choices.

## Step 4: Populate Context Files

### For NEW/EMPTY projects:
Ask the user:
- "What is the main purpose of this project?"
- "Who are the target users?"
- "What are the core features you're planning?"
- "What tech stack are you planning to use?"
- "Any specific patterns or conventions you want to follow?"

### For EXISTING projects:
Based on your analysis, update:

**product_context.md**:
- Main purpose (infer from README or ask)
- Target users (infer or ask)
- Core features (analyze codebase structure)
- Technical stack (from package files)

**system_patterns.md**:
- Architecture patterns you discovered
- Coding conventions from config files
- Testing approach from test structure
- Git conventions from commit history

**code_index.md**:
- Complete directory tree
- Key files and their purposes
- Important functions/classes
- Environment variables and configs

**user_context.md**:
- Ask: "Any specific preferences for how I should work with you?"
- Ask: "Are there team conventions I should know about?"
- If private_journal is enabled: Use journal search to find any existing preferences about this user

## Step 5: Configure settings.json

Now configure the settings.json file based on enabled features:

1. Read the existing .claude/settings.json file (create if it doesn't exist)
2. Based on what features were enabled in track.config.json, update settings.json:

### For statusline (if enabled):
Add or update the statusLine configuration:
\`\`\`json
"statusLine": {
  "type": "command",
  "command": "npx cc-track statusline",
  "padding": 0
}
\`\`\`

### For hooks (based on what's enabled):
Add to the hooks section (preserve any existing hooks). Each hook type should be an array containing objects with a "hooks" array:

Example structure:
\`\`\`json
"hooks": {
  "PostToolUse": [
    {
      "matcher": "ExitPlanMode",
      "hooks": [
        {
          "type": "command",
          "command": "npx cc-track hook"
        }
      ]
    }
  ],
  "Stop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "npx cc-track hook"
        }
      ]
    }
  ]
}
\`\`\`

Add these based on what's enabled:
- If capture_plan enabled: Add to PostToolUse array with matcher "ExitPlanMode"
- If edit_validation enabled: Add to PostToolUse array with matcher "Edit|Write|MultiEdit"
- If pre_tool_validation enabled: Add to PreToolUse array with matcher "Edit|Write|MultiEdit"
- If stop_review enabled: Add to Stop array (no matcher needed)
- If pre_compact enabled: Add to PreCompact array (no matcher needed)

Use the Edit tool to make these changes, merging with any existing configuration.

## Step 6: Update CLAUDE.md

Update the main CLAUDE.md file to include cc-track context references:

1. Read the existing CLAUDE.md file
2. Add the cc-track section with @ imports (if not already present):

\`\`\`markdown
# Project: [Update with actual project name]

## Active Task
@.claude/no_active_task.md
<!-- IMPORTANT: Never edit this file to mark a task complete. Use /complete-task command instead. -->

## Product Vision
@.claude/product_context.md

## System Patterns
@.claude/system_patterns.md

## Decision Log
@.claude/decision_log.md

## Code Index
@.claude/code_index.md

## User Context
@.claude/user_context.md
\`\`\`

3. If the existing CLAUDE.md is already large (>100 lines):
   - Suggest: "Your CLAUDE.md is quite extensive. Would you like me to move some of the existing content to the appropriate context files (product_context, system_patterns, etc.)?"
   - If yes, help reorganize content into the appropriate files

4. Preserve any existing content that doesn't fit the cc-track structure

## Step 7: Git Hooks Recommendation (if stop_review enabled)

If stop_review was enabled:
- Explain: "The stop-review hook creates frequent WIP commits as you work. This can conflict with pre-commit hooks that run linting/tests."
- Ask: "Would you like me to help you convert any pre-commit hooks to pre-push hooks instead?"
- If yes and .git/hooks/pre-commit exists:
  - Show them what's in the pre-commit hook
  - Help them move it to pre-push: \`mv .git/hooks/pre-commit .git/hooks/pre-push\`
  - Explain: "This way, validation happens before pushing to remote, not on every WIP commit"
- If using husky or similar:
  - Suggest: "Consider moving validation from pre-commit to pre-push in your husky configuration"

## Step 8: Final Summary

Show the user what was configured and explain the key features:
- How task tracking works (if enabled)
- What the hooks do (for enabled features)
- How to use the slash commands
- Remind them to restart Claude Code for settings.json changes to take effect

## Important Instructions

- Be specific when asking questions - reference what you found
- For existing projects, show what you discovered before asking for confirmation
- Explain each feature's benefit when asking about it
- If the user seems unsure, recommend sensible defaults
- Make sure gh CLI is installed and authenticated before enabling GitHub features
`;

    writeFileSync(setupCommandPath, setupCommandContent);
    console.log('✅ Created .claude/commands/setup-cc-track.md');
  }

  console.log('\n🚅 cc-track initialization started!\n');
  console.log('Next steps:');
  console.log('1. Start Claude Code (or restart if already running)');
  console.log('2. Run the slash command: /setup-cc-track');
  console.log('3. Claude will guide you through the complete setup\n');
  console.log("This transparent setup process lets you see exactly what's being configured.");
});
