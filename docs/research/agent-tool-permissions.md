# Research: Claude Code Subagent Tool Permissions

**Date:** 2025-10-16
**Question:** Can Claude Code agents pre-approve tool permissions? Is there a way to specify which tools are pre-approved in agent definition files to avoid manual approval prompts?

## Summary

Claude Code allows you to specify tool permissions directly in agent markdown frontmatter using a `tools` field, and agents inherit the specified tools without additional approval prompts when invoked. However, there is no separate "pre-approval" mechanism—instead, Claude Code uses an allow/ask/deny permission hierarchy configured globally in settings files that applies to all sessions and agents. Agent-specific tool whitelisting prevents prompts by restricting tool availability rather than pre-approving them.

## Findings

### Option 1: Agent-Level Tool Whitelisting (Recommended)

**How it works:**
Agents are defined as Markdown files with YAML frontmatter. You can specify a `tools` field listing tools the agent is allowed to access. When the agent is invoked, it operates with only those tools—if a tool is not listed, it simply won't be available to the agent, avoiding approval prompts because the agent never attempts to use restricted tools.

**Syntax in agent markdown:**
```markdown
---
name: researcher-agent
description: Research and documentation specialist
tools: Read, Grep, Glob, WebFetch
model: sonnet
---

Your system prompt here...
```

**Pros:**
- Clean separation of concerns—each agent only has tools it needs
- No approval prompts for restricted tools (they're unavailable, not pending)
- Works with MCP tools when explicitly listed
- Prevents accidental tool usage outside agent's scope
- Portable per-agent configuration

**Cons:**
- Requires knowing upfront which tools each agent needs
- If agent truly needs a tool later, requires editing the agent definition
- Doesn't work for session-wide pre-approvals (only agent-specific)

**Code example:**
```markdown
---
name: code-reviewer
description: Reviews code for quality and safety issues
tools: Read, Grep, Bash(git diff:*), Bash(npm test:*)
model: opus
---

You are an expert code reviewer...
```

**Source:** Claude Code Subagents documentation (docs.claude.com/en/docs/claude-code/sub-agents)

### Option 2: Global Allow-List Configuration (For All Sessions)

**How it works:**
Configure an `allow` array in Claude Code settings files (`.claude/settings.json` or `~/.claude/settings.json`). Tools and tool patterns in the `allow` list execute without prompts. This applies globally across all agents in a project or for all projects (depending on where settings are placed).

**Syntax in settings.json:**
```json
{
  "allow": [
    "Read",
    "Grep",
    "Bash(npm run:*)",
    "Bash(git commit:*)",
    "Edit(.ts)"
  ],
  "ask": [
    "Bash(rm:*)"
  ],
  "deny": [
    "Bash(rm -rf)"
  ]
}
```

**Pros:**
- Applies to all agents and sessions automatically
- Uses pattern matching for flexible control (e.g., `Bash(git:*)` allows all git commands)
- Centralized configuration makes security audits easier
- Persists across sessions

**Cons:**
- Global scope means less fine-grained control per agent
- Pattern matching uses prefix matching, not regex (exact matching required for first part)
- Requires restarting Claude Code or sessions to take effect
- Can become complex with many rules
- Less portable if agents should work differently across teams

**Tool restriction patterns:**
- `ToolName` - Allows all uses
- `ToolName(*)` - Allows any argument (explicit form of above)
- `ToolName(pattern)` - Allows only commands/paths starting with pattern
- `Read(./src/*)` - Read any file in src directory
- `Bash(npm run:*)` - Only allow `npm run` commands
- `Bash(curl:*)` - Deny curl commands (when in deny list)

**Source:** Claude Code Settings documentation (docs.claude.com/en/docs/claude-code/settings)

### Option 3: CLI Flags for Session-Specific Pre-Approval

**How it works:**
Pass tool permissions via CLI flags when launching Claude Code. This pre-approves tools for a single session without modifying configuration files.

**Syntax:**
```bash
# Pre-approve specific tools for one session
claude-code --allowedTools "Read, Grep, Bash(git:*)"

# Dangerous: Skip all permission checks (use with caution)
claude-code --dangerously-skip-permissions
```

**Pros:**
- Session-specific without modifying files
- Useful for CI/CD or scripted automation
- No configuration file management needed

**Cons:**
- Requires command-line flag each time Claude Code launches
- Not persistent across sessions
- Easy to forget for interactive use
- Security risk if used with `--dangerously-skip-permissions`

**Source:** Claude Code CLI documentation

### Option 4: Permission Prompt Tool (Enterprise-Grade)

**How it works:**
Advanced option using `--permission-prompt-tool` to forward permission decisions to an external MCP tool. This allows custom approval logic (Slack approvals, risk scoring, time-of-day policies, etc.).

**Syntax:**
```bash
claude-code --permission-prompt-tool "your-approval-mcp-tool"
```

**Pros:**
- Maximum flexibility for complex approval workflows
- Can enforce enterprise policies
- Integrates with external approval systems
- No need to pre-define all rules

**Cons:**
- Requires building/configuring custom MCP tool
- Adds latency to permission decisions
- Complex setup
- Not suitable for most projects

**Source:** Claude Code permissions documentation

## Recommendation

**For most use cases, use Option 1 (Agent-Level Tool Whitelisting):**

The agent markdown `tools` field is the most practical approach because:
1. **Clear intent**: Each agent explicitly declares its capabilities
2. **No prompts**: Listed tools work immediately; unlisted tools simply aren't available
3. **Maintainable**: Tool requirements live with the agent definition
4. **Secure by default**: Agents can't accidentally access unauthorized tools
5. **Team-friendly**: Team members understand each agent's scope immediately

Combine with Option 2 (Global Allow-List) for commonly safe operations (read, grep, git status) that should always be available without prompts across all agents.

**Example integrated setup:**

`.claude/agents/researcher.md`:
```markdown
---
name: researcher
description: Researches topics and extracts information
tools: Read, Grep, Glob, WebFetch, mcp__webfetch__fetch
model: sonnet
---

You are a research specialist...
```

`.claude/settings.json`:
```json
{
  "allow": [
    "Read",
    "Grep",
    "Glob",
    "Bash(git log:*)",
    "Bash(git status)"
  ]
}
```

This gives the researcher agent its specific tools while pre-approving safe operations for all agents in the project.

## Implementation Notes

### Key Gotchas

1. **Tool List Inheritance**: If you omit the `tools` field entirely from an agent, it inherits ALL tools from the thread (including MCP tools). This is convenient but potentially unsafe—always be explicit.

2. **MCP Tools Need Listing**: To grant agent access to MCP tools, you must:
   - List the tool in agent's `tools` field (e.g., `mcp__webfetch__fetch`)
   - Ensure the MCP server is configured and running in Claude Code
   - Use the `/agents` command to see all available MCP tools

3. **Pattern Matching is Prefix-Based**: `Bash(npm run:*)` matches `npm run test` and `npm run build` but NOT `run npm test`. The pattern matches the beginning of the command.

4. **Permission Hierarchy** (highest to lowest):
   - Enterprise managed policies
   - CLI flags
   - Local project settings (`.claude/settings.local.json`)
   - Shared project settings (`.claude/settings.json`)
   - User settings (`~/.claude/settings.json`)

   This means you can override global settings locally for a specific project.

5. **No Approval Workflow Field**: There is NO frontmatter field like `approval-required: true` or `approval-email: someone@example.com`. Tool permissions are binary (allowed/denied), not approval-based.

6. **Settings Validation**: Use `.claude/settings.local.json` (git-ignored) for sensitive patterns or test configurations. Keep `.claude/settings.json` shared with the team.

### Setup Checklist

- [ ] Identify tools each agent actually needs (not just "nice to have")
- [ ] Add `tools` field to all agent markdown files
- [ ] Configure global `allow` list in `.claude/settings.json` for common safe operations
- [ ] Use `.claude/settings.local.json` for local overrides and testing
- [ ] Test agent execution to confirm no unexpected permission prompts
- [ ] Document tool requirements in agent descriptions
- [ ] Use `/agents` command to verify all agents see correct tools

## References

- [Claude Code Subagents - Official Docs](https://docs.claude.com/en/docs/claude-code/sub-agents)
- [Claude Code Settings - Official Docs](https://docs.claude.com/en/docs/claude-code/settings)
- [Best Practices for Claude Code Sub-Agents - PubNub Blog](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/)
- [Claude Code Permissions Documentation](https://docs.claude.com/en/docs/claude-code/permissions)
- [Permission Model in Claude Code - Skywork AI](https://skywork.ai/blog/permission-model-claude-code-vs-code-jetbrains-cli/)
