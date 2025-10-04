import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

  const { taskId, taskTitle, taskRequirements, gitDiff, projectRoot } = options;

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

    // Create comprehensive review prompt
    const prompt = `You are performing a comprehensive code review for task ${taskId}.

# Task Information
- **Task ID:** ${taskId}
- **Title:** ${taskTitle}
- **Project Root:** ${projectRoot}

# Task Requirements
${taskRequirements}

# Changes to Review (Git Diff)
${gitDiff}

# Your Review Task

Perform a thorough code review analyzing:
1. **Requirements Alignment:** Do the changes fulfill all task requirements?
2. **Security:** Are there any security vulnerabilities or concerns?
3. **Code Quality:** Is the code well-structured, readable, and maintainable?
4. **Performance:** Are there any performance issues or optimizations needed?
5. **Architecture:** Does the implementation follow project patterns and conventions?
6. **Error Handling:** Is error handling comprehensive and appropriate?
7. **Testing:** Are the changes adequately tested? Are there missing test cases?
8. **Documentation:** Is the code properly documented? Are there missing explanations?

You have access to read any file in the project to understand context and patterns.
You can only write to the code-reviews/ directory.

Write your complete review to a file named: code-reviews/${taskId}_[DATE].md

Use the current UTC timestamp for [DATE] in format: YYYY-MM-DD_HHmm-UTC

Your review should be thorough, actionable, and constructive. Include specific file/line references where applicable.`;

    logger.info('Starting Codex review', { taskId, timeout: '30 minutes' });

    // Generate output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const fileName = `${taskId}_${timestamp}-UTC.md`;
    const filePath = join(codeReviewsDir, fileName);

    // Run Codex CLI in non-interactive mode with exec
    // codex exec runs in read-only mode by default and doesn't prompt for approvals
    // Use -o flag to write output directly to file
    try {
      exec(`codex exec -o ${JSON.stringify(filePath)} ${JSON.stringify(prompt)}`, {
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
