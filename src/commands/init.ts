import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const initCommand = new Command('init')
  .description('Initialize cc-track in your project')
  .action(() => {
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
allowed-tools: Bash(bunx cc-track:*), Bash(git:*), Bash(gh:*), Write, Read, Edit, Grep, Glob
description: Complete cc-track setup with Claude's assistance
---

# Setup cc-track for this project

You are setting up cc-track (Task Review And Context Keeper) for this project. Follow these steps carefully.

## Step 1: Installation of Templates and Commands

!\`bunx cc-track setup-templates\`
!\`bunx cc-track setup-commands\`

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
  "pre_compact": false,
  "post_compact": false,
  "statusline": false,
  "git_branching": false,
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

### Now enable features based on environment:

1. **If git is available**:
   - Ask: "Would you like automatic code review and commits at stop points? This helps track your work with WIP commits."
   - If yes, enable \`stop_review: true\`
   - Ask: "Would you like automatic git branch creation for tasks?"
   - If yes, enable \`git_branching: true\`

2. **If git is NOT available**:
   - Ask: "This doesn't appear to be a git repository. Would you like help setting up git?"
   - If yes, run \`git init\` and help configure

3. **If GitHub CLI is authenticated**:
   - Ask: "Would you like GitHub integration for automatic issue and PR creation?"
   - If yes, enable \`github_integration.enabled: true\` and ask:
     - "Should tasks automatically create GitHub issues?" → \`auto_create_issues: true\`
     - "Should branches be linked to GitHub issues (uses gh issue develop)?" → \`use_issue_branches: true\`
     - "Should completed tasks create PRs instead of merging directly?" → \`auto_create_prs: true\`

4. **If GitHub CLI is NOT authenticated**:
   - Mention: "GitHub CLI is not authenticated. If you want GitHub integration later, run \`gh auth login\`"

5. **Based on project type** (from package.json, etc.):
   - If TypeScript/JavaScript project with lint/typecheck commands:
     - Ask: "Would you like real-time validation when editing TypeScript/JavaScript files?"
     - If yes, enable \`edit_validation: true\`

6. **Always ask**:
   - "Would you like to automatically create task files when exiting planning mode?" → \`capture_plan: true\`
   - "Would you like context preservation before compaction?" → \`pre_compact: true\` and \`post_compact: true\`
   - "Would you like a custom status line showing costs and task info?" → \`statusline: true\`
   - If statusline enabled: "How should API rate limit timers be shown? (hide/show/sonnet-only - recommend sonnet-only)" → \`api_timer.display\`

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
- Use journal search to find any existing preferences

## Step 5: Help User Configure settings.json

Now help the user configure their settings.json file. Check if it exists first:

1. Read the existing settings.json file (if it exists)
2. Based on what features were enabled in track.config.json, show the user what to add:

### For statusline (if enabled):
"To enable the custom status line, add this to your settings.json:"
\`\`\`json
"statusLine": {
  "type": "command",
  "command": "cc-track statusline",
  "padding": 0
}
\`\`\`

### For hooks (based on what's enabled):
"To enable the cc-track hooks, add these to your settings.json hooks section:"

- If capture_plan enabled: PostToolUse hook for ExitPlanMode
- If edit_validation enabled: PostToolUse hook for Edit|Write|MultiEdit
- If stop_review enabled: Stop hook
- Always recommend: PreCompact and SessionStart hooks for context preservation

Show them the complete hooks configuration they need, merged with any existing hooks.

## Step 6: Final Steps

1. Update the main CLAUDE.md file with the actual project name
2. Test that enabled features work (e.g., \`bunx cc-track statusline\` if enabled)
3. Show the user what was configured and explain the key features:
   - How task tracking works (if enabled)
   - What the hooks do (for enabled features)
   - How to use the slash commands

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
    console.log('1. Restart Claude Code (or reload if already running)');
    console.log('2. Run the slash command: /setup-cc-track');
    console.log('3. Claude will guide you through the complete setup\n');
    console.log('This transparent setup process lets you see exactly what\'s being configured.');
  });