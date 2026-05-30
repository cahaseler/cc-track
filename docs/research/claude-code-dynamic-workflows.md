# Research: Claude Code Dynamic Workflows (and how they relate to Agent Teams)

**Date:** 2026-05-30
**Question:** What does the new Claude Code "dynamic workflows" system actually do, how does it differ from the earlier "agent teams" feature, and is it a prescriptive system or a programmable primitive we could build cc-track's orchestration on top of?

> ⚠️ **Currency note:** Dynamic workflows shipped 2026-05-28 alongside Opus 4.8, after the model's Jan 2026 knowledge cutoff. Everything below is sourced from Anthropic's docs/announcement and contemporaneous coverage (links at bottom), not prior knowledge. Re-verify against the live docs before building, since it's in **research preview** and the surface may move.

## Summary

A **dynamic workflow is a JavaScript orchestration script that Claude writes on the fly** from a natural-language request, which a **background runtime then executes**, spinning up many subagents in parallel and cross-checking their results before a single answer returns to the conversation. The defining shift, in Anthropic's own framing:

> "In standard Claude Code, Claude IS the orchestrator — making turn-by-turn decisions whose intermediate results accumulate in the context window. In Dynamic Workflows, a generated JavaScript script IS the orchestrator."

This means the feature is **a primitive, not a prescriptive method**. It does not dictate *how* you orchestrate; it gives you orchestration-as-code, and — critically — lets you **save a generated script as a reusable `/<name>` command** committed to the repo.

## How it works

- **Authoring:** Claude writes the JS script from your prompt. The orchestration logic — loops, branching, agent-count decisions, verification passes — lives in **script variables**, not the model's context window. Claude's context ends up holding only the final answer.
- **Execution:** A separate runtime runs the script in an **isolated environment, in the background**, so the session stays responsive. Runs are **resumable within the same session** (completed agents return cached results; the rest run live). Exiting Claude Code restarts the workflow fresh next session.
- **Verification built in:** Agents attack the problem from independent angles; a separate layer of agents **adversarially refutes** the findings; the run iterates until results converge before anything reaches the user. (`/deep-research` is the bundled example of this shape: fan out → cross-check → vote → filter unsupported claims.)
- **Scale & limits:** Up to **16 agents concurrent** (fewer on low-core machines), hard ceiling **1,000 agents per run**.
- **Security model:** The **workflow script itself has no filesystem or shell access** — only the subagents read/write/execute. Workflow-spawned subagents always run in **`acceptEdits`** mode and **inherit the session's tool allowlist**; file edits auto-approved. Non-allowlisted shell/web/MCP calls can still prompt mid-run.
- **Model routing:** Every agent uses the session model **unless the script routes a stage to a different model** — so per-stage model selection (e.g. Haiku for cheap stages) is supported.

## How you invoke / manage it

- **Per-prompt:** include the word `workflow` in a prompt → Claude writes & proposes one. (`alt+w` ignores the trigger; can be disabled in `/config`.)
- **Ultracode:** `/effort ultracode` = `xhigh` reasoning + automatic workflow orchestration; Claude decides per substantive task whether to spin one up. Session-scoped; resets on new session.
- **Bundled:** `/deep-research <question>`.
- **Saved/custom:** `/workflows` → select a run → press `s` → save script to `.claude/workflows/` (repo-shared) or `~/.claude/workflows/` (personal). It then runs as `/<name>`, like a command.
- **Approval:** CLI shows planned phases with Yes / "don't ask again for this workflow in this project" / View raw script (`Ctrl+G` opens in editor) / No. In **`claude -p` and the Agent SDK there is no prompt** — the run starts immediately under configured permission rules.
- **Monitoring:** `/workflows` opens a progress view — per-phase agent counts, token totals, elapsed time, drill into any agent's prompt/tool-calls/result; pause/resume/stop/restart agents.
- **Disable:** `/config` toggle, `"disableWorkflows": true` in settings, or `CLAUDE_CODE_DISABLE_WORKFLOWS=1`; org-wide via managed settings.

## Requirements / availability

- Claude Code **v2.1.154+**. Research preview.
- All paid plans; Anthropic API, Bedrock, Vertex AI, Microsoft Foundry. On Pro, enable via the Dynamic workflows row in `/config`. Available in CLI, Desktop, IDE extensions, headless `claude -p`, and Agent SDK.
- **Cost:** meaningfully more tokens than a normal session; a large Opus 4.8 run can move the bill by an order of magnitude.

## Dynamic Workflows vs. Agent Teams vs. Subagents

Anthropic's own "who holds the plan" framing is the cleanest axis:

| | Subagents | Agent Teams | Dynamic Workflows |
|---|---|---|---|
| **What it is** | A worker Claude spawns | Multiple coordinated full sessions w/ a lead | A script the runtime executes |
| **Who decides what runs next** | Claude, turn by turn | Lead + self-claiming teammates | The script |
| **Intermediate results live in** | Claude's context | Each session's context | Script variables |
| **Inter-agent comms** | None (report to caller) | **Peer-to-peer mailbox** + shared task list | Fan-out / fan-in + adversarial verification |
| **Coordination substrate** | Main agent | Shared task list w/ `blockedBy`, file-locked claiming | Generated JS orchestration script |
| **Scale** | A few per turn | ~3–5 teammates (coordination overhead) | Tens–hundreds (16 concurrent, 1,000 cap) |
| **Human role** | Delegates inside one convo | Steer/message/approve plans live | Approve, then mostly hands-off; monitor via `/workflows` |
| **Maturity** | GA | Experimental, off by default (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, v2.1.32+) | Research preview, v2.1.154+ |

One-liners:
- **Subagents** = delegated workers; only the result matters.
- **Agent teams** = a small, *communicating, human-steerable crew*; optimize for collaborative exploration.
- **Dynamic workflows** = a large, *autonomous, code-orchestrated swarm* with self-verification; optimize for scale + keeping orchestration state out of context.

## Two facts established for the cc-track integration question

1. **Plugins cannot (yet) bundle workflows.** The plugin component reference lists only: Skills, Agents, Hooks, MCP servers, LSP servers, Monitors, Themes. **No "workflows" component.** Saved workflows live in `.claude/workflows/` (project) or `~/.claude/workflows/` (user). → To ship one with a plugin, write it into the project's `.claude/workflows/` at setup time (the same mechanism `/setup-cc-track` uses for templates), or generate it from orchestration instructions at runtime.

2. **Whether a workflow script can spawn a *custom* `subagent_type` with its *narrowed* `tools` allowlist is NOT explicitly documented.** The docs strongly imply yes (subagents are called "the worker primitive workflows orchestrate," and agent-teams precedent confirms a subagent definition used as a teammate "honors that definition's `tools` allowlist and `model`"). But the only explicit workflow-page statement is that spawned agents *inherit the session allowlist* (a ceiling), not that the script can *narrow* per spawn. **This needs an empirical spike** (author a workflow, `View raw script`, confirm it targets `subagent_type` with restricted tools). See the brainstorm doc for why this matters less than it first appears.

## Sources

- [Orchestrate subagents at scale with dynamic workflows — Claude Code Docs](https://code.claude.com/docs/en/workflows)
- [Run agents in parallel (subagents vs agent view vs teams vs workflows) — Claude Code Docs](https://code.claude.com/docs/en/agents)
- [Create custom subagents — Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [Orchestrate teams of Claude Code sessions — Claude Code Docs](https://code.claude.com/docs/en/agent-teams)
- [Plugins reference — Claude Code Docs](https://code.claude.com/docs/en/plugins-reference)
- [Introducing dynamic workflows in Claude Code — Anthropic](https://claude.com/blog/introducing-dynamic-workflows-in-claude-code)
- [Claude Code Dynamic Workflows: Scripts Replace Context Windows — TechTimes](https://www.techtimes.com/articles/317363/20260529/claude-code-dynamic-workflows-scripts-replace-context-windows-ultracode-automates-orchestration.htm)
- [Anthropic releases Opus 4.8 with new 'dynamic workflow' tool — TechCrunch](https://techcrunch.com/2026/05/28/anthropic-releases-opus-4-8-with-new-dynamic-workflow-tool/)
