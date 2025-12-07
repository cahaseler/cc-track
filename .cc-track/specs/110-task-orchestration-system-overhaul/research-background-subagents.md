# Background Subagents Research

## Executive Summary

Claude Code's Task tool now supports **background execution** via the `run_in_background` parameter. This allows the orchestrating agent to continue working while subagents execute, enabling true parallel workflows. We confirmed this feature works on 2025-12-07 by running 4 parallel research agents.

---

## 1. How Background Agents Work

### From the Task Tool Documentation

The Task tool accepts a `run_in_background` parameter:

```
run_in_background: Set to true to run this agent in the background.
Use AgentOutputTool to read the output later.
```

### Spawning a Background Agent

```typescript
Task tool:
  description: "Research topic X"
  prompt: "Your detailed prompt here..."
  subagent_type: "Explore"  // or other agent type
  run_in_background: true   // KEY: enables background execution
```

Returns immediately with an `agentId` for later retrieval.

### Checking Agent Status

Use `AgentOutputTool` with `block: false` for non-blocking status check:

```typescript
AgentOutputTool:
  agentId: "abc123"
  block: false  // Returns immediately with current status
```

Returns:
- `status: "completed"` - Agent finished, results available
- `status: "running"` - Agent still working (with progress if available)

### Retrieving Results

Use `AgentOutputTool` with `block: true` to wait for completion:

```typescript
AgentOutputTool:
  agentId: "abc123"
  block: true       // Waits for agent to complete
  wait_up_to: 150   // Max seconds to wait (default 150, max 300)
```

---

## 2. Confirmed Behavior (2025-12-07)

We tested this feature by spawning 4 parallel research agents:

```
Agent 1: Research Eric Elliot's aidd toolkit (Explore)
Agent 2: Research Jesse's Superpowers plugin (Explore)
Agent 3: Research Anthropic's feature-dev (Explore)
Agent 4: Research background subagents (cc-track:researcher)
```

**What we observed:**

1. All 4 agents launched simultaneously with separate `agentId` values
2. Main orchestrator continued responding to user while agents ran
3. `AgentOutputTool` with `block: false` returned status without waiting
4. Completed agents returned full results via `AgentOutputTool`
5. Agents wrote files to the filesystem as instructed
6. Total wall-clock time was roughly the longest single agent, not sum of all 4

---

## 3. Key Usage Patterns

### Pattern: Parallel Research/Exploration

```typescript
// Launch multiple explorers in parallel
const agents = [
  Task({ prompt: "Explore auth patterns", subagent_type: "Explore", run_in_background: true }),
  Task({ prompt: "Explore data model", subagent_type: "Explore", run_in_background: true }),
  Task({ prompt: "Explore API structure", subagent_type: "Explore", run_in_background: true }),
];

// Continue with other work...

// Later, collect results
for (const agentId of agentIds) {
  const result = AgentOutputTool({ agentId, block: true });
  // Process result
}
```

### Pattern: Work While Waiting

```typescript
// Launch background agent
const reviewAgent = Task({
  prompt: "Review the implementation",
  subagent_type: "code-reviewer",
  run_in_background: true
});

// Do other work while review runs
updateDocumentation();
runLintChecks();

// Now wait for review
const review = AgentOutputTool({ agentId: reviewAgent.id, block: true });
```

### Pattern: Check Progress Without Blocking

```typescript
// Launch long-running agent
const agent = Task({ prompt: "Complex task", run_in_background: true });

// Periodically check without blocking
while (true) {
  const status = AgentOutputTool({ agentId: agent.id, block: false });
  if (status.status === "completed") {
    break;
  }
  // Do other work or update user
  informUser("Still processing...");
}
```

---

## 4. Best Practices

### When to Use Background Agents

- **Parallel independent work** - Multiple agents with no dependencies
- **Long-running tasks** - Don't block orchestrator on slow operations
- **Research/exploration** - Gather information from multiple sources
- **Validation** - Run checks while continuing other work

### When NOT to Use Background Agents

- **Sequential dependencies** - When agent B needs agent A's output
- **Simple quick tasks** - Overhead not worth it for fast operations
- **User interaction needed** - Agent can't ask clarifying questions

### Coordination Tips

1. **Track agent IDs** - Keep a map of what each agent is doing
2. **Handle failures gracefully** - Background agents can fail; check status
3. **Don't over-parallelize** - More agents = more coordination overhead
4. **Collect results before proceeding** - Ensure all parallel work completes before dependent phases

---

## 5. Implications for cc-track Orchestration

### What This Enables

1. **Parallel phase execution** - Independent phases can truly run concurrently
2. **Non-blocking validation** - Validator can run while orchestrator queues next phase
3. **Efficient resource use** - Opus orchestrator stays light while Haiku agents do heavy lifting
4. **Faster overall execution** - Wall-clock time reduced for parallelizable work

### Integration Points

- `/cc-track:tasks` marks phases with `[P]` for parallel execution
- Orchestrator dispatches `[P]` phases as background agents
- Orchestrator continues with sequential work or waits at sync points
- Results collected before phases with dependencies begin

---

## 6. Limitations and Considerations

### Observed Limitations

- **No inter-agent communication** - Background agents can't talk to each other
- **File conflicts possible** - Parallel agents writing same file will conflict
- **Context isolation** - Each agent has fresh context (feature, not bug)

### Mitigations

- Ensure parallel phases touch different files
- Use dependency declarations to prevent conflicts
- Design phases to be truly independent when marked `[P]`

---

## Conclusion

Background subagents are **confirmed working** as of 2025-12-07. The feature enables true parallel execution via:

- `run_in_background: true` on Task tool
- `AgentOutputTool` with `block: false` for status checks
- `AgentOutputTool` with `block: true` to collect results

This is the foundation for cc-track's parallel phase execution in the orchestration overhaul.
