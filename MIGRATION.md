# Migration Guide: npm Package → Claude Code Plugin

This guide helps you migrate from the npm-distributed version of cc-track (v2.x) to the Claude Code plugin version (v3.x).

## Overview

**Why migrate?**
- Simpler installation (no global npm package)
- Better integration with Claude Code's plugin system
- Automatic updates through Claude Code
- Direct TypeScript execution (faster, no compilation)
- Easier team collaboration (repository-scoped plugins)

**What changes?**
- Installation method: `npm install -g cc-track` → `/plugin install`
- Distribution: npm registry → GitHub marketplace
- Execution: Compiled binaries → Direct TypeScript via Bun

**What stays the same?**
- All `.claude/` project files (tasks, specs, context, config)
- All slash commands work identically
- All hook behavior unchanged
- Same features and functionality

---

## Prerequisites

Before starting:
- [ ] Claude Code with plugin support (October 2025+)
- [ ] [Bun runtime](https://bun.sh) installed (`curl -fsSL https://bun.sh/install | bash`)
- [ ] Git access to GitHub
- [ ] Backup of your `.claude/` directory (optional but recommended)

Check Bun installation:
```bash
bun --version
# Should show 1.0.0 or higher
```

---

## Step 1: Verify Current State

Check your current cc-track installation:

```bash
# Check if npm version is installed
which cc-track
# or
npm list -g cc-track --depth=0
```

If you see output, you have the npm version installed. Continue to Step 2.

**Important**: Your project's `.claude/` directory contains all your work (tasks, specs, context files, config). This migration DOES NOT modify these files - they stay exactly as they are.

---

## Step 2: Backup Your Work (Optional)

While the migration preserves all project files, you may want a backup for peace of mind:

```bash
# From your project root
cd your-project

# Create backup of .claude directory
tar -czf claude-backup-$(date +%Y%m%d).tar.gz .claude/

# Verify backup exists
ls -lh claude-backup-*.tar.gz
```

---

## Step 3: Uninstall npm Package

Remove the global npm package:

```bash
# Uninstall npm version
npm uninstall -g cc-track

# Verify removal
which cc-track
# Should show: cc-track not found
```

**Do not delete** your project's `.claude/` directory. The npm package and your project files are separate.

---

## Step 4: Add Plugin Marketplace

Add the cc-track marketplace to Claude Code:

```bash
# In Claude Code (terminal or VS Code)
/plugin marketplace add cahaseler/cc-track-marketplace
```

You should see confirmation that the marketplace was added.

---

## Step 5: Install Plugin

Install cc-track as a plugin:

```bash
/plugin install cc-track@cc-track-marketplace
```

Claude Code will download and install the plugin globally. This makes it available to all your projects.

---

## Step 6: Install Plugin Dependencies

The plugin requires dependencies to be installed in its directory:

```bash
# Find plugin directory
PLUGIN_DIR=$(dirname $(which claude-code))/../plugins/cc-track

# Install dependencies
cd "$PLUGIN_DIR"
bun install

# Verify installation
ls -la node_modules/@anthropic-ai/claude-agent-sdk
ls -la node_modules/ccusage
```

Both directories should exist after installation.

---

## Step 7: Verify Installation

Navigate to one of your existing cc-track projects:

```bash
cd your-project

# Start Claude Code
claude-code
```

In Claude Code, verify the plugin is working:

1. Check status line shows your task/branch (if configured)
2. Try a slash command: `/add-to-backlog "test migration"`
3. Check the backlog was updated: `cat .claude/backlog.md`

If all these work, migration is complete!

---

## Step 8: Migrate Additional Projects

For each additional project using cc-track:

1. Navigate to project: `cd /path/to/project`
2. Start Claude Code: `claude-code`
3. Your `.claude/` files are already compatible - no changes needed!

The plugin installation (Steps 4-6) was global - you only do it once. Each project automatically uses the plugin.

---

## Troubleshooting

### Error: "npm/plugin conflict detected"

**Symptom**: Plugin blocks activation with error about npm version.

**Cause**: The npm package is still installed globally.

**Fix**:
```bash
npm uninstall -g cc-track
# Verify removal
which cc-track  # Should show: not found
```

Restart Claude Code and try again.

---

### Error: "Plugin dependencies not installed"

**Symptom**: Commands fail with error about missing dependencies.

**Cause**: Plugin's `node_modules` directory is missing or incomplete.

**Fix**:
```bash
# Find plugin directory
PLUGIN_DIR=$(dirname $(which claude-code))/../plugins/cc-track

# Install dependencies
cd "$PLUGIN_DIR"
bun install

# Verify critical dependencies
ls -la node_modules/@anthropic-ai/claude-agent-sdk
ls -la node_modules/ccusage
```

---

### Error: "Bun runtime not found"

**Symptom**: Commands fail with error about Bun.

**Cause**: Bun is not installed or not in PATH.

**Fix**:
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Restart terminal to pick up PATH changes
# Verify installation
bun --version
```

---

### Slash commands don't work

**Symptom**: `/setup-cc-track`, `/complete-task`, etc. not found.

**Cause**: Plugin not enabled for the project.

**Fix**:

Check plugin is installed:
```bash
/plugin list
# Should show cc-track in the list
```

If not listed, repeat Steps 4-5 (add marketplace, install plugin).

---

### Hooks not triggering

**Symptom**: Edit validation or task validation not working.

**Cause**: Hooks not registered or feature disabled in config.

**Fix**:

1. Check `.claude/track.config.json`:
   ```json
   {
     "features": {
       "edit_validation": { "enabled": true },
       "pre_tool_validation": { "enabled": true }
     }
   }
   ```

2. Run `/config-track` to update configuration

3. Restart Claude Code

---

### Status line not updating

**Symptom**: Status line shows nothing or incorrect information.

**Cause**: Status line script path incorrect.

**Fix**:

1. Check Claude Code settings point to plugin directory:
   ```bash
   # Status line should use:
   bun run ${CLAUDE_PLUGIN_ROOT}/scripts/statusline.ts
   ```

2. Or reconfigure via `/setup-cc-track`

---

## Rollback (If Needed)

If you need to rollback to the npm version:

```bash
# Uninstall plugin
/plugin uninstall cc-track

# Reinstall npm version
npm install -g cc-track@2

# Verify
which cc-track
cc-track --version  # Should show 2.x
```

Your `.claude/` files work with both versions, so no project changes needed.

---

## FAQ

### Do I need to migrate all projects at once?

No. The plugin and npm package can coexist globally as long as you don't use them in the same project simultaneously. Migrate projects one at a time as convenient.

### What happens to my task files and specs?

Nothing. All `.claude/` files (tasks, specs, context, config, backlog, logs) stay exactly as they are. The plugin reads the same files the npm version did.

### Can team members use different versions?

Yes, but it's better for consistency if everyone uses the same version. The plugin version makes this easier - pin the plugin version in your repository settings.

### Do I need to update my slash commands?

No. Slash commands work identically. Behind the scenes they reference `${CLAUDE_PLUGIN_ROOT}` instead of `npx cc-track`, but you invoke them the same way (`/complete-task`, `/prepare-completion`, etc.).

### What about configuration files?

`.claude/track.config.json` works unchanged. The plugin reads the same configuration format as the npm version.

### Can I use npx with the plugin?

No. The plugin is not published to npm. Use Claude Code's `/plugin` commands for installation and updates.

### How do I update to newer plugin versions?

```bash
/plugin update cc-track
```

Claude Code handles the update automatically.

### Where are logs stored?

Same place: `~/.local/share/cc-track/logs/` (Linux/WSL), `~/Library/Logs/cc-track/` (macOS), or `%LOCALAPPDATA%\cc-track\logs\` (Windows).

### Does this affect my existing branches and commits?

No. Git operations work identically. Existing branches, commits, and PRs are unaffected.

---

## Getting Help

If you encounter issues not covered here:

1. Check the [plugin README](https://github.com/cahaseler/cc-track#readme)
2. Search [GitHub Issues](https://github.com/cahaseler/cc-track/issues)
3. Ask Claude for help - it can read this migration guide and assist you
4. Open a new issue with:
   - Your operating system
   - Claude Code version
   - Output of `bun --version`
   - Output of `/plugin list`
   - Error messages (if any)

---

## Migration Checklist

Use this checklist to track your progress:

- [ ] Prerequisites verified (Bun installed, Claude Code with plugin support)
- [ ] Current npm installation verified
- [ ] Backup created (optional)
- [ ] npm package uninstalled
- [ ] Marketplace added to Claude Code
- [ ] Plugin installed
- [ ] Plugin dependencies installed
- [ ] Installation verified (status line, slash commands work)
- [ ] Additional projects migrated (if applicable)

Welcome to cc-track v3! 🚅
