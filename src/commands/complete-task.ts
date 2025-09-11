import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { createLogger } from '../lib/logger';
import { isGitRepository, getCurrentBranch, getTaskBranch } from '../lib/git-helpers';

const logger = createLogger('complete-task-command');

/**
 * Extract task ID from CLAUDE.md
 */
function getActiveTaskId(claudeMdPath: string): string | null {
  if (!existsSync(claudeMdPath)) {
    return null;
  }
  
  const content = readFileSync(claudeMdPath, 'utf-8');
  const match = content.match(/@\.claude\/tasks\/(TASK_(\d+)\.md)/);
  return match ? match[2] : null;
}

/**
 * Update task status in task file
 */
function updateTaskStatus(taskPath: string): void {
  if (!existsSync(taskPath)) {
    throw new Error(`Task file not found: ${taskPath}`);
  }
  
  let content = readFileSync(taskPath, 'utf-8');
  
  // Update status to completed
  content = content.replace(/\*\*Status:\*\* .*/, '**Status:** completed');
  
  // Add completion date if not present
  if (!content.includes('**Completed:**')) {
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].substring(0, 5);
    content = content.replace(
      /(\*\*Started:\*\* .*\n)/,
      `$1**Completed:** ${date} ${time}\n`
    );
  }
  
  writeFileSync(taskPath, content);
}

/**
 * Squash WIP commits
 */
async function squashWipCommits(taskId: string): Promise<void> {
  try {
    // Get the last non-WIP commit
    const lastNonWip = execSync(
      `git log --format="%H %s" | grep -v "\\[wip\\]" | head -1 | cut -d' ' -f1`,
      { encoding: 'utf-8' }
    ).trim();
    
    if (!lastNonWip) {
      logger.warn('No non-WIP commits found, skipping squash');
      return;
    }
    
    // Count WIP commits since then
    const wipCount = parseInt(
      execSync(
        `git log ${lastNonWip}..HEAD --format="%s" | grep -c "\\[wip\\]" || echo 0`,
        { encoding: 'utf-8' }
      ).trim(),
      10
    );
    
    if (wipCount === 0) {
      logger.info('No WIP commits to squash');
      return;
    }
    
    logger.info(`Squashing ${wipCount} WIP commits`);
    
    // Reset to the last non-WIP commit, keeping changes
    execSync(`git reset --soft ${lastNonWip}`);
    
    // Create final commit
    const message = `feat: complete TASK_${taskId}

Squashed ${wipCount} WIP commits into final task completion`;
    
    execSync(`git commit -m "${message}"`);
    logger.info('Created final commit');
    
  } catch (error) {
    logger.error('Failed to squash commits', { error });
    throw error;
  }
}

/**
 * Complete the active task
 */
export const completeTaskCommand = new Command('complete-task')
  .description('Mark the active task as completed')
  .option('--no-squash', 'skip squashing WIP commits')
  .option('--no-branch', 'skip branch operations')
  .option('-m, --message <message>', 'custom completion commit message')
  .action(async (options) => {
    try {
      const projectRoot = process.cwd();
      
      // Check if in git repo
      if (!isGitRepository(projectRoot)) {
        console.error('❌ Not in a git repository');
        process.exit(1);
      }
      
      // Get active task
      const claudeMdPath = join(projectRoot, 'CLAUDE.md');
      const taskId = getActiveTaskId(claudeMdPath);
      
      if (!taskId) {
        console.error('❌ No active task found in CLAUDE.md');
        process.exit(1);
      }
      
      const taskPath = join(projectRoot, `.claude/tasks/TASK_${taskId}.md`);
      logger.info(`Completing task ${taskId}`);
      
      // Update task status
      updateTaskStatus(taskPath);
      console.log(`✅ Updated task status to completed`);
      
      // Squash WIP commits if requested
      if (options.squash !== false) {
        await squashWipCommits(taskId);
        console.log(`✅ Squashed WIP commits`);
      }
      
      // Handle branch operations
      if (options.branch !== false) {
        const currentBranch = getCurrentBranch(projectRoot);
        const taskBranch = getTaskBranch(`TASK_${taskId}`, projectRoot);
        
        if (taskBranch && currentBranch === taskBranch) {
          // Switch back to main/master
          const mainBranch = existsSync(join(projectRoot, '.git/refs/heads/main')) ? 'main' : 'master';
          
          console.log(`Switching from ${taskBranch} to ${mainBranch}...`);
          execSync(`git checkout ${mainBranch}`, { cwd: projectRoot });
          
          // Optionally merge the task branch
          console.log(`Merging ${taskBranch} into ${mainBranch}...`);
          try {
            execSync(`git merge ${taskBranch} --no-ff -m "Merge ${taskBranch}"`, { cwd: projectRoot });
            console.log(`✅ Merged task branch`);
          } catch (error) {
            logger.warn('Merge failed, may need manual resolution', { error });
            console.log(`⚠️ Auto-merge failed. Manually merge with: git merge ${taskBranch}`);
          }
        }
      }
      
      // Update CLAUDE.md to point to no_active_task
      let claudeContent = readFileSync(claudeMdPath, 'utf-8');
      claudeContent = claudeContent.replace(
        /@\.claude\/tasks\/TASK_\d+\.md/,
        '@.claude/no_active_task.md'
      );
      writeFileSync(claudeMdPath, claudeContent);
      console.log(`✅ Updated CLAUDE.md`);
      
      // Add entry to progress log
      const progressPath = join(projectRoot, '.claude/progress_log.md');
      if (existsSync(progressPath)) {
        const date = new Date().toISOString().split('T')[0];
        const entry = `\n## [${date}] TASK_${taskId} Completed\n\nTask completed successfully.\n`;
        
        const progressContent = readFileSync(progressPath, 'utf-8');
        writeFileSync(progressPath, progressContent + entry);
        console.log(`✅ Updated progress log`);
      }
      
      // Final commit of task completion changes
      if (options.message) {
        execSync(`git add -A && git commit -m "${options.message}"`, { cwd: projectRoot });
      } else {
        execSync(`git add -A && git commit -m "docs: mark TASK_${taskId} as completed"`, { cwd: projectRoot });
      }
      
      console.log(`\n🎉 Task ${taskId} completed successfully!`);
      console.log('\nNext steps:');
      console.log('  1. Review the completed task file');
      console.log('  2. Push changes if working with remote');
      console.log('  3. Start a new task or take a break 🚅');
      
    } catch (error) {
      logger.error('Failed to complete task', { error });
      console.error('❌ Failed to complete task:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });