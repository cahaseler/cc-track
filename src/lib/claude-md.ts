import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Interface for dependency injection
export interface FileOps {
  existsSync: typeof existsSync;
  readFileSync: typeof readFileSync;
  writeFileSync: typeof writeFileSync;
}

const defaultFileOps: FileOps = {
  existsSync,
  readFileSync,
  writeFileSync,
};

export class ClaudeMdHelpers {
  private fileOps: FileOps;

  constructor(fileOps?: FileOps) {
    this.fileOps = fileOps || defaultFileOps;
  }

  /**
   * Get the path to CLAUDE.md file
   */
  getClaudeMdPath(projectRoot: string): string {
    return join(projectRoot, 'CLAUDE.md');
  }

  /**
   * Get the active task file name from CLAUDE.md (e.g., "TASK_001.md")
   * Returns null if no active task or file doesn't exist
   */
  getActiveTaskFile(projectRoot: string): string | null {
    const claudeMdPath = this.getClaudeMdPath(projectRoot);
    if (!this.fileOps.existsSync(claudeMdPath)) {
      return null;
    }

    const content = this.fileOps.readFileSync(claudeMdPath, 'utf-8');
    const taskMatch = content.match(/@\.claude\/tasks\/(TASK_\d+\.md)/);
    return taskMatch ? taskMatch[1] : null;
  }

  /**
   * Get the active task ID from CLAUDE.md (e.g., "TASK_001")
   * Returns null if no active task
   */
  getActiveTaskId(projectRoot: string): string | null {
    const taskFile = this.getActiveTaskFile(projectRoot);
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
  getActiveTaskContent(projectRoot: string): string | null {
    const taskFile = this.getActiveTaskFile(projectRoot);
    if (!taskFile) {
      return null;
    }

    const taskPath = join(projectRoot, '.claude', 'tasks', taskFile);
    if (!this.fileOps.existsSync(taskPath)) {
      return null;
    }

    return this.fileOps.readFileSync(taskPath, 'utf-8');
  }

  /**
   * Set the active task in CLAUDE.md
   * Replaces either no_active_task.md or an existing TASK_XXX.md
   */
  setActiveTask(projectRoot: string, taskId: string): void {
    const claudeMdPath = this.getClaudeMdPath(projectRoot);
    if (!this.fileOps.existsSync(claudeMdPath)) {
      return;
    }

    let content = this.fileOps.readFileSync(claudeMdPath, 'utf-8');

    // Replace no_active_task.md or existing task
    if (content.includes('@.claude/no_active_task.md')) {
      content = content.replace('@.claude/no_active_task.md', `@.claude/tasks/${taskId}.md`);
    } else {
      content = content.replace(/@\.claude\/tasks\/TASK_\d+\.md/, `@.claude/tasks/${taskId}.md`);
    }

    this.fileOps.writeFileSync(claudeMdPath, content);
  }

  /**
   * Clear the active task in CLAUDE.md (set to no_active_task.md)
   */
  clearActiveTask(projectRoot: string): void {
    const claudeMdPath = this.getClaudeMdPath(projectRoot);
    if (!this.fileOps.existsSync(claudeMdPath)) {
      return;
    }

    let content = this.fileOps.readFileSync(claudeMdPath, 'utf-8');
    content = content.replace(/@\.claude\/tasks\/TASK_\d+\.md/, '@.claude/no_active_task.md');
    this.fileOps.writeFileSync(claudeMdPath, content);
  }

  /**
   * Check if there's currently an active task
   */
  hasActiveTask(projectRoot: string): boolean {
    const claudeMdPath = this.getClaudeMdPath(projectRoot);
    if (!this.fileOps.existsSync(claudeMdPath)) {
      return false;
    }

    const content = this.fileOps.readFileSync(claudeMdPath, 'utf-8');
    return content.includes('@.claude/tasks/TASK_') && !content.includes('@.claude/no_active_task.md');
  }

  /**
   * Get a human-readable task display string (e.g., "TASK_001: Setup Project")
   * Returns "No active task" if no task is active
   */
  getActiveTaskDisplay(projectRoot: string): string {
    const taskId = this.getActiveTaskId(projectRoot);
    if (!taskId) {
      const claudeMdPath = this.getClaudeMdPath(projectRoot);
      if (this.fileOps.existsSync(claudeMdPath)) {
        const content = this.fileOps.readFileSync(claudeMdPath, 'utf-8');
        if (content.includes('@.claude/no_active_task.md')) {
          return 'No active task';
        }
      }
      return '';
    }

    // Try to get task title from the file content
    const taskContent = this.getActiveTaskContent(projectRoot);
    if (taskContent) {
      const titleMatch = taskContent.match(/^#\s+(.+?)(?:\s*\(TASK_\d+\))?\s*$/m);
      if (titleMatch) {
        const title = titleMatch[1].replace(/^TASK_\d+:\s*/, '').trim();
        return `${taskId}: ${title}`;
      }
    }

    return taskId;
  }
}

// Create a default instance for backward compatibility
const defaultClaudeMdHelpers = new ClaudeMdHelpers();

// Export standalone functions that use the default instance
export function getActiveTaskFile(projectRoot: string): string | null {
  return defaultClaudeMdHelpers.getActiveTaskFile(projectRoot);
}

export function getActiveTaskId(projectRoot: string): string | null {
  return defaultClaudeMdHelpers.getActiveTaskId(projectRoot);
}

export function getActiveTaskContent(projectRoot: string): string | null {
  return defaultClaudeMdHelpers.getActiveTaskContent(projectRoot);
}

export function setActiveTask(projectRoot: string, taskId: string): void {
  defaultClaudeMdHelpers.setActiveTask(projectRoot, taskId);
}

export function clearActiveTask(projectRoot: string): void {
  defaultClaudeMdHelpers.clearActiveTask(projectRoot);
}

export function hasActiveTask(projectRoot: string): boolean {
  return defaultClaudeMdHelpers.hasActiveTask(projectRoot);
}

export function getActiveTaskDisplay(projectRoot: string): string {
  return defaultClaudeMdHelpers.getActiveTaskDisplay(projectRoot);
}