---
allowed-tools: Bash(mkdir:*), Bash(cc-track init), Write, Read, Grep, Glob
description: Initialize cc-track context management system for this project
---

## Initialize cc-track Context Management System

### Step 1: Create Directory Structure
!`mkdir -p .claude/hooks .claude/plans .claude/utils`

### Step 2: Copy Template Files
!`cc-track init`

## What Just Happened

The cc-track (Task Review And Context Keeper) system has been initialized. The following files were created in `.claude/`:

- **product_context.md** - Project vision, goals, and features
- **system_patterns.md** - Technical patterns and conventions
- **decision_log.md** - Record of architectural decisions
- **progress_log.md** - Task execution tracking
- **code_index.md** - Codebase structure map
- **no_active_task.md** - Default state when no task is active
- **settings.json** - Hook configurations
- **statusline.sh** - Custom status line script
- **CLAUDE.md** - Updated with imports to all context files

## Your Next Steps

### 1. First, explore the repository structure

Start with a basic `ls -la` to see what you're working with, then use Glob and Read to understand:
- What kind of project this is (check package.json, requirements.txt, Cargo.toml, etc.)
- The directory structure and main source folders
- Any existing documentation (README.md, docs/)
- Test structure and testing frameworks used
- Configuration files that reveal architecture choices

### 2. Determine the project state

Based on your exploration, determine if this is:
- **A new/empty project**: Ask the user about their vision and intended architecture
- **An existing project**: Analyze the codebase to infer patterns, then confirm with the user

### 3. For existing projects, research:

- **Architecture**: Look for patterns like MVC, microservices, monolith, layered architecture
- **Tech stack**: Languages, frameworks, databases, deployment targets
- **Conventions**: File naming, code style (check for .eslintrc, .prettierrc, etc.)
- **Dependencies**: Check package files for key libraries
- **Testing**: Test frameworks, coverage tools, test organization

### 4. Populate the context files

Start with **product_context.md**:
- Ask: "What is the main purpose of this project?"
- Ask: "Who are the target users?"
- Ask: "What are the core features?"
- Document the technical stack you discovered

Then **system_patterns.md**:
- Document discovered patterns or ask about intended patterns
- Note coding conventions from config files or observed patterns
- Ask about testing strategy and coverage goals
- Ask about tool preferences (e.g., "I noticed you use [X], do you prefer that over [Y]?")

Finally, update **code_index.md**:
- Create a clear directory tree
- List key files with their purposes
- Note important functions/classes you find
- Document environment variables and configuration

### 5. Questions to ask the user

Based on what you find, ask specific questions like:
- "I see this is a [Next.js/Django/etc.] project. Is this a [web app/API/library]?"
- "I found [X pattern] in your code. Is this the standard approach for this project?"
- "Should new features follow the structure I see in [example module]?"
- "What's your preferred approach for [database access/API calls/state management]?"
- "Are there any non-obvious conventions the team follows?"

### Important: Be specific in your observations
Instead of "Tell me about your project", say things like:
- "I see you're using PostgreSQL with Prisma ORM. Are all database operations going through Prisma?"
- "I noticed both REST and GraphQL endpoints. Which is preferred for new features?"
- "Your tests are organized by feature rather than by type. Should I continue this pattern?"

Start by exploring the repository now, then share your findings with the user and ask clarifying questions to complete the context documentation.