# Research: Claude Code Plugin Agent Bundling

**Date:** 2025-10-16
**Question:** Can Claude Code plugins bundle custom subagents within the plugin itself? How are custom agents distributed and configured in the Claude Code plugin system?

## Summary

Yes, Claude Code plugins can fully bundle custom subagents as first-class components. Agents are defined as Markdown files with YAML frontmatter in an `agents/` directory within the plugin, then referenced in `plugin.json`. When users install the plugin, all bundled agents are automatically available without any manual setup. The system treats plugin agents identically to user-created agents, with automatic discovery and invocation based on task descriptions.

## Findings

### Option 1: Plugin-Bundled Agents via plugin.json Configuration

**How it works:**
- Create agent definitions as Markdown files in the plugin's `agents/` directory (default) or custom path
- Each agent is a `.md` file with YAML frontmatter containing `description` and optional `capabilities` fields, plus system prompt in the body
- Reference agents in `.claude-plugin/plugin.json` using the `"agents"` field (accepts string path or array of file paths)
- When plugin is installed via `/plugin install`, all agents become available automatically
- Claude Code discovers and invokes agents based on task descriptions matching agent capabilities

**Structure:**
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # Contains "agents" field
├── agents/                  # Default agent directory
│   ├── researcher.md
│   ├── code-reviewer.md
│   └── test-generator.md
├── commands/                # Optional: slash commands
├── hooks/                   # Optional: hook configurations
└── mcp-servers/            # Optional: MCP integrations
```

**plugin.json Configuration:**
```json
{
  "name": "cc-track",
  "version": "3.0.0",
  "agents": "./agents/",
  "commands": ["./commands/"],
  "hooks": "./config/hooks.json"
}
```

Or with specific file references:
```json
{
  "agents": [
    "./agents/researcher.md",
    "./agents/code-reviewer.md",
    "./agents/test-generator.md"
  ]
}
```

**Agent Definition Format:**
```yaml
---
description: When and why to use this agent
capabilities: ["research", "documentation", "analysis"]
---

# Agent Name

Your detailed system prompt goes here.

This agent specializes in:
- Task 1
- Task 2
- Task 3

When delegating to this agent, provide...
```

**Pros:**
- True first-class bundling - no workarounds needed
- Automatic discovery and invocation by Claude Code
- No manual user setup or file creation required
- Separate context window per agent prevents context pollution
- Agents appear in `/agents` command interface immediately
- Integrates seamlessly with tool inheritance and model selection
- Can be distributed via marketplace like any other plugin

**Cons:**
- Users cannot easily customize bundled agents without modifying plugin files
- Agents are static at install time - no runtime generation
- Limited to directory structure defined at plugin build time
- All agents loaded if agents directory specified (vs. individual file selection)

**Code example:**
Agent definition (`.claude-plugin/agents/researcher.md`):
```yaml
---
description: Researches topics and synthesizes findings with up-to-date web information
capabilities: ["research", "web-search", "synthesis", "documentation"]
---

# Research Agent

You are a specialized research agent focused on investigating technical questions and synthesizing findings into concise, actionable summaries.

## Your Purpose

When delegated research tasks, you:
1. Gather information from multiple authoritative sources (documentation, GitHub, blog posts)
2. Extract and synthesize relevant findings
3. Provide clear recommendations backed by evidence
4. Cite sources for verification

## Best Practices

- Focus on answering the specific question asked
- Don't go down rabbit holes on tangential topics
- Prefer concrete examples over abstract explanations
- Always note where information came from
```

Plugin manifest inclusion:
```json
{
  "name": "cc-track",
  "agents": "./agents/",
  "version": "3.0.0"
}
```

**Source:** Claude Code Plugins Reference (docs.claude.com), official Anthropic documentation

---

### Option 2: marketplace.json for Multi-Plugin Distribution

**How it works:**
- Create multiple plugin directories, each with their own agents
- Define all plugins in `.claude-plugin/marketplace.json` at repository root
- Users add marketplace: `/plugin marketplace add owner/repo`
- Users then browse and install individual plugins containing agents
- Each plugin loads only its agents, minimizing token usage

**Structure:**
```
my-plugins-repo/
├── .claude-plugin/
│   └── marketplace.json
├── plugins/
│   ├── research-toolkit/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   └── agents/
│   │       ├── researcher.md
│   │       └── analyst.md
│   ├── code-review-suite/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   └── agents/
│   │       ├── code-reviewer.md
│   │       └── security-checker.md
```

**marketplace.json format:**
```json
{
  "plugins": [
    {
      "name": "research-toolkit",
      "path": "./plugins/research-toolkit"
    },
    {
      "name": "code-review-suite",
      "path": "./plugins/code-review-suite"
    }
  ]
}
```

**Pros:**
- Modular organization - users install only what they need
- Each plugin is independently versioned and maintained
- Scales to large collections (85+ agents across 63 plugins demonstrated)
- Marketplace discovery mechanism built-in
- Lower token usage per session (granular plugin installation)
- Real-world proven pattern (Seth Hobson's 85-agent system)

**Cons:**
- More complex repository structure
- Requires marketplace.json maintenance
- Users must discover and install plugins individually
- Fragmentation across multiple plugin definitions

**Source:** Seth Hobson's agents repository (github.com/wshobson/agents), Claude Code Plugins Reference

---

### Option 3: Agents Directory + SessionStart Hook for Initialization

**How it works:**
- Bundle agents in plugin's `agents/` directory
- Use SessionStart hook to perform initialization (copy scripts, set environment variables, etc.)
- Hook can detect version changes and conditionally update resources
- Hook can output `additionalContext` to inject Claude's session context
- Agents are discovered automatically alongside hook initialization

**Agent Configuration (same as Option 1):**
```yaml
---
description: Task-specific description
capabilities: ["task1", "task2"]
---

System prompt content...
```

**SessionStart Hook Integration:**
```bash
#!/bin/bash
# .claude-plugin/hooks/session-start.sh

# Detect plugin version change
PLUGIN_VERSION=$(jq -r '.version' .claude-plugin/plugin.json)
STORED_VERSION=$(<"$CC_TRACK_SCRIPTS_ROOT/.version" 2>/dev/null || echo "")

if [[ "$PLUGIN_VERSION" != "$STORED_VERSION" ]]; then
  # Copy plugin scripts to well-known location
  cp -r ./agents/* ~/.local/share/cc-track/agents/
  echo "$PLUGIN_VERSION" > ~/.local/share/cc-track/agents/.version
fi

# Output JSON confirming initialization
cat << 'EOF'
{
  "continue": true,
  "hookSpecificOutput": {
    "additionalContext": "cc-track agents initialized at ~/.local/share/cc-track/agents/"
  }
}
EOF
```

**Pros:**
- Combines static agent bundling with dynamic initialization
- Can detect version changes and update agents conditionally
- Hook output can confirm to Claude that agents are ready
- Platform-specific path handling (Linux: ~/.local/share, Windows: %LOCALAPPDATA%)
- Enables caching and performance optimization

**Cons:**
- Adds hook complexity when agents alone would suffice
- Only needed if agents require dynamic setup or platform-specific paths
- Increases session startup time if doing extensive copying

**Source:** Spec 102 (Fix Plugin Script Execution), Claude Code Plugins Reference

---

## Real-World Examples

### Seth Hobson's Agent Repository (Community Example)

**Scale:** 85 agents across 63 plugins in 23 categories

**Organization:**
- Plugins stored in `./plugins/` directory
- Each plugin has its own agents and commands
- `.claude-plugin/marketplace.json` catalogs all plugins
- Installation: `/plugin marketplace add wshobson/agents`

**Popular plugins:**
- **code-documentation** - Documentation generation, code explanation, tutorials
- **debugging-toolkit** - Interactive debugging, error analysis, DX optimization
- **git-pr-workflows** - Git automation, PR enhancement, team onboarding

**Key insight:** "Each plugin loads only its specific agents and tools" - demonstrates that modular distribution is more efficient than monolithic collections.

**Source:** GitHub repository analysis

---

### Anthropic Official Examples

- PR review plugins with custom agents
- Security guidance agents
- Claude Agent SDK development agents
- Meta-plugins for creating new plugins

All follow the same directory structure and configuration pattern.

---

## Recommendation

**For cc-track, use Option 1 (Direct Plugin Bundling) with conditional SessionStart support:**

1. **Immediate implementation:** Bundle researcher and test-generator agents directly in `agents/` directory
2. **Configuration:** Add `"agents": "./agents/"` to plugin.json
3. **Optional future:** Add SessionStart hook only if you need platform-specific agent distribution or version-based updates

**Why this approach:**
- Researchers and test-generators are simple agents without platform-specific requirements
- Direct bundling means zero user setup - agents just work
- Agents immediately appear in `/agents` command interface
- No SessionStart complexity needed unless distribution complexity arises
- Users installing cc-track plugin automatically get these agents
- Follows proven pattern (Anthropic examples, Seth Hobson's system)

**For future scaling** (if cc-track agent collection grows beyond 10-15 agents):
- Migrate to marketplace.json structure with modular plugins
- Keep core agents (researcher, test-generator) in main plugin
- Offer specialized plugins for domain-specific agents (security, performance, documentation)
- Seth Hobson's 85-agent system demonstrates this scales well

---

## Implementation Notes

### Files Needed to Bundle Agents

1. **Agent definition files** (`.md` with YAML frontmatter):
   - `agents/researcher.md` - Already exists in cc-track, just needs to be moved/exposed
   - `agents/test-generator.md` - Already exists in cc-track, just needs to be moved/exposed
   - Any future domain-specific agents

2. **plugin.json update:**
   - Add `"agents": "./agents/"` field

3. **Directory structure:**
   - Ensure agents are at plugin root: `.claude-plugin/../agents/`
   - Or specify custom path relative to plugin.json location

### Limitations & Best Practices

1. **Discovery mechanism**: Claude Code uses task descriptions and agent `description`/`capabilities` fields to determine when to delegate - ensure descriptions clearly explain agent specialization

2. **Tool inheritance**: Agents inherit all tools by default unless you specify `tools: specific,list` in frontmatter

3. **Model selection**: Agents can specify `model: sonnet|opus|haiku|inherit` - defaults to `inherit` (uses main conversation model)

4. **Context windows**: Each agent has separate context - provide necessary context in system prompt, not relying on main conversation history

5. **Static at install time**: Agents are bound at installation - cannot be modified per-session without modifying agent files

6. **Directory conventions**: Use lowercase hyphenated names (`researcher-agent.md`, not `ResearcherAgent.md`)

7. **Capabilities taxonomy**: Use consistent capability naming across all agents for predictable delegation:
   - research, web-search, synthesis, documentation
   - testing, test-generation, quality-assurance
   - code-review, security-analysis, performance-analysis

### Migration Path for cc-track

If bundling into existing cc-track plugin:

```
.claude-plugin/
├── plugin.json                    # Add "agents" field
├── agents/                        # Create if not exists
│   ├── researcher.md              # Move from commands/scripts/ if needed
│   └── test-generator.md          # Move from commands/scripts/ if needed
├── commands/
├── hooks/
└── marketplace.json               # Optional: for future multi-plugin distribution
```

### Verification After Implementation

1. Install plugin: `/plugin install cc-track` (or through marketplace)
2. Check agents available: `/agents` command should list researcher and test-generator
3. Test delegation: Ask Claude to perform research task and verify researcher agent is invoked
4. Inspect context: Use Claude's internal agent awareness to confirm agent invocation

---

## References

- [Claude Code Plugins Documentation](https://docs.claude.com/en/docs/claude-code/plugins) - Official comprehensive guide
- [Claude Code Plugins Reference](https://docs.claude.com/en/docs/claude-code/plugins-reference) - Technical schema and configuration
- [Claude Code Subagents Documentation](https://docs.claude.com/en/docs/claude-code/sub-agents) - Detailed agent creation and configuration
- [ClaudeLog Custom Agents Guide](https://claudelog.com/mechanics/custom-agents/) - Practical patterns and best practices
- [Seth Hobson's Agents Repository](https://github.com/wshobson/agents) - Real-world 85-agent example with marketplace distribution
- [Claude Code Customize with Plugins](https://www.anthropic.com/news/claude-code-plugins) - Anthropic announcement and use cases
