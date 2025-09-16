import { Command } from 'commander';
import type { CommandDeps, CommandResult, PartialCommandDeps } from './context';
import { applyCommandResult, handleCommandException, resolveCommandDeps } from './context';

export type InitDeps = Pick<CommandDeps, 'console' | 'process' | 'fs' | 'path' | 'logger'>;

export interface InitResultData {
  claudeDir: string;
  commandsDir: string;
  setupCommandPath: string;
  createdClaudeDir: boolean;
  createdCommandsDir: boolean;
  createdSetupCommand: boolean;
}

export function runInit(deps: InitDeps): CommandResult<InitResultData> {
  const logger = deps.logger('init-command');

  try {
    const projectRoot = deps.process.cwd();
    const claudeDir = deps.path.join(projectRoot, '.claude');
    const commandsDir = deps.path.join(claudeDir, 'commands');
    const setupCommandPath = deps.path.join(commandsDir, 'setup-cc-track.md');

    const messages: string[] = [];
    let createdClaudeDir = false;
    let createdCommandsDir = false;
    let createdSetupCommand = false;

    if (!deps.fs.existsSync(claudeDir)) {
      deps.fs.mkdirSync(claudeDir, { recursive: true });
      logger.info('Created .claude directory', { path: claudeDir });
      messages.push('✅ Created .claude directory');
      createdClaudeDir = true;
    }

    if (!deps.fs.existsSync(commandsDir)) {
      deps.fs.mkdirSync(commandsDir, { recursive: true });
      logger.info('Created commands directory', { path: commandsDir });
      messages.push('✅ Created .claude/commands directory');
      createdCommandsDir = true;
    }

    if (deps.fs.existsSync(setupCommandPath)) {
      messages.push('⚠️ setup-cc-track.md already exists. Skipping creation.');
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
   - Explain: "Code review analyzes changes before task completion to review against requirements, check for security issues, and assess code quality."
   - Ask: "Would you like automatic code review before completing tasks?"
   - If yes:
     - Ask: "Which code review tool would you prefer?"
       - **Claude SDK** (default): Comprehensive agent-based review, ~10 minutes, thorough analysis
       - **CodeRabbit CLI**: Fast focused review, ~2-5 minutes, actionable feedback
     - Set \`code_review: { enabled: true, tool: 'claude' | 'coderabbit' }\`
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

`; // end template
      deps.fs.writeFileSync(setupCommandPath, setupCommandContent);
      messages.push('✅ Created setup-cc-track.md');
      createdSetupCommand = true;
    }

    return {
      success: true,
      messages,
      data: {
        claudeDir,
        commandsDir,
        setupCommandPath,
        createdClaudeDir,
        createdCommandsDir,
        createdSetupCommand,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to initialize project', { error: message });
    return {
      success: false,
      error: `Failed to initialize cc-track: ${message}`,
      exitCode: 1,
    };
  }
}

export function createInitCommand(overrides?: PartialCommandDeps): Command {
  return new Command('init').description('Initialize cc-track in your project').action(async () => {
    const deps = resolveCommandDeps(overrides);
    try {
      const result = runInit(deps);
      applyCommandResult(result, deps);
    } catch (error) {
      handleCommandException(error, deps);
    }
  });
}

export const initCommand = createInitCommand();
