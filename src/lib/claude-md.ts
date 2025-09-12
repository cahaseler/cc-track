import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Get the path to CLAUDE.md file
 */
export function getClaudeMdPath(projectRoot: string): string {
  return join(projectRoot, 'CLAUDE.md');
}

/**
 * Get the active task file name from CLAUDE.md (e.g., "TASK_001.md")
 * Returns null if no active task or file doesn't exist
 */
export function getActiveTaskFile(projectRoot: string): string | null {
  const claudeMdPath = getClaudeMdPath(projectRoot);
  if (!existsSync(claudeMdPath)) {
    return null;
  }

  const content = readFileSync(claudeMdPath, 'utf-8');
  const taskMatch = content.match(/@\.claude\/tasks\/(TASK_\d+\.md)/);
  return taskMatch ? taskMatch[1] : null;
}

/**
 * Get the active task ID from CLAUDE.md (e.g., "TASK_001")
 * Returns null if no active task
 */
export function getActiveTaskId(projectRoot: string): string | null {
  const taskFile = getActiveTaskFile(projectRoot);
  if (!taskFile) {
    return null;
  }

  const match = taskFile.match(/TASK_(\d+)\.md/);
  return match ? `TASK_${match[1]}` : null;
}

/**
 * Get the full content of the active task file
 * Returns null if no active task or task file doesn't exist
 */
export function getActiveTaskContent(projectRoot: string): string | null {
  const taskFile = getActiveTaskFile(projectRoot);
  if (!taskFile) {
    return null;
  }

  const taskPath = join(projectRoot, '.claude', 'tasks', taskFile);
  if (!existsSync(taskPath)) {
    return null;
  }

  return readFileSync(taskPath, 'utf-8');
}

/**
 * Set the active task in CLAUDE.md
 * Replaces either no_active_task.md or an existing TASK_XXX.md
 */
export function setActiveTask(projectRoot: string, taskId: string): void {
  const claudeMdPath = getClaudeMdPath(projectRoot);
  if (!existsSync(claudeMdPath)) {
    return;
  }

  let content = readFileSync(claudeMdPath, 'utf-8');

  // Replace no_active_task.md or existing task
  if (content.includes('@.claude/no_active_task.md')) {
    content = content.replace('@.claude/no_active_task.md', `@.claude/tasks/${taskId}.md`);
  } else {
    content = content.replace(/@\.claude\/tasks\/TASK_\d+\.md/, `@.claude/tasks/${taskId}.md`);
  }

  writeFileSync(claudeMdPath, content);
}

/**
 * Clear the active task in CLAUDE.md (set to no_active_task.md)
 */
export function clearActiveTask(projectRoot: string): void {
  const claudeMdPath = getClaudeMdPath(projectRoot);
  if (!existsSync(claudeMdPath)) {
    return;
  }

  let content = readFileSync(claudeMdPath, 'utf-8');
  content = content.replace(/@\.claude\/tasks\/TASK_\d+\.md/, '@.claude/no_active_task.md');
  writeFileSync(claudeMdPath, content);
}

/**
 * Check if there's currently an active task
 */
export function hasActiveTask(projectRoot: string): boolean {
  const claudeMdPath = getClaudeMdPath(projectRoot);
  if (!existsSync(claudeMdPath)) {
    return false;
  }

  const content = readFileSync(claudeMdPath, 'utf-8');
  return content.includes('@.claude/tasks/TASK_') && !content.includes('@.claude/no_active_task.md');
}

/**
 * Get a human-readable task display string (e.g., "TASK_001: Setup Project")
 * Returns "No active task" if no task is active
 */
export function getActiveTaskDisplay(projectRoot: string): string {
  const taskId = getActiveTaskId(projectRoot);
  if (!taskId) {
    const claudeMdPath = getClaudeMdPath(projectRoot);
    if (existsSync(claudeMdPath)) {
      const content = readFileSync(claudeMdPath, 'utf-8');
      if (content.includes('@.claude/no_active_task.md')) {
        return 'No active task';
      }
    }
    return '';
  }

  // Try to get task title from the file content
  const taskContent = getActiveTaskContent(projectRoot);
  if (taskContent) {
    const titleMatch = taskContent.match(/^#\s+(.+?)(?:\s*\(TASK_\d+\))?\s*$/m);
    if (titleMatch) {
      const title = titleMatch[1].replace(/^TASK_\d+:\s*/, '').trim();
      return `${taskId}: ${title}`;
    }
  }

  return taskId;
}
