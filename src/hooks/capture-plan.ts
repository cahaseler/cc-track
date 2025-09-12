import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ClaudeMdHelpers } from '../lib/claude-md';
import { getGitHubConfig, isGitHubIntegrationEnabled, isHookEnabled } from '../lib/config';
import { GitHelpers } from '../lib/git-helpers';
import { GitHubHelpers } from '../lib/github-helpers';
import { createLogger } from '../lib/logger';
import type { HookInput, HookOutput } from '../types';

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
 * Enrich plan using Claude CLI
 */
export async function enrichPlanWithClaude(
  prompt: string,
  tempPromptPath: string,
  deps: CapturePlanDependencies,
): Promise<string> {
  const exec = deps.execSync || execSync;
  const fs = deps.fileOps || { writeFileSync, existsSync, unlinkSync };
  const logger = deps.logger || createLogger('capture_plan');

  // Write prompt to temp file to avoid shell escaping issues
  fs.writeFileSync(tempPromptPath, prompt);

  try {
    const taskContent = exec(`claude --model sonnet --output-format text < "${tempPromptPath}"`, {
      encoding: 'utf-8',
      cwd: '/tmp', // Run in /tmp to avoid triggering Stop hook recursion
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large responses
      shell: '/bin/bash',
    }).trim();

    return taskContent;
  } catch (cmdError) {
    logger.error('Claude CLI failed', {
      error: cmdError instanceof Error ? cmdError.message : String(cmdError),
      command: 'claude --model sonnet --output-format text',
      cwd: '/tmp',
    });
    throw cmdError;
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempPromptPath)) {
      fs.unlinkSync(tempPromptPath);
    }
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
  gitBranchingEnabled: boolean,
  deps: CapturePlanDependencies,
): Promise<string> {
  const githubHelpers = deps.githubHelpers || new GitHubHelpers();
  const logger = deps.logger || createLogger('capture_plan');
  const checkGitHub = deps.isGitHubIntegrationEnabled || isGitHubIntegrationEnabled;

  if (!checkGitHub()) {
    return '';
  }

  try {
    const githubConfig = getGitHubConfig();
    const validation = githubHelpers.validateGitHubIntegration(projectRoot);

    if (!validation.valid) {
      logger.warn('GitHub integration is enabled but validation failed', {
        errors: validation.errors,
      });
      return '';
    }

    if (!githubConfig?.auto_create_issues) {
      return '';
    }

    logger.info('Creating GitHub issue for task', { taskId });

    // Format task content for GitHub
    const { title, body } = githubHelpers.formatTaskForGitHub(taskContent);

    // Create GitHub issue
    const issue = githubHelpers.createGitHubIssue(title, body, projectRoot, ['task', 'cc-track']);

    if (!issue) {
      logger.error('Failed to create GitHub issue', { taskId });
      return '';
    }

    logger.info('GitHub issue created successfully', {
      taskId,
      issueNumber: issue.number,
      issueUrl: issue.url,
    });

    // Build issue info string
    let githubIssueInfo = `\n\n<!-- github_issue: ${issue.number} -->\n<!-- github_url: ${issue.url} -->`;

    // Create issue branch if enabled and not already using git branching
    if (githubConfig?.use_issue_branches && !gitBranchingEnabled) {
      const issueBranch = githubHelpers.createIssueBranch(issue.number, projectRoot);
      if (issueBranch) {
        githubIssueInfo += `\n<!-- issue_branch: ${issueBranch} -->`;
        logger.info(`Created and switched to issue branch: ${issueBranch}`);
      }
    }

    return githubIssueInfo;
  } catch (error) {
    logger.error('GitHub integration failed', { error, taskId });
    return '';
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

    // Use Claude CLI to enrich the plan
    const tempPromptPath = join(claudeDir, '.temp_prompt.txt');
    const taskContent = await enrichPlanWithClaude(enrichmentPrompt, tempPromptPath, deps);

    // Save the enriched task file in tasks directory
    const taskPath = join(tasksDir, `TASK_${taskId}.md`);
    let finalTaskContent = taskContent;

    // Handle git branching if enabled
    const branchName = await handleGitBranching(plan, taskId, projectRoot, deps);
    if (branchName) {
      finalTaskContent += `\n\n<!-- branch: ${branchName} -->`;
    }

    // Handle GitHub integration if enabled
    const githubIssueInfo = await handleGitHubIntegration(finalTaskContent, taskId, projectRoot, !!branchName, deps);
    finalTaskContent += githubIssueInfo;

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
