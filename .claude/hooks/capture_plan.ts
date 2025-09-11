#!/usr/bin/env bun

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getGitHubConfig, isGitHubIntegrationEnabled, isHookEnabled } from '../lib/config';
import { createTaskBranch, generateBranchName, generateCommitMessage, hasUncommittedChanges } from '../lib/git-helpers';
import {
  createGitHubIssue,
  createIssueBranch,
  formatTaskForGitHub,
  validateGitHubIntegration,
} from '../lib/github-helpers';
import { createLogger } from '../lib/logger';

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    plan: string;
  };
  tool_response?: {
    success?: boolean;
    plan?: string;
    [key: string]: unknown;
  };
}

interface HookOutput {
  continue?: boolean;
  suppressOutput?: boolean;
  systemMessage?: string;
}

async function main() {
  // Add emergency debug logging to diagnose logger issues
  const debugLog = (msg: string) => {
    try {
      const fs = require('node:fs');
      fs.appendFileSync('/tmp/capture_plan_debug.log', `${new Date().toISOString()} - ${msg}\n`);
    } catch (_e) {
      // Ignore debug log errors
    }
  };

  debugLog('Hook starting, creating logger...');
  const logger = createLogger('capture_plan');
  debugLog('Logger created, checking if enabled...');

  try {
    // Check if hook is enabled
    if (!isHookEnabled('capture_plan')) {
      debugLog('Hook disabled, exiting');
      // Silent exit
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }
    debugLog('Hook enabled, proceeding...');

    // Read input from stdin
    const input = await Bun.stdin.text();
    const data: HookInput = JSON.parse(input);
    debugLog(`Parsed input: ${data.hook_event_name}, tool: ${data.tool_name}`);

    debugLog('Calling logger.debug...');
    logger.debug('Hook triggered', {
      session_id: data.session_id,
      hook_event: data.hook_event_name,
      tool_name: data.tool_name,
      has_tool_response: !!data.tool_response,
      tool_response: data.tool_response,
    });
    debugLog('Logger.debug called successfully');

    // PostToolUse hook - check if the plan was approved
    if (data.hook_event_name === 'PostToolUse') {
      debugLog(`PostToolUse detected, tool_response: ${JSON.stringify(data.tool_response)}`);
      // Check if the plan was approved (tool_response contains plan field when approved)
      if (!data.tool_response?.plan) {
        // Plan was rejected or tool_response is malformed - don't create task
        debugLog('Plan not approved or missing plan field, calling logger.info...');
        logger.info('Plan was not approved, skipping task creation', {
          tool_response: data.tool_response,
        });
        debugLog('Logger.info called, exiting');
        process.exit(0);
      }
      debugLog('Plan approved (plan field present), calling logger.info...');
      logger.info('Plan was approved, creating task');
      debugLog('Logger.info for approval called');
    }

    const plan = data.tool_input.plan;
    if (!plan) {
      debugLog('No plan found in tool input');
      logger.warn('No plan found in tool input', { tool_input: data.tool_input });
      process.exit(0);
    }

    debugLog(`Plan found: ${plan.length} characters`);
    logger.debug('Plan content', { plan_length: plan.length, plan_preview: plan.substring(0, 200) });

    // Ensure directories exist
    const projectRoot = data.cwd;
    const claudeDir = join(projectRoot, '.claude');
    const plansDir = join(claudeDir, 'plans');
    const tasksDir = join(claudeDir, 'tasks');

    if (!existsSync(plansDir)) {
      mkdirSync(plansDir, { recursive: true });
    }
    if (!existsSync(tasksDir)) {
      mkdirSync(tasksDir, { recursive: true });
    }

    // Find the next task number
    const now = new Date();
    let nextNumber = 1;

    // Look for existing task files to find the highest number
    if (existsSync(tasksDir)) {
      const files = readdirSync(tasksDir);
      const taskNumbers = files
        .filter((f) => f.match(/^TASK_(\d{3})\.md$/))
        .map((f) => {
          const match = f.match(/^TASK_(\d{3})\.md$/);
          return match ? parseInt(match[1], 10) : NaN;
        })
        .filter((n) => !Number.isNaN(n));

      if (taskNumbers.length > 0) {
        nextNumber = Math.max(...taskNumbers) + 1;
      }
    }

    // Format as 3-digit padded number
    const taskId = String(nextNumber).padStart(3, '0');

    // Save raw plan to plans directory
    const planPath = join(plansDir, `${taskId}.md`);
    writeFileSync(planPath, `# Plan: ${taskId}\n\nCaptured: ${now.toISOString()}\n\n${plan}`);

    // Create prompt for Claude to generate the task file
    const enrichmentPrompt = `
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

    // Use Claude CLI to enrich the plan
    // Write prompt to temp file to avoid shell escaping issues
    const tempPromptPath = join(claudeDir, '.temp_prompt.txt');
    writeFileSync(tempPromptPath, enrichmentPrompt);

    let taskContent: string;
    try {
      taskContent = execSync(`claude --model sonnet --output-format text < "${tempPromptPath}"`, {
        encoding: 'utf-8',
        cwd: '/tmp', // Run in /tmp to avoid triggering Stop hook recursion
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large responses
        shell: '/bin/bash',
      }).trim();
    } catch (cmdError) {
      logger.error('Claude CLI failed', {
        error: cmdError instanceof Error ? cmdError.message : String(cmdError),
        command: 'claude --model sonnet --output-format text',
        cwd: '/tmp',
      });
      throw cmdError;
    } finally {
      // Clean up temp file
      if (existsSync(tempPromptPath)) {
        unlinkSync(tempPromptPath);
      }
    }

    // Save the enriched task file in tasks directory
    const taskPath = join(tasksDir, `TASK_${taskId}.md`);
    let finalTaskContent = taskContent;

    // Handle git branching if enabled
    if (isHookEnabled('git_branching')) {
      try {
        // Check if we're in a git repo
        execSync('git rev-parse --git-dir', { cwd: projectRoot });

        // Commit any uncommitted work
        if (hasUncommittedChanges(projectRoot)) {
          const diff = execSync('git diff HEAD', { encoding: 'utf-8', cwd: projectRoot });
          const commitMsg = await generateCommitMessage(diff, projectRoot);
          execSync(`git add -A && git commit -m "${commitMsg}"`, { cwd: projectRoot });
          console.error(`Committed uncommitted changes: ${commitMsg}`);
        }

        // Create and switch to task branch
        const branchName = await generateBranchName(plan, taskId, projectRoot);
        createTaskBranch(branchName, projectRoot);

        // Store branch name in task file for later reference
        finalTaskContent += `\n\n<!-- branch: ${branchName} -->`;
        console.error(`Created and switched to branch: ${branchName}`);
      } catch (error) {
        console.error('Git branching failed (not a git repo or other error):', error);
        // Continue without branching
      }
    }

    // Handle GitHub integration if enabled
    let githubIssueInfo = '';
    if (isGitHubIntegrationEnabled()) {
      try {
        const githubConfig = getGitHubConfig();
        const validation = validateGitHubIntegration(projectRoot);

        if (!validation.valid) {
          logger.warn('GitHub integration is enabled but validation failed', {
            errors: validation.errors,
          });
          console.error(`⚠️  GitHub integration skipped: ${validation.errors.join(', ')}`);
        } else if (githubConfig?.auto_create_issues) {
          logger.info('Creating GitHub issue for task', { taskId });

          // Format task content for GitHub
          const { title, body } = formatTaskForGitHub(finalTaskContent);

          // Create GitHub issue
          const issue = createGitHubIssue(title, body, projectRoot, ['task', 'cc-track']);

          if (issue) {
            logger.info('GitHub issue created successfully', {
              taskId,
              issueNumber: issue.number,
              issueUrl: issue.url,
            });

            // Add issue info to task file
            githubIssueInfo = `\n\n<!-- github_issue: ${issue.number} -->\n<!-- github_url: ${issue.url} -->`;
            console.error(`Created GitHub issue #${issue.number}: ${issue.url}`);

            // Create issue branch if enabled and not already using git branching
            if (githubConfig?.use_issue_branches && !isHookEnabled('git_branching')) {
              const issueBranch = createIssueBranch(issue.number, projectRoot);
              if (issueBranch) {
                githubIssueInfo += `\n<!-- issue_branch: ${issueBranch} -->`;
                console.error(`Created and switched to issue branch: ${issueBranch}`);
              }
            }
          } else {
            logger.error('Failed to create GitHub issue', { taskId });
            console.error('❌ Failed to create GitHub issue');
          }
        }
      } catch (error) {
        logger.error('GitHub integration failed', { error, taskId });
        console.error(`❌ GitHub integration failed: ${error}`);
      }
    }

    // Add GitHub info to final task content if any
    finalTaskContent += githubIssueInfo;
    writeFileSync(taskPath, finalTaskContent);

    // Update CLAUDE.md to point to the new task
    const claudeMdPath = join(projectRoot, 'CLAUDE.md');
    if (existsSync(claudeMdPath)) {
      let claudeMd = readFileSync(claudeMdPath, 'utf-8');

      // Replace the active task import
      if (claudeMd.includes('@.claude/no_active_task.md')) {
        claudeMd = claudeMd.replace('@.claude/no_active_task.md', `@.claude/tasks/TASK_${taskId}.md`);
      } else if (claudeMd.match(/@\.claude\/tasks\/TASK_.*?\.md/)) {
        // Replace existing task
        claudeMd = claudeMd.replace(/@\.claude\/tasks\/TASK_.*?\.md/, `@.claude/tasks/TASK_${taskId}.md`);
      }

      writeFileSync(claudeMdPath, claudeMd);
    }

    // No longer logging task creation to progress log - it's just noise
    // Task files themselves track when tasks are created

    // Return success with a message
    const output: HookOutput = {
      continue: true,
      systemMessage: `✅ Plan captured as task ${taskId}. Task file created and set as active.`,
    };

    console.log(JSON.stringify(output));
    process.exit(0);
  } catch (error) {
    debugLog(`Fatal error: ${error}`);
    logger.exception('Fatal error in capture_plan hook', error as Error);
    // Don't block on error
    process.exit(0);
  }
}

main();
