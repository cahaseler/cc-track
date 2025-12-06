import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLogger } from '../logger';
import type { CodeReviewOptions, CodeReviewResult } from './types';

export interface CodexDeps {
  execSync?: typeof execSync;
  fileOps?: {
    existsSync: typeof existsSync;
    mkdirSync: typeof mkdirSync;
    readFileSync: typeof readFileSync;
    writeFileSync: typeof writeFileSync;
  };
  logger?: ReturnType<typeof createLogger>;
}

/**
 * Perform code review using Codex CLI
 */
export async function performCodexReview(options: CodeReviewOptions, deps: CodexDeps = {}): Promise<CodeReviewResult> {
  const {
    execSync: exec = execSync,
    fileOps = { existsSync, mkdirSync, readFileSync, writeFileSync },
    logger = createLogger('codex-review'),
  } = deps;

  const { taskId, taskTitle, projectRoot, specFolderPath, mergeBase } = options;

  try {
    // Check if codex is installed
    try {
      exec('which codex', { encoding: 'utf-8' });
    } catch {
      logger.warn('Codex CLI not found');
      return {
        success: false,
        error: 'Codex CLI is not installed. Please install it from: https://github.com/openai/codex',
      };
    }

    // Ensure code-reviews directory exists
    const codeReviewsDir = join(projectRoot, 'code-reviews');
    if (!fileOps.existsSync(codeReviewsDir)) {
      fileOps.mkdirSync(codeReviewsDir, { recursive: true });
    }

    // Determine where to find spec files
    const specLocation = specFolderPath || join(projectRoot, '.claude', 'tasks', `${taskId}.md`);

    // Create concise review prompt that points to files instead of including full content
    const prompt = `You are performing a comprehensive code review for task ${taskId}.

# Task Information
- **Task ID:** ${taskId}
- **Title:** ${taskTitle}
- **Project Root:** ${projectRoot}
- **Spec Location:** ${specLocation}
${mergeBase ? `- **Merge Base:** ${mergeBase}` : ''}

# Your Review Task

1. **Read the task requirements** from ${specLocation}
   - If it's a directory, read spec.md, plan.md, and tasks.md
   - If it's a file, read the entire task file

2. **Review the changes** by running: \`git diff ${mergeBase || 'HEAD~1'}..HEAD\`

3. **Analyze the implementation** against requirements:
   - Requirements Alignment: Do the changes fulfill all task requirements?
   - Security: Any vulnerabilities or concerns?
   - Code Quality: Is the code well-structured, readable, and maintainable?
   - Performance: Any issues or optimizations needed?
   - Architecture: Does it follow project patterns and conventions?
   - Error Handling: Is error handling comprehensive?
   - Testing: Are the changes adequately tested?
   - Documentation: Is the code properly documented?

4. **Write your review** to: code-reviews/${taskId}_[DATE].md
   - Use current UTC timestamp for [DATE] in format: YYYY-MM-DD_HHmm-UTC
   - Be thorough, actionable, and constructive
   - Include specific file/line references

You have read access to the entire project.
You can only write to the code-reviews/ directory.`;

    logger.info('Starting Codex review', { taskId, timeout: '30 minutes' });

    // Generate output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const fileName = `${taskId}_${timestamp}-UTC.md`;
    const filePath = join(codeReviewsDir, fileName);

    // Write prompt to temporary file to avoid shell escaping issues
    const tmpPromptFile = join(tmpdir(), `codex-prompt-${taskId}-${Date.now()}.txt`);
    fileOps.writeFileSync(tmpPromptFile, prompt);

    // Run Codex CLI in non-interactive mode with exec
    // codex exec runs in read-only mode by default and doesn't prompt for approvals
    // Use command substitution to read prompt from file, --output-last-message to write output
    try {
      exec(`codex exec --output-last-message ${JSON.stringify(filePath)} "$(cat ${JSON.stringify(tmpPromptFile)})"`, {
        encoding: 'utf-8',
        cwd: projectRoot,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        timeout: 1800000, // 30 minutes
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ETIMEDOUT') {
        logger.error('Codex review timed out after 30 minutes');
        return {
          success: false,
          error: 'Codex review timed out after 30 minutes',
        };
      }
      throw error;
    } finally {
      // Clean up temp file
      try {
        exec(`rm ${JSON.stringify(tmpPromptFile)}`);
      } catch {
        // Ignore cleanup errors
      }
    }

    logger.debug('Codex exec completed, reading output file');

    // Read the generated review file
    const reviewContent = fileOps.readFileSync(filePath, 'utf-8');

    // Prepend metadata header to the review
    const markdown = `# Code Review: ${taskTitle}

**Task ID:** ${taskId}
**Reviewed by:** Codex CLI
**Date:** ${new Date().toISOString()}

---

${reviewContent}`;

    // Write back with metadata
    fileOps.writeFileSync(filePath, markdown);

    logger.info('Codex review completed', { taskId, filePath });

    return {
      success: true,
      review: markdown,
      filePath: fileName,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Codex review failed', { error: errorMsg });

    return {
      success: false,
      error: `Codex review failed: ${errorMsg}`,
    };
  }
}
