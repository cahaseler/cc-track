import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { enrichPlanWithResearch, findNextTaskNumber } from '../hooks/capture-plan';
import { ClaudeMdHelpers, getActiveTaskId } from '../lib/claude-md';
import { GitHubHelpers } from '../lib/github-helpers';
import { createLogger } from '../lib/logger';

const logger = createLogger('create-task-from-issue');

/**
 * Create a task from a GitHub issue
 */
export const createTaskFromIssueCommand = new Command('task-from-issue')
  .description('Create a cc-track task from a GitHub issue')
  .argument('<issue>', 'GitHub issue number or URL')
  .option('--no-branch', 'Skip branch creation')
  .option('--no-research', 'Skip comprehensive research (create basic task only)')
  .action(async (issueIdentifier: string, options) => {
    try {
      const projectRoot = process.cwd();
      const claudeDir = join(projectRoot, '.claude');
      const tasksDir = join(claudeDir, 'tasks');

      // Ensure directories exist
      if (!existsSync(claudeDir)) {
        console.error('❌ Not a cc-track project. Run "cc-track init" first.');
        process.exit(1);
      }

      if (!existsSync(tasksDir)) {
        mkdirSync(tasksDir, { recursive: true });
      }

      // Initialize helpers
      const githubHelpers = new GitHubHelpers();
      const claudeMdHelpers = new ClaudeMdHelpers();

      // Fetch the issue
      console.log(`📥 Fetching issue ${issueIdentifier}...`);
      const issue = githubHelpers.getIssue(issueIdentifier, projectRoot);

      if (!issue) {
        console.error('❌ Failed to fetch issue. Make sure gh CLI is authenticated and the issue exists.');
        process.exit(1);
      }

      console.log(`✅ Found issue #${issue.number}: ${issue.title}`);

      // Check if issue is already open
      if (issue.state !== 'open') {
        console.warn(`⚠️  Issue #${issue.number} is ${issue.state}. Proceeding anyway...`);
      }

      // Check for active task
      const activeTaskId = getActiveTaskId(projectRoot);
      if (activeTaskId) {
        console.error(`❌ Task ${activeTaskId} is currently active. Complete it first with /complete-task`);
        process.exit(1);
      }

      // Find the next task number using fileOps
      const fileOps = { existsSync, readdirSync, mkdirSync, readFileSync, writeFileSync, unlinkSync };
      const nextNumber = findNextTaskNumber(tasksDir, fileOps);
      const taskId = String(nextNumber).padStart(3, '0');
      const taskPath = join(tasksDir, `TASK_${taskId}.md`);

      console.log(`📝 Creating task ${taskId}...`);

      // Create a plan-like structure from the issue
      const plan = `## ${issue.title}

### Context
GitHub Issue #${issue.number}: ${issue.url}

### Description
${issue.body || 'No description provided in issue.'}

### Requirements
Based on the issue description, implement the requested functionality following existing patterns in the codebase.`;

      // Perform comprehensive research if not disabled
      if (options.research !== false) {
        console.log('🔍 Researching codebase to enrich task...');
        const now = new Date();
        const success = await enrichPlanWithResearch(plan, taskId, now, projectRoot, { fileOps });

        if (!success) {
          console.error('❌ Failed to enrich task with research');
          process.exit(1);
        }
      } else {
        // Create basic task file without research
        const now = new Date();
        const basicTaskContent = `# Task ${taskId}: ${issue.title}

Status: active
Created: ${now.toISOString()}
GitHub Issue: #${issue.number} - ${issue.url}

## Summary

${issue.body || 'No description provided in issue.'}

## Requirements

- Implement functionality as described in GitHub issue #${issue.number}
- Follow existing patterns in the codebase
- Update tests and documentation as needed

## Technical Notes

_To be populated during implementation_

## Recent Progress

- Task created from GitHub issue #${issue.number}
`;
        writeFileSync(taskPath, basicTaskContent);
      }

      // Add GitHub metadata to task file
      let taskContent = readFileSync(taskPath, 'utf-8');
      if (!taskContent.includes('GitHub Issue:')) {
        // Insert GitHub issue reference after the status line
        taskContent = taskContent.replace(
          /Status: active/,
          `Status: active  \nGitHub Issue: #${issue.number} - ${issue.url}`,
        );
        writeFileSync(taskPath, taskContent);
      }

      // Commit task file to main branch
      console.log('💾 Committing task file...');
      const safeIssueNumber = String(issue.number).replace(/[^0-9]/g, '');
      execSync(
        `git add "${taskPath}" && git commit -m "feat: create TASK_${taskId} from GitHub issue #${safeIssueNumber}"`,
        {
          cwd: projectRoot,
        },
      );

      // Create issue branch if not disabled
      let branchName: string | null = null;
      if (options.branch !== false) {
        console.log('🌿 Creating issue branch...');
        branchName = githubHelpers.createIssueBranch(issue.number, projectRoot);

        if (branchName) {
          console.log(`✅ Switched to branch: ${branchName}`);

          // Update task file with branch info
          taskContent = readFileSync(taskPath, 'utf-8');
          taskContent += `\n<!-- issue_branch: ${branchName} -->`;
          writeFileSync(taskPath, taskContent);
        } else {
          console.warn('⚠️  Failed to create issue branch. Continuing on current branch.');
        }
      }

      // Update CLAUDE.md to set as active task
      claudeMdHelpers.setActiveTask(projectRoot, `TASK_${taskId}`);

      // Display the task file
      const finalContent = readFileSync(taskPath, 'utf-8');

      console.log(`\n${'='.repeat(80)}`);
      console.log(`✅ Task ${taskId} created successfully from issue #${issue.number}`);
      console.log(`${'='.repeat(80)}\n`);
      console.log(finalContent);
      console.log(`\n${'='.repeat(80)}`);

      if (branchName) {
        console.log(`\n🚅 Ready to work on branch: ${branchName}`);
      }
      console.log(`📋 Task ${taskId} is now active.`);
    } catch (error) {
      logger.error('Failed to create task from issue', { error });
      console.error('❌ Failed to create task:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
