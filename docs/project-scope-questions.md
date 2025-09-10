# Claude Code Optimization Project - Scope Questions

## Core Functionality
1. What specific pain points have you hit working with me that we should prioritize addressing?

NOTE: Weird disclaimer to be writing, but please don't take any criticisms as a personal insult or complaint about *you*, we're fighting the limitations of modern LLMs and the limits of the Claude Code application, not your presented personality or effectiveness.

The below isn't from me, it's from the cc-sessions tool's readme, but it conveys the overall problem set fairly well, if humourously. To be honest it never gets quite this bad for me, but it's a good summary of the problems.

```
I'm going to guess how you got here and you can tell me if I get it right:

💭 The LLM programmer hype gave you a nerd chub
😬 The people hyping LLM programming made your nerd chub crawl back into your body
(are you ready to 'scale your impact', dog?)
🤮 You held your nose and downloaded Cursor/added Cline or Roo Code/npm installed Claude Code
At first this was obviously novel and interesting. Some things were shitty but mostly you were enjoying not having to write a context manager or even recognize that you needed one for your dumb client wrapper.

You were scaling your impact (whew).

But then Claude started doing some concerning things.

You asked it to add error handling to one function. It added error handling to every function in the file. And changed your error types. And your logging format. And somehow your indentation is different now?

The context window thing started getting annoying. You're explaining the same architecture for the fifth time today. Claude's like 'let me look for the database' Brother. We've been using Postgres for six hours. You were just in there.

Your CLAUDE.md is now longer than your actual code.

'NEVER use class components.'
'ALWAYS use the existing auth middleware.'
'DO NOT refactor unrelated code.'
'REMEMBER we use PostgreSQL.'
Claude reads the first line and then macrodoses window pane LSD for the rest.

You tried the subagents, but quickly realized that you can't even talk to these things. 10 minutes into a "code review" and the agent hits some kind of API error and returns to your main thread with no explanation of what it did or what it discovered.

Run it again, I guess?

This fucking sucks.

Now you're here. Your codebase is 'done' but you couldn't, in a million years, explain what that means or how it satisfies the definition.

There's three different global clients for the same database connection and two of them use hallucinated environment variables (the other just yeets your client secret into the service code).

You've got utility functions that are duplicated in four files because Claude kept forgetting they exist.

20% of your code lines are comments explaining why something isn't there and is somewhere else.

You don't even know exactly what's wrong and fixing it means understanding code you didn't write in patterns you don't recognize using approaches you wouldn't choose.

Are you scaling your impact yet?
```


2. Should this include both Claude-side prompts/instructions AND user-side tooling (hooks, scripts)?

Yes - hooks work by basically triggering scripts. Some of those scripts might be traditional code, some might involve invoking claude code via headless cli to do other tasks.
If nothing else, if we add hooks that interact with you and do specific behaviors, we should make sure your prompts provide you the right details about working with them.

Generally, the idea should be to impose rules and workflows via prompt, and then use hooks as guardrails to remind you to get back on track / follow the rules when you cross a line, rather than have the hooks triggerng regularly, especially if the hooks are slow/llm powered.

3. Any existing workflows or patterns from other projects you want to port over?

I've had moderate success with using some TDD guidelines along with the RITEway testing framework, these are prompt only and work until Claude forgets the rules.

I used a very tightly controlling hook based workflow called tdd-guard, which enforces TDD by reviewing test results on every edit, determining red/green/refactor status, and reviewing the actual edit attempts and only allowing them if they are an edit to the correct thing. This works great! But we ran into issues where the tdd-guard wouldn't have the right context needed from the test files, and also passing all of these decisions to claude code headless cli calls was adding 3-4 seconds to every edit. When it worked, this approach gave us essentially perfect accuracy on writing tested code exactly to spec, but was too prone to errors and too slow. This approach also means you're stuck with all the usual issues of TDD development and how unit testing can be a real struggle with certain kinds of web apps.

I've tried using the cc-sessions tool I shared some of the readme from above. It has interesting concepts, but I couldn't get it to work for me. I think it struggles a bit to do what it's attempting to do within the tools that claude code provides. We should definitely take on the best ideas from this.

## Context Management
4. What's your biggest context-related frustration - losing important details, redundant re-reading, or something else?

The context window forces a compact at 160k tokens of context, and the summary really struggles to preserve details, things like data types, database structures, even things like "were we hosting on postgres" or "use the mcp to interact with postgres, not psql" or details about utility functions that are available.

5. Should we build automatic context summarization or selective context inclusion?

I think a better approach to context summarization may help, with a focus on capturing things like I mentioned above in some kind of reference document.

cc-sessions also handles this by having an explictly task focused approach with a stage that involves gathering contextual information like this at the start of the task to pre-research critical context and make it available consistently.

6. How do you want to handle context across conversation restarts?

## Task Tracking
7. Beyond the TodoWrite tool, what tracking capabilities do you need?

I think file based task tracking is likely a good idea. We can modify the root CLAUDE.md to automatically pull in other files when it's read, that would let us automatically start a conversation with the currently active task context.

8. Should tasks persist between conversations or stay conversation-specific?

Persist, the idea is they'd live in markdown files.

9. Do you want automatic task generation from certain triggers?

Maybe, or probably more like we'd add prompts to claude to suggest that he create tasks as appropriately.

Note that when I say tasks, I'm talking larger scale efforts, not the short term todolist within a chat. Tasks likely map to PRs/issues.

Claude already has an extensive built in planning mode, we should build on this, not try to replace or fight it.

## Guardrails
10. What specific over-development patterns do you see me falling into?

You like to add features I didn't ask for. They're often useful, but I'd rather discuss them first, and when we have a plan I want you to stick to it exactly.

11. Should guardrails be enforced via hooks, prompts, or both?

Prompts should be clear about expectations and rules, hooks can enforce when possible.

12. Any specific code patterns or practices you want strictly enforced?

## Specifications
13. How should specs be captured and referenced during work?

planning mode, and then updating the plan when needed as we work.

14. Should we validate implementation against specs automatically?

I have an idea for a hook that triggers when Claude says the task is done in some way, and runs a subagent or task to actually review the work and see if it actually is done.

15. What format do you prefer for specs (markdown, JSON, something else)?

markdown makes the most sense.

## Integration
16. Should this integrate with your existing CLAUDE.md instructions or replace parts of it?

This will live in the project level CLAUDE code, and layer on top of my root level rules. The hope is I'd be able to relax my root level file since more would be taken care of in the project.

17. Any specific Claude Code features (hooks, settings) you want to leverage?

hooks, the ability to have Claude.md trigger automatic reading of other files

18. Should this work across all your projects or be project-specific?

Project specific setup, but it should be generic enough to work on any project I want to use it on.

## Technical Approach
19. Preference for implementation language (Python, TypeScript, Bash)?

Probably typescript and bun, compiled to executables for real world use.

20. Should this be a single tool or a collection of independent utilities?

Probably a collection of cli tools that are triggered by different hooks.

21. Any existing libraries or frameworks we should build on?

not really.

## Priority & Scope
22. What's the MVP - the minimum that would actually improve your workflow?
23. Any features that sound nice but aren't actually critical?
24. Timeline or urgency for getting initial version working?

Not sure yet. There will be some experimenting to see what works.
