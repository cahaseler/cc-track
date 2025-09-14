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
allowed-tools: Bash(bunx cc-track:*), Write, Read, Grep, Glob
description: Complete cc-track setup with Claude's assistance
---

# Setup cc-track

Welcome! I'll help you set up cc-track (Task Review And Context Keeper) for your project. This system will help keep your vibe coding on track with intelligent context management and task tracking.

## Step 1: Install Templates and Commands

First, I'll install all the necessary templates and slash commands:

!\`bunx cc-track setup-templates\`

!\`bunx cc-track setup-commands\`

## Step 2: Analyze Your Project

Now I'll explore your repository to understand what kind of project this is. Let me check:

1. **Project type and structure** - Look for package.json, requirements.txt, Cargo.toml, etc.
2. **Directory layout** - Identify source folders, test structure, documentation
3. **Existing conventions** - Check for linters, formatters, style guides
4. **Tech stack** - Languages, frameworks, databases, deployment

## Step 3: Configure Context Files

Based on my analysis, I'll populate the context files in \`.claude/\`:

### product_context.md
- Ask you about the project's main purpose and vision
- Document target users and core features
- Note the technical stack I discovered

### system_patterns.md
- Document architectural patterns (MVC, microservices, etc.)
- Record coding conventions from config files
- Note testing frameworks and strategies
- Ask about your tool preferences

### code_index.md
- Create a clear directory structure map
- List key files and their purposes
- Document important classes/functions
- Note configuration and environment setup

### user_context.md
- Ask about your working style and preferences
- Document any team conventions
- Note communication preferences

## Step 4: Configure Hooks and Settings

I'll set up the appropriate hooks based on your project:
- Edit validation for real-time TypeScript/linting checks
- Stop review for automatic code review and commits
- Plan capture for task management
- Pre/post compaction for context preservation

## Step 5: Final Setup

- Configure track.config.json with appropriate features
- Update CLAUDE.md with your project name and imports
- Set up the custom status line for better visibility

## Let's Begin!

I'll start by exploring your project structure to understand what we're working with.
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