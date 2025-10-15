import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../logger';
import type { CodeReviewIssue, CodeReviewOptions, CodeReviewResult } from './types';

export interface CodeRabbitDeps {
  execSync?: typeof execSync;
  fileOps?: {
    existsSync: typeof existsSync;
    mkdirSync: typeof mkdirSync;
    writeFileSync: typeof writeFileSync;
  };
  logger?: ReturnType<typeof createLogger>;
}

/**
 * Parse CodeRabbit output into structured issues
 */
function parseCodeRabbitOutput(output: string): CodeReviewIssue[] {
  const issues: CodeReviewIssue[] = [];
  const lines = output.split('\n');

  let currentIssue: Partial<CodeReviewIssue> | null = null;
  let inComment = false;
  let inPrompt = false;
  let commentLines: string[] = [];
  let promptLines: string[] = [];

  for (const line of lines) {
    // New issue starts with separator
    if (line.startsWith('==========')) {
      // Save previous issue if exists
      if (currentIssue?.file && currentIssue.line && currentIssue.comment) {
        issues.push({
          file: currentIssue.file,
          line: currentIssue.line,
          type: (currentIssue.type as CodeReviewIssue['type']) || 'suggestion',
          comment: currentIssue.comment,
          fixPrompt: currentIssue.fixPrompt,
          fixCommand: currentIssue.fixCommand,
        });
      }
      currentIssue = {};
      commentLines = [];
      promptLines = [];
      inComment = false;
      inPrompt = false;
      continue;
    }

    // Parse issue metadata
    if (line.startsWith('File: ')) {
      currentIssue = currentIssue || {};
      currentIssue.file = line.substring(6).trim();
    } else if (line.startsWith('Line: ')) {
      currentIssue = currentIssue || {};
      currentIssue.line = parseInt(line.substring(6).trim(), 10);
    } else if (line.startsWith('Type: ')) {
      currentIssue = currentIssue || {};
      const type = line.substring(6).trim();
      currentIssue.type = type as CodeReviewIssue['type'];
    } else if (line.startsWith('Comment:')) {
      inComment = true;
      inPrompt = false;
      commentLines = [];
    } else if (line.startsWith('Prompt for AI Agent:')) {
      inComment = false;
      inPrompt = true;
      promptLines = [];
    } else if (line.startsWith('#!/bin/bash')) {
      // Start of fix command
      inComment = false;
      inPrompt = false;
      if (currentIssue) {
        // Capture bash command block until next empty line
        const commandStart = lines.indexOf(line);
        let commandEnd = commandStart;
        for (let i = commandStart + 1; i < lines.length; i++) {
          if (lines[i].trim() === '') break;
          commandEnd = i;
        }
        currentIssue.fixCommand = lines.slice(commandStart, commandEnd + 1).join('\n');
      }
    } else if (inComment && line.trim()) {
      commentLines.push(line);
    } else if (inPrompt && line.trim()) {
      promptLines.push(line);
    } else if (inComment && !line.trim()) {
      // End of comment
      if (currentIssue) {
        currentIssue.comment = commentLines.join('\n').trim();
      }
      inComment = false;
    } else if (inPrompt && !line.trim()) {
      // End of prompt
      if (currentIssue) {
        currentIssue.fixPrompt = promptLines.join('\n').trim();
      }
      inPrompt = false;
    }
  }

  // Save last issue if exists
  if (currentIssue?.file && currentIssue.line && currentIssue.comment) {
    issues.push({
      file: currentIssue.file,
      line: currentIssue.line,
      type: (currentIssue.type as CodeReviewIssue['type']) || 'suggestion',
      comment: currentIssue.comment,
      fixPrompt: currentIssue.fixPrompt,
      fixCommand: currentIssue.fixCommand,
    });
  }

  return issues;
}

/**
 * Format issues as markdown for the review file
 */
function formatIssuesAsMarkdown(issues: CodeReviewIssue[], taskId: string, taskTitle: string): string {
  const severityGroups: Record<string, CodeReviewIssue[]> = {
    critical: [],
    warning: [],
    potential_issue: [],
    suggestion: [],
  };

  for (const issue of issues) {
    const severity = issue.type || 'suggestion';
    // Map any unknown severity to suggestion
    const mappedSeverity = severityGroups[severity] ? severity : 'suggestion';
    severityGroups[mappedSeverity].push(issue);
  }

  let markdown = `# Code Review: ${taskTitle}

**Task ID:** ${taskId}
**Reviewed by:** CodeRabbit CLI
**Date:** ${new Date().toISOString()}
**Total Issues:** ${issues.length}

## Summary by Severity

- **Critical Issues:** ${severityGroups.critical.length}
- **Warnings:** ${severityGroups.warning.length}
- **Potential Issues:** ${severityGroups.potential_issue.length}
- **Suggestions:** ${severityGroups.suggestion.length}

---

`;

  // Add issues by severity
  const severityOrder = ['critical', 'warning', 'potential_issue', 'suggestion'];
  const severityTitles: Record<string, string> = {
    critical: '🔴 Critical Issues',
    warning: '🟡 Warnings',
    potential_issue: '🟠 Potential Issues',
    suggestion: '🔵 Suggestions',
  };

  for (const severity of severityOrder) {
    const issuesInGroup = severityGroups[severity];
    if (issuesInGroup.length === 0) continue;

    markdown += `## ${severityTitles[severity]}\n\n`;

    for (const issue of issuesInGroup) {
      markdown += `### ${issue.file}:${issue.line}\n\n`;
      markdown += `**Issue:** ${issue.comment}\n\n`;

      if (issue.fixCommand) {
        markdown += `**Investigation Command:**\n\`\`\`bash\n${issue.fixCommand}\n\`\`\`\n\n`;
      }

      if (issue.fixPrompt) {
        markdown += `**Fix Instructions:**\n> ${issue.fixPrompt.replace(/\n/g, '\n> ')}\n\n`;
      }

      markdown += '---\n\n';
    }
  }

  return markdown;
}

/**
 * Perform code review using CodeRabbit CLI
 */
export async function performCodeRabbitReview(
  options: CodeReviewOptions,
  deps: CodeRabbitDeps = {},
): Promise<CodeReviewResult> {
  const {
    execSync: exec = execSync,
    fileOps = { existsSync, mkdirSync, writeFileSync },
    logger = createLogger('coderabbit-review'),
  } = deps;

  const { taskId, taskTitle, projectRoot, mergeBase } = options;

  try {
    // Check if coderabbit is installed
    try {
      exec('which coderabbit', { encoding: 'utf-8' });
    } catch {
      logger.warn('CodeRabbit CLI not found');
      return {
        success: false,
        error:
          'CodeRabbit CLI is not installed. Please install it with: curl -fsSL https://cli.coderabbit.ai/install.sh | bash',
      };
    }

    // Ensure code-reviews directory exists
    const codeReviewsDir = join(projectRoot, 'code-reviews');
    if (!fileOps.existsSync(codeReviewsDir)) {
      fileOps.mkdirSync(codeReviewsDir, { recursive: true });
    }

    // Run CodeRabbit review
    logger.info('Starting CodeRabbit review', { taskId, mergeBase, timeout: '15 minutes' });

    const command = mergeBase ? `coderabbit --plain --base ${mergeBase}` : 'coderabbit --plain --type uncommitted';

    let output: string;
    try {
      output = exec(command, {
        encoding: 'utf-8',
        cwd: projectRoot,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        timeout: 1800000, // 30 minutes
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ETIMEDOUT') {
        logger.error('CodeRabbit review timed out after 30 minutes');
        return {
          success: false,
          error: 'CodeRabbit review timed out after 30 minutes',
        };
      }
      throw error;
    }

    logger.debug('CodeRabbit output received', { length: output.length });

    // Parse the output
    const issues = parseCodeRabbitOutput(output);
    logger.debug('Parsed CodeRabbit issues', { count: issues.length, issues: JSON.stringify(issues) });

    // If CodeRabbit returns "Review completed" with no issues, treat as success with no issues
    if (issues.length === 0 || (output.includes('Review completed') && !output.includes('=========='))) {
      // No issues found
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const fileName = `${taskId}_${timestamp}-UTC.md`;
      const filePath = join(codeReviewsDir, fileName);

      const markdown = `# Code Review: ${taskTitle}

**Task ID:** ${taskId}
**Reviewed by:** CodeRabbit CLI
**Date:** ${new Date().toISOString()}

## Summary

✅ **No issues found!**

CodeRabbit analysis completed successfully and found no issues with the code changes.`;

      fileOps.writeFileSync(filePath, markdown);

      logger.info('CodeRabbit review completed with no issues', { taskId, filePath });

      return {
        success: true,
        review: markdown,
        filePath: fileName,
      };
    }

    // Format issues as markdown
    const markdown = formatIssuesAsMarkdown(issues, taskId, taskTitle);

    // Save review to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const fileName = `${taskId}_${timestamp}-UTC.md`;
    const filePath = join(codeReviewsDir, fileName);

    fileOps.writeFileSync(filePath, markdown);

    logger.info('CodeRabbit review completed', {
      taskId,
      filePath,
      issueCount: issues.length,
      critical: issues.filter((i) => i.type === 'critical').length,
      warnings: issues.filter((i) => i.type === 'warning').length,
    });

    return {
      success: true,
      review: markdown,
      filePath: fileName,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('CodeRabbit review failed', { error: errorMsg });

    return {
      success: false,
      error: `CodeRabbit review failed: ${errorMsg}`,
    };
  }
}
