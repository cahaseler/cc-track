import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { CanUseTool, PermissionResult } from '@anthropic-ai/claude-code';
import { ClaudeMdHelpers } from '../lib/claude-md';
import { createMessageStream, findClaudeCodeExecutable } from '../lib/claude-sdk';
import { getGitHubConfig, isGitHubIntegrationEnabled, isHookEnabled } from '../lib/config';
import type { ClaudeSDKInterface } from '../lib/git-helpers';
import { GitHelpers } from '../lib/git-helpers';
import { GitHubHelpers } from '../lib/github-helpers';
import { createLogger } from '../lib/logger';
import type { GitHubIssue, HookInput, HookOutput } from '../types';

// Type for Claude Code SDK messages
interface SDKMessage {
  type: string;
  subtype?: string;
  message?: {
    content: Array<{ text?: string }>;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  total_cost_usd?: number;
}

export interface CapturePlanDependencies {
  execSync?: typeof execSync;
  fileOps?: {
    existsSync: typeof existsSync;
    mkdirSync: typeof mkdirSync;
    readdirSync: typeof readdirSync;
    readFileSync: typeof readFileSync;
    writeFileSync: typeof writeFileSync;
    unlinkSync: typeof unlinkSync;
  };
  gitHelpers?: GitHelpers;
  githubHelpers?: GitHubHelpers;
  claudeSDK?: ClaudeSDKInterface & {
    prompt: (
      text: string,
      model: 'haiku' | 'sonnet' | 'opus',
    ) => Promise<{ text: string; success: boolean; error?: string }>;
  };
  logger?: ReturnType<typeof createLogger>;
  debugLog?: (msg: string) => void;
  isHookEnabled?: typeof isHookEnabled;
  isGitHubIntegrationEnabled?: typeof isGitHubIntegrationEnabled;
  enrichPlanWithResearch?: typeof enrichPlanWithResearch;
}

/**
 * Find the next available task number
 */
export function findNextTaskNumber(tasksDir: string, fileOps: CapturePlanDependencies['fileOps']): number {
  const fs = fileOps || { existsSync, readdirSync };

  if (!fs.existsSync(tasksDir)) {
    return 1;
  }

  const files = fs.readdirSync(tasksDir);
  const taskNumbers = files
    .filter((f) => f.match(/^TASK_(\d{3})\.md$/))
    .map((f) => {
      const match = f.match(/^TASK_(\d{3})\.md$/);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter((n) => !Number.isNaN(n));

  if (taskNumbers.length > 0) {
    return Math.max(...taskNumbers) + 1;
  }

  return 1;
}

/**
 * Generate task enrichment prompt for research agent
 */
export function generateResearchPrompt(plan: string, taskId: string, now: Date, projectRoot: string): string {
  const taskFilePath = `.claude/tasks/TASK_${taskId}.md`;

  return `You are creating a comprehensive task file for a development project. Your goal is to research the codebase thoroughly and create a self-contained task document.

## The Plan:
${plan}

## Your Mission:

You have access to the entire codebase at: ${projectRoot}

You must create a comprehensive task file and write it to: ${taskFilePath}

IMPORTANT: Your job is to:

1. **Research the codebase thoroughly**:
   - Use Grep to find existing patterns and examples
   - Use Read to examine relevant files and understand current implementations
   - Use Glob to discover file structures and naming conventions
   - Look for similar features or patterns already in the codebase

2. **Identify and resolve all unknowns**:
   - Don't leave vague statements like "investigate X" or "determine Y"
   - Find specific file paths, function names, and patterns
   - Research existing conventions and follow them
   - Document exact technical steps based on actual code

3. **Write the complete task file**:
   - Use the Write tool to create ${taskFilePath}
   - Make it self-contained with ALL information needed to implement
   - Include specific code examples from your research
   - Reference exact files and line numbers where relevant

## Task File Template:

The file you write should follow this structure:

# [Task Title - extracted from the plan]

**Purpose:** [Clear description of what this task accomplishes]

**Status:** in_progress
**Started:** ${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}
**Task ID:** ${taskId}

## Requirements
[Extract all requirements from the plan as checkboxes - be specific!]
- [ ] Requirement 1 with specific details
- [ ] Requirement 2 with file paths
- [ ] etc.

## Success Criteria
[Define what "done" looks like with measurable outcomes]

## Technical Approach
[Detailed technical approach based on your research]
- Specific files that need modification (e.g., src/lib/foo.ts)
- Existing patterns to follow (with references)
- Exact implementation steps

## Implementation Details
[Based on your research, provide specific guidance]
- Code patterns found in [specific files]
- Naming conventions: [what you discovered]
- Integration points: [specific functions/modules]
- Dependencies: [what's already available]

## Current Focus
[What to work on first, with specific targets]
- Start with [specific file:line_number]
- Implement [specific function/feature]

## Research Findings
[Document your discoveries]
- Similar implementation found in [file:line_number]
- Pattern used throughout codebase: [description]
- Key files identified: [list with purposes]
- Conventions to follow: [specific examples]

## Next Steps
1. [Specific action with file reference]
2. [Next specific action]
3. [etc.]

## Open Questions & Blockers
[Only include if there are genuine unknowns that research couldn't resolve]

Remember:
- Research first, then write the file
- Be specific - no vague statements
- Include file paths and line numbers
- The task file should be a complete implementation guide

Write the complete task file to ${taskFilePath} when you're done researching.`;
}

/**
 * Enrich plan using Claude SDK with multi-turn research
 */
export async function enrichPlanWithResearch(
  plan: string,
  taskId: string,
  now: Date,
  projectRoot: string,
  deps: CapturePlanDependencies,
): Promise<boolean> {
  const logger = deps.logger || createLogger('capture_plan');
  const fileOps = deps.fileOps || {
    existsSync,
    readFileSync,
    writeFileSync,
  };

  const taskFilePath = join(projectRoot, '.claude', 'tasks', `TASK_${taskId}.md`);

  try {
    // Generate the research-focused prompt
    const prompt = generateResearchPrompt(plan, taskId, now, projectRoot);

    // Import Claude Code SDK for multi-turn capability
    const { query } = await import('@anthropic-ai/claude-code');

    // Use the shared function from claude-sdk.ts
    const pathToClaudeCodeExecutable = findClaudeCodeExecutable();

    logger.info('Starting comprehensive task research', {
      taskId,
      maxTurns: 20,
      timeoutMs: 600000,
    });

    // Create the multi-turn stream with research and write capabilities
    const stream = query({
      prompt: createMessageStream(prompt),
      options: {
        model: 'sonnet',
        maxTurns: 20,
        allowedTools: ['Read', 'Grep', 'Glob', 'Write'],
        disallowedTools: ['*'], // Only allow the specific tools above
        pathToClaudeCodeExecutable,
        cwd: projectRoot, // Allow research and writing in project directory
        canUseTool: (async (toolName, input, _options) => {
          // Only restrict Write tool to task directory
          if (toolName === 'Write') {
            const requestedPath = (input as { file_path: string }).file_path;
            // Resolve the path relative to the project root to handle both absolute and relative paths
            const filePath = resolve(projectRoot, requestedPath);
            const allowedDir = join(projectRoot, '.claude', 'tasks');

            if (!filePath.startsWith(allowedDir)) {
              logger.warn('Blocked Write attempt outside task directory', {
                toolName,
                attemptedPath: filePath,
                requestedPath,
                allowedDir,
              });
              return {
                behavior: 'deny',
                message: `Write access is restricted to ${allowedDir}. You can only write task files.`,
              } satisfies PermissionResult;
            }
          }

          // Allow all other configured tools
          return {
            behavior: 'allow',
            updatedInput: input,
          } satisfies PermissionResult;
        }) satisfies CanUseTool,
        stderr: (data: string) => {
          try {
            const s = typeof data === 'string' ? data : String(data);
            logger.debug('Claude Code stderr', { data: s.substring(0, 500) });
          } catch {
            // ignore
          }
        },
      },
    });

    let success = false;
    let error: string | undefined;
    let timedOut = false;

    // 10 minute timeout for comprehensive research
    const timeout = setTimeout(() => {
      timedOut = true;
      try {
        void (stream as AsyncGenerator<unknown, void>).return(undefined);
      } catch {
        // ignore
      }
    }, 600000);

    try {
      for await (const message of stream) {
        const msg = message as SDKMessage;

        if (msg.type === 'result') {
          if (msg.subtype === 'success' || msg.subtype === 'error_max_turns') {
            success = true;
            logger.info('Task research completed', {
              subtype: msg.subtype,
              inputTokens: msg.usage?.input_tokens,
              outputTokens: msg.usage?.output_tokens,
              costUSD: msg.total_cost_usd,
            });
          } else {
            error = `Task research failed: ${msg.subtype}`;
            logger.error('Task research failed', { subtype: msg.subtype });
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    if (timedOut) {
      logger.warn('Task research timed out after 10 minutes');
      // Check if a file was created even with timeout
      if (fileOps.existsSync(taskFilePath)) {
        logger.info('Task file was created before timeout');
        return true;
      }
      throw new Error('Task research timed out without creating task file');
    }

    if (!success) {
      throw new Error(error || 'Task research failed without specific error');
    }

    // Check if the task file was created
    if (!fileOps.existsSync(taskFilePath)) {
      throw new Error('Research agent completed but did not create task file');
    }

    logger.info('Task file created successfully', { path: taskFilePath });
    return true;
  } catch (cmdError) {
    logger.error('Task research failed', {
      error: cmdError instanceof Error ? cmdError.message : String(cmdError),
    });

    // Fallback to simple enrichment if research fails
    logger.info('Falling back to simple task enrichment');
    const simpleFallback = deps.claudeSDK || (await import('../lib/claude-sdk')).ClaudeSDK;
    const simplePrompt = `Based on the following plan, create a task file for TASK_${taskId}:

${plan}

Include sections for Purpose, Status (in_progress), Requirements (as checkboxes), Success Criteria, Technical Approach, Current Focus, and Next Steps.
Started: ${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}

Respond with ONLY the markdown content.`;

    const response = await simpleFallback.prompt(simplePrompt, 'sonnet');
    if (!response.success) {
      throw new Error(response.error || 'Fallback enrichment also failed');
    }

    // Write the fallback content to the file
    fileOps.writeFileSync(taskFilePath, response.text.trim());
    logger.info('Fallback task file created', { path: taskFilePath });
    return true;
  }
}

/**
 * Handle git branching for task
 */
export async function handleGitBranching(
  plan: string,
  taskId: string,
  projectRoot: string,
  deps: CapturePlanDependencies,
): Promise<string | null> {
  const exec = deps.execSync || execSync;
  const gitHelpers = deps.gitHelpers || new GitHelpers();
  const logger = deps.logger || createLogger('capture_plan');
  const checkEnabled = deps.isHookEnabled || isHookEnabled;

  if (!checkEnabled('git_branching')) {
    return null;
  }

  try {
    // Check if we're in a git repo
    exec('git rev-parse --git-dir', { cwd: projectRoot });

    // Commit any uncommitted work
    if (gitHelpers.hasUncommittedChanges(projectRoot)) {
      const diff = exec('git diff HEAD', { encoding: 'utf-8', cwd: projectRoot });
      const commitMsg = await gitHelpers.generateCommitMessage(diff, projectRoot);
      exec(`git add -A && git commit -m "${commitMsg}"`, { cwd: projectRoot });
      logger.info(`Committed uncommitted changes: ${commitMsg}`);
    }

    // Create and switch to task branch
    const branchName = await gitHelpers.generateBranchName(plan, taskId, projectRoot);
    gitHelpers.createTaskBranch(branchName, projectRoot);
    logger.info(`Created and switched to branch: ${branchName}`);

    return branchName;
  } catch (error) {
    logger.error('Git branching failed', { error });
    return null;
  }
}

/**
 * Handle GitHub integration for task
 */
export async function handleGitHubIntegration(
  taskContent: string,
  taskId: string,
  projectRoot: string,
  deps: CapturePlanDependencies,
): Promise<{ issue: GitHubIssue | null; infoString: string }> {
  const githubHelpers = deps.githubHelpers || new GitHubHelpers();
  const logger = deps.logger || createLogger('capture_plan');
  const checkGitHub = deps.isGitHubIntegrationEnabled || isGitHubIntegrationEnabled;

  if (!checkGitHub()) {
    return { issue: null, infoString: '' };
  }

  try {
    const githubConfig = getGitHubConfig();
    const validation = githubHelpers.validateGitHubIntegration(projectRoot);

    if (!validation.valid) {
      logger.warn('GitHub integration is enabled but validation failed', {
        errors: validation.errors,
      });
      return { issue: null, infoString: '' };
    }

    if (!githubConfig?.auto_create_issues) {
      return { issue: null, infoString: '' };
    }

    logger.info('Creating GitHub issue for task', { taskId });

    // Format task content for GitHub
    const { title, body } = githubHelpers.formatTaskForGitHub(taskContent);

    // Create GitHub issue
    const issue = githubHelpers.createGitHubIssue(title, body, projectRoot);

    if (!issue) {
      logger.error('Failed to create GitHub issue', { taskId });
      return { issue: null, infoString: '' };
    }

    logger.info('GitHub issue created successfully', {
      taskId,
      issueNumber: issue.number,
      issueUrl: issue.url,
    });

    // Build issue info string
    const githubIssueInfo = `\n\n<!-- github_issue: ${issue.number} -->\n<!-- github_url: ${issue.url} -->`;

    // Return both the issue object and info string
    // Branch creation will be handled in the main flow
    return { issue, infoString: githubIssueInfo };
  } catch (error) {
    logger.error('GitHub integration failed', { error, taskId });
    return { issue: null, infoString: '' };
  }
}

/**
 * Update CLAUDE.md to point to new task
 */
export function updateClaudeMd(projectRoot: string, taskId: string, fileOps: CapturePlanDependencies['fileOps']): void {
  // Use the centralized function with proper dependency injection
  const claudeMdHelpers = new ClaudeMdHelpers(fileOps);
  claudeMdHelpers.setActiveTask(projectRoot, `TASK_${taskId}`);
}

/**
 * Main capture plan hook function
 */
export async function capturePlanHook(input: HookInput, deps: CapturePlanDependencies = {}): Promise<HookOutput> {
  const checkEnabled = deps.isHookEnabled || isHookEnabled;
  const fileOps = deps.fileOps || {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
    unlinkSync,
  };
  const logger = deps.logger || createLogger('capture_plan');
  const debugLog = deps.debugLog || (() => {});

  debugLog('Hook starting');

  // Check if hook is enabled
  if (!checkEnabled('capture_plan')) {
    debugLog('Hook disabled');
    return { continue: true };
  }

  // Check if there's already an active task
  const projectRoot = input.cwd || process.cwd();
  const claudeMdHelpers = new ClaudeMdHelpers(fileOps);
  if (claudeMdHelpers.hasActiveTask(projectRoot)) {
    const activeTaskId = claudeMdHelpers.getActiveTaskId(projectRoot);
    logger.info('Active task detected, blocking new task creation', { activeTaskId });
    return {
      continue: true,
      systemMessage: `⚠️ There is already an active task: ${activeTaskId}\n\nPlease update the existing task file at .claude/tasks/${activeTaskId}.md with the new plan and requirements.\n\nIf this was intended to be a new task, please complete the current task first using /complete-task or clear the active task.`,
    };
  }

  debugLog(`Parsed input: ${input.hook_event_name}, tool: ${input.tool_name}`);

  logger.debug('Hook triggered', {
    session_id: input.session_id,
    hook_event: input.hook_event_name,
    tool_name: input.tool_name,
    has_tool_response: !!input.tool_response,
    tool_response: input.tool_response,
  });

  // PostToolUse hook - check if the plan was approved
  if (input.hook_event_name === 'PostToolUse') {
    debugLog(`PostToolUse detected, tool_response: ${JSON.stringify(input.tool_response)}`);
    // Check if the plan was approved (tool_response contains plan field when approved)
    const toolResponse = input.tool_response as { plan?: string } | undefined;
    if (!toolResponse?.plan) {
      // Plan was rejected or tool_response is malformed - don't create task
      debugLog('Plan not approved or missing plan field');
      logger.info('Plan was not approved, skipping task creation', {
        tool_response: input.tool_response,
      });
      return { continue: true };
    }
    debugLog('Plan approved (plan field present)');
    logger.info('Plan was approved, creating task');
  }

  const toolInput = input.tool_input as { plan?: string } | undefined;
  const plan = toolInput?.plan;
  if (!plan) {
    debugLog('No plan found in tool input');
    logger.warn('No plan found in tool input', { tool_input: input.tool_input });
    return { continue: true };
  }

  debugLog(`Plan found: ${plan.length} characters`);
  logger.debug('Plan content', { plan_length: plan.length, plan_preview: plan.substring(0, 200) });

  try {
    // Ensure directories exist (projectRoot already declared above for active task check)
    const claudeDir = join(projectRoot, '.claude');
    const plansDir = join(claudeDir, 'plans');
    const tasksDir = join(claudeDir, 'tasks');

    if (!fileOps.existsSync(plansDir)) {
      fileOps.mkdirSync(plansDir, { recursive: true });
    }
    if (!fileOps.existsSync(tasksDir)) {
      fileOps.mkdirSync(tasksDir, { recursive: true });
    }

    // Find the next task number
    const now = new Date();
    const nextNumber = findNextTaskNumber(tasksDir, fileOps);
    const taskId = String(nextNumber).padStart(3, '0');

    // Save raw plan to plans directory
    const planPath = join(plansDir, `${taskId}.md`);
    fileOps.writeFileSync(planPath, `# Plan: ${taskId}\n\nCaptured: ${now.toISOString()}\n\n${plan}`);

    // Use comprehensive research to enrich the plan and create task file
    const enrichFn = deps.enrichPlanWithResearch || enrichPlanWithResearch;
    const success = await enrichFn(plan, taskId, now, projectRoot, deps);

    if (!success) {
      throw new Error('Failed to create task file');
    }

    // Read the task file that was created
    const taskPath = join(tasksDir, `TASK_${taskId}.md`);
    let finalTaskContent = fileOps.readFileSync(taskPath, 'utf-8');

    // Handle GitHub integration first (create issue before branching)
    const githubResult = await handleGitHubIntegration(finalTaskContent, taskId, projectRoot, deps);
    finalTaskContent += githubResult.infoString;

    // Handle branching - either issue branch or regular git branch
    let branchName: string | null = null;
    const githubConfig = getGitHubConfig();

    if (githubResult.issue && githubConfig?.use_issue_branches) {
      // Create issue-linked branch using gh issue develop
      const githubHelpers = deps.githubHelpers || new GitHubHelpers();
      branchName = githubHelpers.createIssueBranch(githubResult.issue.number, projectRoot);
      if (branchName) {
        finalTaskContent += `\n<!-- issue_branch: ${branchName} -->`;
        logger.info(`Created and switched to issue branch: ${branchName}`);
      } else {
        // Fallback to regular git branching if gh issue develop fails
        logger.warn('Issue branch creation failed; falling back to regular git branching');
        branchName = await handleGitBranching(plan, taskId, projectRoot, deps);
        if (branchName) {
          finalTaskContent += `\n\n<!-- branch: ${branchName} -->`;
        }
      }
    } else {
      // Fall back to regular git branching if no issue or issue branches disabled
      branchName = await handleGitBranching(plan, taskId, projectRoot, deps);
      if (branchName) {
        finalTaskContent += `\n\n<!-- branch: ${branchName} -->`;
      }
    }

    // Update the task file with additional metadata (GitHub info, branch info)
    if (githubResult.infoString || branchName) {
      fileOps.writeFileSync(taskPath, finalTaskContent);
    }

    // Update CLAUDE.md to point to the new task
    updateClaudeMd(projectRoot, taskId, fileOps);

    // Read the final task content to show Claude
    const finalTaskPath = join(tasksDir, `TASK_${taskId}.md`);
    const displayContent = fileOps.readFileSync(finalTaskPath, 'utf-8');

    // Return success with the full task content
    return {
      continue: true,
      systemMessage: `✅ Plan captured as task ${taskId}. Task file created and set as active.

Here is the comprehensive task file that was created:

---

${displayContent}

---

The task has been thoroughly researched and documented. All implementation details, patterns, and specific file references have been included based on analysis of the codebase.`,
    };
  } catch (error) {
    debugLog(`Fatal error: ${error}`);
    logger.exception('Fatal error in capture_plan hook', error as Error);
    // Don't block on error
    return { continue: true };
  }
}
