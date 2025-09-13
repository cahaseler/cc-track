import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ClaudeMdHelpers } from '../lib/claude-md';
import { getGitHubConfig, isGitHubIntegrationEnabled, isHookEnabled } from '../lib/config';
import type { ClaudeSDKInterface } from '../lib/git-helpers';
import { GitHelpers } from '../lib/git-helpers';
import { GitHubHelpers } from '../lib/github-helpers';
import { createLogger } from '../lib/logger';
import type { GitHubIssue, HookInput, HookOutput } from '../types';

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
 * Generate task enrichment prompt
 */
export function generateEnrichmentPrompt(plan: string, taskId: string, now: Date): string {
  return `
Based on the following plan, create a comprehensive task file following the active_task template format.

## The Plan:
${plan}

## Instructions:
1. Extract the task name/title from the plan
2. Set status to "planning"
3. List all requirements as checkboxes
4. Define clear success criteria
5. Identify next steps
6. Note any potential blockers or questions

Create the content for TASK_${taskId}.md following this structure:

# [Task Title]

**Purpose:** [Clear description of what this task accomplishes]

**Status:** planning
**Started:** ${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}
**Task ID:** ${taskId}

## Requirements
[Extract all requirements from the plan as checkboxes]

## Success Criteria
[Define what "done" looks like]

## Technical Approach
[Summary of the technical approach from the plan]

## Current Focus
[What to work on first]

## Open Questions & Blockers
[Any unknowns or blockers]

## Next Steps
[Clear next actions]

Respond with ONLY the markdown content for the task file, no explanations.`;
}

/**
 * Enrich plan using Claude SDK
 */
export async function enrichPlanWithClaude(prompt: string, deps: CapturePlanDependencies): Promise<string> {
  const logger = deps.logger || createLogger('capture_plan');
  const claudeSDK = deps.claudeSDK || (await import('../lib/claude-sdk')).ClaudeSDK;

  try {
    // Use SDK instead of CLI - no temp files or /tmp hack needed!
    const response = await claudeSDK.prompt(prompt, 'sonnet');

    if (!response.success) {
      throw new Error(response.error || 'SDK call failed');
    }

    return response.text.trim();
  } catch (cmdError) {
    logger.error('Claude SDK failed', {
      error: cmdError instanceof Error ? cmdError.message : String(cmdError),
    });
    throw cmdError;
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
    // Ensure directories exist
    const projectRoot = input.cwd || process.cwd();
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

    // Generate enrichment prompt
    const enrichmentPrompt = generateEnrichmentPrompt(plan, taskId, now);

    // Use Claude SDK to enrich the plan
    const taskContent = await enrichPlanWithClaude(enrichmentPrompt, deps);

    // Save the enriched task file in tasks directory
    const taskPath = join(tasksDir, `TASK_${taskId}.md`);
    let finalTaskContent = taskContent;

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

    // Write final task file
    fileOps.writeFileSync(taskPath, finalTaskContent);

    // Update CLAUDE.md to point to the new task
    updateClaudeMd(projectRoot, taskId, fileOps);

    // Return success with a message
    return {
      continue: true,
      systemMessage: `✅ Plan captured as task ${taskId}. Task file created and set as active.`,
    };
  } catch (error) {
    debugLog(`Fatal error: ${error}`);
    logger.exception('Fatal error in capture_plan hook', error as Error);
    // Don't block on error
    return { continue: true };
  }
}
