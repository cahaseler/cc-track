# Research: Claude Code Plugin Agent Descriptions

**Date:** 2025-12-06
**Question:** How do Claude Code plugin agent descriptions work and why are they structured the way they are? What is the purpose of embedded examples with escaped newlines?

## Summary

Claude Code agent descriptions serve as **routing signals for automatic agent delegation** rather than just documentation. The description field tells Claude's language model when to invoke an agent, and embedding examples within descriptions helps the model understand the specific scenarios where that agent excels. Escaped newlines in descriptions are a YAML formatting necessity when including multi-line examples as single-line strings in frontmatter.

## Findings

### 1: Purpose of the Description Field

**What it does:**
The `description` field is the primary mechanism Claude Code uses to decide whether to automatically invoke a subagent. When you make a request, Claude Code:
1. Formats all available agent descriptions into text
2. Lets the language model read those descriptions
3. The model decides if your request matches an agent's purpose
4. If matched, the agent is automatically invoked

**Key insight:** This is pure LLM reasoning with no algorithmic routing, intent classification, keyword matching, or embeddings. Claude's language understanding of the description text is what determines agent selection.

**Source:** [Subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents), [ClaudeLog - Claude Code Custom Agents](https://claudelog.com/mechanics/custom-agents/)

---

### 2: Why Examples are Embedded in Descriptions

**Two purposes:**
1. **Help Claude understand agent scope** - Examples show the model what kinds of requests should trigger the agent
2. **Prevent overly broad delegation** - Without examples, Claude might invoke agents for tangentially related requests

**Example of good vs. poor description:**

Bad description (too vague):
```yaml
description: Code reviewer agent
```

Good description with examples:
```yaml
description: Use this agent when reviewing code changes in a pull request to identify silent failures, inadequate error handling, and inappropriate fallback behavior. This agent should be invoked proactively after completing a logical chunk of work that involves error handling, catch blocks, fallback logic, or any code that could potentially suppress errors.
```

The good version:
- Specifies the exact type of problem (silent failures, error handling)
- Explains when to invoke it (after error-handling work)
- Provides context for automatic delegation

**Source:** [Subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents), [Instructions for setting up Claude Code custom agents](https://gist.github.com/Danm72/314a7f79b27b1fe536a2fe4e30f57446)

---

### 3: How Escaped Newlines are Used

**The technical reason:**

YAML frontmatter requires string values on a single line unless you use special YAML syntax. When embedding examples that need newlines within the description, you have two options:

**Option A: Use YAML literal block scalar (`|`)**
```yaml
---
name: code-reviewer
description: |
  Use this agent when you need to review code changes.
  This includes checking for style violations,
  potential issues, and established patterns.

  Examples:
  - After writing new features
  - Before committing changes
  - When you want a second opinion
---
```

**Option B: Escape newlines as `\n` for single-line strings**
```yaml
---
name: code-reviewer
description: Use this agent when reviewing code changes...\n\n<example>\nContext: You've finished implementing a feature.\n</example>
---
```

**Why Anthropic uses Option B in their examples:**

Looking at the silent-failure-hunter description from the pr-review-toolkit:
```yaml
description: Use this agent when reviewing code changes in a pull request to identify silent failures, inadequate error handling, and inappropriate fallback behavior. This agent should be invoked proactively after completing a logical chunk of work that involves error handling, catch blocks, fallback logic, or any code that could potentially suppress errors. Examples:\n\n<example>\nContext: ...\n</example>
```

This suggests the `/agents` command may be generating descriptions as single-line strings when it saves them, then escaping the newlines. The literal block syntax (`|`) is cleaner in source, but escaped newlines make the YAML more compact.

**Source:** [Claude Agent Skills: A First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/), [YAML multiline strings documentation implied in Claude Code subagent issue #8501](https://github.com/anthropics/claude-code/issues/8501)

---

### 4: Structure of Embedded Examples in Descriptions

**Standard pattern from official Anthropic plugins:**

```xml
<example>
Context: [Situation description]
User request: "[What the user asks for]"
Assistant: "I'll use the [agent-name] agent to [specific action]"
<commentary>
[Explanation of why this agent is appropriate]
</commentary>
</example>
```

**Real example from silent-failure-hunter.md:**
```
Use this agent when reviewing code changes in a pull request to identify silent failures...

Examples:
<example>
Context: Daisy has just finished implementing a new feature that fetches data from an API with fallback behavior.
Daisy: "I've added error handling to the API client. Can you review it?"
Assistant: "Let me use the silent-failure-hunter agent to thoroughly examine the error handling in your changes."
<Task tool invocation to launch silent-failure-hunter agent>
</example>
```

**Purpose of examples in descriptions:**
- Show concrete scenarios where the agent is appropriate
- Demonstrate the trigger phrases Claude should recognize
- Help Claude understand when NOT to use the agent (by showing what other agents do)
- Serve as in-context learning for the model's routing decision

**Source:** Your initial context showing the actual silent-failure-hunter.md and code-reviewer.md descriptions

---

### 5: Best Practices from Anthropic

**Make descriptions action-oriented:**
- Include phrases like "Use PROACTIVELY" or "MUST BE USED"
- These nudge automatic delegation
- Example: "Use PROACTIVELY after writing or modifying code"

**Be specific about scope:**
Rather than: "Code review agent"
Use: "Expert code review specialist. Proactively reviews code for quality, security, and maintainability. Use immediately after writing or modifying code."

**Avoid vague descriptions:**
- Poor: "Debugging specialist"
- Better: "Debugging specialist for errors, test failures, and unexpected behavior. Use proactively when encountering any issues."

**Include multiple example contexts:**
The official guidance suggests 3 diverse examples showing different aspects:
1. Common use case
2. Complex scenario
3. Edge case or integration scenario

**Source:** [Subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents), [Task/Agent Tools - ClaudeLog](https://claudelog.com/mechanics/task-agent-tools/)

---

## How Claude Code Uses Descriptions for Routing

**The flow:**

1. **User makes request** - "Review my error handling in this PR"
2. **Claude Code formats agent list** - All available agents' descriptions become part of the system prompt
3. **Model reads descriptions** - Claude reads all descriptions as plain text
4. **Model matches request to agent** - Uses language understanding to find closest match
5. **Agent is invoked** - The matched agent gets full context and task-specific tools

**Two invocation modes:**

- **Automatic delegation** - User request implicitly matches agent description → agent invoked without explicit mention
- **Explicit invocation** - User explicitly names the agent: "Use the silent-failure-hunter agent"

Both work, but Anthropic emphasizes well-written descriptions for automatic mode to reduce friction.

**Source:** [Subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents), [Understanding Claude Code: Skills vs Commands vs Subagents vs Plugins](https://www.youngleaders.tech/p/claude-skills-commands-subagents-plugins)

---

## Key Technical Insights

### Why Descriptions Matter More Than Tool Lists

You might think agent routing would use:
- Available tools to filter agents
- Keywords to match requests
- Intent classification

Instead, Anthropic chose pure LLM reasoning on description text. This is more flexible because:
- Claude understands nuance ("find potential bugs" vs "optimize existing code")
- Descriptions can include examples showing edge cases
- One description can cover multiple trigger phrases
- The model learns context-dependent routing

### Why Not Embeddings?

Anthropic could use vector embeddings to route agents, but they explicitly chose NOT to. According to the documentation, the system "formats all available skills into a text description embedded in the Skill tool's prompt, and lets Claude's language model make the decision."

This choice trades some precision for:
- Transparency (you can see exactly how routing works)
- Simplicity (no embedding model needed)
- Flexibility (descriptions can be complex, contextual)

---

## Recommendation

For cc-track agents, follow these patterns:

1. **Use action-oriented descriptions** with "Use this agent when..." or "Use PROACTIVELY"
2. **Include specific domain indicators** - What problems does it solve?
3. **Embed 1-2 concrete examples** showing trigger scenarios
4. **Use YAML literal block syntax** (`|`) for readability:
   ```yaml
   description: |
     Use this agent when validating task completion...

     Examples:
     - After implementing a feature from tasks.md
     - Before running /prepare-completion
   ```
5. **Be specific about scope** - What is this agent's narrow specialty?

The PR Review Toolkit agents are the gold standard here - they each have laser-focused scope (error handling, test coverage, type design, etc.) with clear examples.

---

## References

- [Subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [ClaudeLog - Custom Agents Guide](https://claudelog.com/mechanics/custom-agents/)
- [Task/Agent Tools - ClaudeLog](https://claudelog.com/mechanics/task-agent-tools/)
- [Claude Agent Skills: A First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Understanding Claude Code: Skills vs Commands vs Subagents vs Plugins](https://www.youngleaders.tech/p/claude-skills-commands-subagents-plugins)
- [Instructions for setting up Claude Code custom agents (Gist)](https://gist.github.com/Danm72/314a7f79b27b1fe536a2fe4e30f57446)
- [Claude Code: Best practices for agentic coding](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
