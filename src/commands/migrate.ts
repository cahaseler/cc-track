// ABOUTME: Command to migrate old cc-track task structure to new spec-driven structure
// ABOUTME: Converts tasks/TASK_XXX.md files to specs/XXX-feature-name/ directories with spec/plan/tasks/progress files

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { ClaudeMdHelpers } from '../lib/claude-md';
import { createLogger } from '../lib/logger';
import type { SpecMetadata } from '../lib/spec-helpers';
import {
  createMetadata,
  createPlanFile,
  createProgressFile,
  createSpecDirectory,
  createSpecFile,
  createTasksFile,
  generateFeatureName,
} from '../lib/spec-helpers';

const logger = createLogger('migrate');

interface OldTaskMetadata {
  taskId: string;
  title: string;
  branch?: string;
  githubIssue?: number;
  githubUrl?: string;
  issueBranch?: string;
}

/**
 * Extract metadata from old task file HTML comments
 */
function extractOldTaskMetadata(content: string, taskId: string): OldTaskMetadata {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : `Task ${taskId}`;

  const branchMatch = content.match(/<!--\s*branch:\s*([^-]+)\s*-->/);
  const githubIssueMatch = content.match(/<!--\s*github_issue:\s*(\d+)\s*-->/);
  const githubUrlMatch = content.match(/<!--\s*github_url:\s*([^-]+)\s*-->/);
  const issueBranchMatch = content.match(/<!--\s*issue_branch:\s*([^-]+)\s*-->/);

  return {
    taskId,
    title,
    branch: branchMatch?.[1]?.trim(),
    githubIssue: githubIssueMatch ? Number.parseInt(githubIssueMatch[1], 10) : undefined,
    githubUrl: githubUrlMatch?.[1]?.trim(),
    issueBranch: issueBranchMatch?.[1]?.trim(),
  };
}

/**
 * Generate a simple spec.md from old task content
 */
function generateSpecFromOldTask(metadata: OldTaskMetadata, oldContent: string): string {
  const { title } = metadata;

  // Try to extract purpose/requirements sections from old task
  const purposeMatch = oldContent.match(/\*\*Purpose:\*\*\s*(.+?)(?=\n\n|\n\*\*|$)/s);
  const requirementsMatch = oldContent.match(/##\s*Requirements\s*\n([\s\S]+?)(?=\n##|$)/);

  const purpose = purposeMatch ? purposeMatch[1].trim() : 'Migrated from old task structure';
  const requirements = requirementsMatch
    ? requirementsMatch[1].trim()
    : '- [Requirement to be defined based on plan.md]';

  return `# Feature Specification: ${title}

**Feature ID**: \`${metadata.taskId}\`
**Created**: ${new Date().toISOString().split('T')[0]}
**Status**: Draft
**Note**: This spec was auto-generated during migration from old task structure.

## Overview

${purpose}

## Requirements

${requirements}

## Migration Note

This specification was automatically generated from an old task file. Review and enhance it with:
- Clear user scenarios
- Detailed functional requirements
- Non-functional requirements
- Success criteria

Use \`/clarify\` to refine this specification.
`;
}

/**
 * Generate tasks.md placeholder
 */
function generateTasksPlaceholder(metadata: OldTaskMetadata): string {
  return `# Tasks: ${metadata.title}

**Feature ID**: \`${metadata.taskId}\`
**Note**: This tasks file was created during migration.

## Migration Note

Task breakdown should be regenerated using \`/plan\` and \`/tasks\` commands based on the current plan and spec.

Alternatively, you can manually populate this file with the task breakdown from the plan.md file.
`;
}

/**
 * Generate progress.md with migration note
 */
function generateProgressFromMigration(metadata: OldTaskMetadata): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5);

  return `# Progress: ${metadata.title}

**Feature ID**: \`${metadata.taskId}\`
**Status**: in_progress
**Started**: ${dateStr} ${timeStr}
**Last Updated**: ${dateStr} ${timeStr}

---

## Migration Note

This progress file was created during migration from old cc-track structure.

### ${dateStr} ${timeStr} - Migrated from old structure
- Converted from tasks/TASK_${metadata.taskId}.md to specs/${metadata.taskId}-*/ directory structure
- Original content preserved in plan.md
- Spec and tasks files created as placeholders for refinement

---

## Next Steps

1. Review and enhance spec.md with clear requirements
2. Run \`/clarify\` to refine the specification
3. Run \`/plan\` to create technical design
4. Run \`/tasks\` to generate task breakdown
`;
}

/**
 * Migrate a single task file
 */
function migrateTask(
  projectRoot: string,
  taskId: string,
  oldContent: string,
): { success: boolean; featureName: string; error?: string } {
  try {
    // Extract metadata from old task
    const metadata = extractOldTaskMetadata(oldContent, taskId);
    const featureName = generateFeatureName(metadata.title);

    logger.info(`Migrating TASK_${taskId}: ${metadata.title} -> ${taskId}-${featureName}`);

    // Create spec directory
    const specDir = createSpecDirectory(projectRoot, taskId, featureName);

    // Create spec.md (user-facing requirements)
    const specContent = generateSpecFromOldTask(metadata, oldContent);
    createSpecFile(specDir, specContent);

    // Create plan.md (copy old task content)
    // Old task files were implementation-focused, so they become the "plan"
    createPlanFile(specDir, oldContent);

    // Create tasks.md placeholder
    const tasksContent = generateTasksPlaceholder(metadata);
    createTasksFile(specDir, tasksContent);

    // Create progress.md
    const progressContent = generateProgressFromMigration(metadata);
    createProgressFile(specDir, progressContent);

    // Create metadata.json
    const newMetadata: SpecMetadata = {
      task_id: taskId,
      feature_name: featureName,
      branch: metadata.branch || metadata.issueBranch || `${taskId}-${featureName}`,
      status: 'in_progress',
      started: new Date().toISOString(),
    };

    if (metadata.githubIssue && metadata.githubUrl) {
      newMetadata.github = {
        issue: metadata.githubIssue,
        url: metadata.githubUrl,
      };
    }

    createMetadata(specDir, newMetadata);

    logger.info(`Successfully migrated TASK_${taskId}`);
    return { success: true, featureName };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to migrate TASK_${taskId}`, { error: errorMsg });
    return { success: false, featureName: '', error: errorMsg };
  }
}

/**
 * Main migrate command
 */
export async function migrateCommand(projectRoot = process.cwd()): Promise<void> {
  console.log('🚅 CC-Track Migration Tool');
  console.log('Converting old task structure to spec-driven workflow...\n');

  const tasksDir = join(projectRoot, '.claude', 'tasks');
  const backupDir = join(projectRoot, '.claude', 'tasks.backup');

  // Check if old tasks directory exists
  if (!existsSync(tasksDir)) {
    console.log('❌ No tasks directory found. Nothing to migrate.');
    return;
  }

  // Find all old task files
  const files = readdirSync(tasksDir).filter((f) => f.match(/^TASK_\d{3}\.md$/));

  if (files.length === 0) {
    console.log('✅ No old task files found. Already using new structure!');
    return;
  }

  console.log(`Found ${files.length} task(s) to migrate:\n`);

  // Migrate each task
  const results: Array<{ taskId: string; success: boolean; featureName: string; error?: string }> = [];

  for (const file of files) {
    const taskId = file.match(/^TASK_(\d{3})\.md$/)?.[1];
    if (!taskId) continue;

    const oldPath = join(tasksDir, file);
    const oldContent = readFileSync(oldPath, 'utf-8');

    const result = migrateTask(projectRoot, taskId, oldContent);
    results.push({ taskId, ...result });

    if (result.success) {
      console.log(`  ✅ TASK_${taskId} -> specs/${taskId}-${result.featureName}/`);
    } else {
      console.log(`  ❌ TASK_${taskId} failed: ${result.error}`);
    }
  }

  // Check for constitution.md
  const constitutionPath = join(projectRoot, '.claude', 'constitution.md');
  if (!existsSync(constitutionPath)) {
    console.log('\n📋 Constitution file not found.');
    console.log('Consider creating one with `/constitution` command for project guardrails.');
  }

  // Backup old tasks directory
  console.log('\n📦 Creating backup of old tasks...');
  if (existsSync(backupDir)) {
    console.log('  ⚠️  Backup directory already exists, skipping backup');
  } else {
    mkdirSync(backupDir, { recursive: true });
    for (const file of files) {
      const oldPath = join(tasksDir, file);
      const backupPath = join(backupDir, file);
      renameSync(oldPath, backupPath);
    }
    console.log(`  ✅ Old tasks backed up to .claude/tasks.backup/`);
  }

  // Update CLAUDE.md if there's an active task
  const claudeMdHelpers = new ClaudeMdHelpers();
  const activeTaskId = claudeMdHelpers.getActiveTaskId(projectRoot);

  if (activeTaskId) {
    const taskNum = activeTaskId.match(/\d{3}/)?.[0];
    if (taskNum) {
      const migratedTask = results.find((r) => r.taskId === taskNum);
      if (migratedTask?.success) {
        const newPath = `.claude/specs/${taskNum}-${migratedTask.featureName}/spec.md`;
        claudeMdHelpers.setActiveTask(projectRoot, newPath);
        console.log(`\n✅ Updated CLAUDE.md active task reference to: ${newPath}`);
      }
    }
  }

  // Summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.length - successful;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Migration complete: ${successful} successful, ${failed} failed`);

  if (successful > 0) {
    console.log('\nNext steps:');
    console.log('1. Review migrated specs in .claude/specs/');
    console.log('2. Run `/clarify` on each spec to refine requirements');
    console.log('3. Run `/plan` to add technical design');
    console.log('4. Run `/tasks` to generate task breakdowns');
  }
}

// CLI execution
if (require.main === module) {
  migrateCommand().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}
