/**
 * Lint parser abstraction for different linting tools
 */

import { createLogger } from './logger';

const logger = createLogger('lint-parsers');

export interface ParsedLintResult {
  errors: string[];
  issueCount: number;
}

export interface LintParser {
  /**
   * Parse linter output and extract errors
   * @param output The raw linter output
   * @param filePath Optional file path to filter errors for
   */
  parseOutput(output: string, filePath?: string): ParsedLintResult;

  /**
   * Get the auto-fix command for this linter
   * @param baseCommand The base lint command
   */
  getAutoFixCommand(baseCommand: string): string | undefined;
}

/**
 * Biome linter parser
 */
export class BiomeParser implements LintParser {
  parseOutput(output: string, filePath?: string): ParsedLintResult {
    const errors: string[] = [];
    let issueCount = 0;

    // Parse diagnostic count (e.g., "Found 5 diagnostics")
    const diagnosticMatch = output.match(/(\d+)\s+diagnostic/);
    if (diagnosticMatch) {
      issueCount = parseInt(diagnosticMatch[1], 10);
    }

    if (filePath) {
      // Parse compact format for specific file
      // Format: file:line:col lint/rule message
      const lines = output.split('\n').filter((line) => line.includes(filePath));
      for (const line of lines) {
        const match = line.match(/:(\d+):\d+ \S+ (.+)/);
        if (match) {
          errors.push(`Line ${match[1]}: ${match[2]}`);
        }
      }
    } else {
      // Parse general output
      // Look for lines that contain file paths with line/column numbers
      const lines = output.split('\n');
      for (const line of lines) {
        // Match pattern like "path/to/file.ts:10:5 lint/style/rule message"
        const match = line.match(/^[^:]+:(\d+):\d+ \S+ (.+)/);
        if (match) {
          errors.push(`Line ${match[1]}: ${match[2]}`);
        }
      }
    }

    // Limit errors to prevent huge output
    if (errors.length > 20) {
      errors.splice(20);
      errors.push('... and more');
    }

    logger.debug('Parsed Biome output', { issueCount, errorCount: errors.length });
    return { errors, issueCount: issueCount || errors.length };
  }

  getAutoFixCommand(baseCommand: string): string | undefined {
    // Biome uses --write flag for auto-fixing
    if (baseCommand.includes('--write')) {
      return baseCommand;
    }
    return `${baseCommand} --write`;
  }
}

/**
 * ESLint parser
 */
export class ESLintParser implements LintParser {
  parseOutput(output: string, filePath?: string): ParsedLintResult {
    const errors: string[] = [];
    let issueCount = 0;

    // Parse ESLint summary line (e.g., "✖ 5 problems (3 errors, 2 warnings)")
    const summaryMatch = output.match(/✖\s+(\d+)\s+problem/);
    if (summaryMatch) {
      issueCount = parseInt(summaryMatch[1], 10);
    }

    if (filePath) {
      // Parse errors for specific file
      // ESLint compact format: file:line:column: message [rule]
      const lines = output.split('\n').filter((line) => line.includes(filePath));
      for (const line of lines) {
        // Match both compact and stylish formats
        const compactMatch = line.match(/:(\d+):\d+:\s+(.+?)(?:\s+\[[\w/-]+\])?$/);
        const stylishMatch = line.match(/^\s*(\d+):\d+\s+(?:error|warning)\s+(.+?)(?:\s+[\w/-]+)?$/);

        if (compactMatch) {
          errors.push(`Line ${compactMatch[1]}: ${compactMatch[2].trim()}`);
        } else if (stylishMatch) {
          errors.push(`Line ${stylishMatch[1]}: ${stylishMatch[2].trim()}`);
        }
      }
    } else {
      // Parse general output
      const lines = output.split('\n');
      let currentFile = '';

      for (const line of lines) {
        // Check if this is a file header (starts with path)
        if (line.match(/^[/\w].*\.(ts|tsx|js|jsx|mjs|cjs)$/)) {
          currentFile = line.trim();
          continue;
        }

        // Parse error lines (indented with line:col)
        const errorMatch = line.match(/^\s*(\d+):\d+\s+(?:error|warning)\s+(.+?)(?:\s+[\w/-]+)?$/);
        if (errorMatch && currentFile) {
          errors.push(`${currentFile}:${errorMatch[1]} - ${errorMatch[2].trim()}`);
        }

        // Also try compact format
        const compactMatch = line.match(/^([^:]+):(\d+):\d+:\s+(.+?)(?:\s+\[[\w/-]+\])?$/);
        if (compactMatch) {
          errors.push(`Line ${compactMatch[2]}: ${compactMatch[3].trim()}`);
        }
      }
    }

    // Limit errors to prevent huge output
    if (errors.length > 20) {
      errors.splice(20);
      errors.push('... and more');
    }

    logger.debug('Parsed ESLint output', { issueCount, errorCount: errors.length });
    return { errors, issueCount: issueCount || errors.length };
  }

  getAutoFixCommand(baseCommand: string): string | undefined {
    // ESLint uses --fix flag for auto-fixing
    if (baseCommand.includes('--fix')) {
      return baseCommand;
    }
    return `${baseCommand} --fix`;
  }
}

/**
 * Generic linter parser (fallback)
 */
export class GenericParser implements LintParser {
  parseOutput(output: string, filePath?: string): ParsedLintResult {
    const errors: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Skip common non-error lines
      if (
        trimmed.startsWith('Checking') ||
        trimmed.startsWith('Done') ||
        trimmed.startsWith('Found') ||
        trimmed.match(/^\d+\s+(error|warning|issue)/)
      ) {
        continue;
      }

      // Look for lines with "error", "warning", or line numbers
      if (
        trimmed.toLowerCase().includes('error') ||
        trimmed.toLowerCase().includes('warning') ||
        trimmed.match(/^\s*\d+[:\s]/) || // Lines starting with numbers
        trimmed.match(/line\s+\d+/i) // "Line X" references
      ) {
        // If filtering by file, only include if line mentions the file
        if (!filePath || line.includes(filePath)) {
          errors.push(trimmed);
        }
      }
    }

    // Try to extract issue count from common patterns
    let issueCount = errors.length;
    const countMatch = output.match(/(\d+)\s+(?:error|warning|issue|problem)/i);
    if (countMatch) {
      issueCount = parseInt(countMatch[1], 10);
    }

    // Limit errors to prevent huge output
    if (errors.length > 20) {
      errors.splice(20);
      errors.push('... and more');
    }

    logger.debug('Parsed generic linter output', { issueCount, errorCount: errors.length });
    return { errors, issueCount };
  }

  getAutoFixCommand(_baseCommand: string): string | undefined {
    // Generic parser doesn't know how to auto-fix
    return undefined;
  }
}

/**
 * Get the appropriate parser for a linting tool
 */
export function getLintParser(tool: string): LintParser {
  switch (tool.toLowerCase()) {
    case 'biome':
      return new BiomeParser();
    case 'eslint':
      return new ESLintParser();
    default:
      logger.debug('Using generic parser for unknown tool', { tool });
      return new GenericParser();
  }
}
