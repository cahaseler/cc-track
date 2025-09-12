import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { ClaudeSDK as DefaultClaudeSDK } from '../lib/claude-sdk';
import { isHookEnabled } from '../lib/config';
import type { ClaudeSDKInterface } from '../lib/git-helpers';
import { createLogger } from '../lib/logger';
import type { HookInput, HookOutput } from '../types';

const logger = createLogger('pre_compact');

export interface TranscriptEntry {
  type: string;
  timestamp: string;
  uuid: string;
  parentUuid?: string;
  message?: {
    role: string;
    content?: unknown;
  };
  toolUseResult?: unknown;
}

export interface ErrorSequence {
  errorUuid: string;
  errorCommand?: string;
  errorOutput?: string;
  errorTimestamp: string;
  subsequentAttempts: Array<{
    command?: string;
    output?: string;
    success: boolean;
  }>;
  resolution?: string;
}

interface ToolInput {
  command?: string;
  file_path?: string;
  path?: string;
  pattern?: string;
  query?: string;
  [key: string]: unknown;
}

interface ToolResult {
  stdout?: string;
  stderr?: string;
  output?: string;
  content?: string;
  command?: string;
  [key: string]: unknown;
}

export class ErrorPatternExtractor {
  private entries: Map<string, TranscriptEntry> = new Map();
  private errorSequences: ErrorSequence[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private logger;

  constructor(logger: ReturnType<typeof createLogger>) {
    this.logger = logger;
  }

  async extractFromTranscript(transcriptPath: string): Promise<ErrorSequence[]> {
    await this.loadEntries(transcriptPath);
    this.findErrorSequences();
    return this.errorSequences;
  }

  private async loadEntries(transcriptPath: string): Promise<void> {
    return new Promise((resolve, _reject) => {
      this.timeout = setTimeout(() => {
        this.logger.warn('Loading timeout - proceeding with partial data');
        resolve();
      }, 20000);

      const fileStream = createReadStream(transcriptPath);
      const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      rl.on('line', (line) => {
        try {
          const entry: TranscriptEntry = JSON.parse(line);
          if (entry.uuid) {
            this.entries.set(entry.uuid, entry);
          }
        } catch (_e) {
          // Skip malformed lines
        }
      });

      rl.on('close', () => {
        if (this.timeout) {
          clearTimeout(this.timeout);
        }
        resolve();
      });

      rl.on('error', (error) => {
        this.logger.error('Error reading transcript:', { error: error.message });
        if (this.timeout) {
          clearTimeout(this.timeout);
        }
        resolve();
      });
    });
  }

  private findErrorSequences() {
    let errorCount = 0;
    for (const [uuid, entry] of this.entries) {
      if (this.isErrorEntry(entry)) {
        errorCount++;
        const sequence = this.buildErrorSequence(uuid, entry);
        this.errorSequences.push(sequence);
      }
    }
    this.logger.info(`Found ${errorCount} error entries, created ${this.errorSequences.length} sequences`);
  }

  isErrorEntry(entry: TranscriptEntry): boolean {
    // Check if toolUseResult is a string error
    if (entry.toolUseResult && typeof entry.toolUseResult === 'string') {
      const result = entry.toolUseResult.toLowerCase();
      return result.includes('error') || result.includes('failed');
    }

    // Check for bash command errors
    if (entry.toolUseResult && typeof entry.toolUseResult === 'object') {
      const result = entry.toolUseResult as ToolResult;
      if (result.stdout || result.stderr) {
        const output = String(result.stdout || result.stderr || '').toLowerCase();
        return (
          output.includes('error') ||
          output.includes('failed') ||
          output.includes('not found') ||
          output.includes('permission denied') ||
          output.includes('update') ||
          output.includes('version')
        );
      }
    }

    // Check for tool result errors in message content
    if (entry.message?.content && Array.isArray(entry.message.content)) {
      for (const content of entry.message.content) {
        if (content.type === 'tool_result' && content.is_error) {
          return true;
        }
        if (content.type === 'tool_result' && content.content) {
          const text = String(content.content).toLowerCase();
          if (text.includes('error') || text.includes('failed')) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private buildErrorSequence(errorUuid: string, errorEntry: TranscriptEntry): ErrorSequence {
    const sequence: ErrorSequence = {
      errorUuid,
      errorTimestamp: errorEntry.timestamp,
      subsequentAttempts: [],
    };

    this.extractErrorDetails(errorEntry, sequence);
    this.findSubsequentAttempts(errorEntry, sequence);

    return sequence;
  }

  private extractErrorDetails(errorEntry: TranscriptEntry, sequence: ErrorSequence) {
    // Extract error output
    if (errorEntry.toolUseResult) {
      if (typeof errorEntry.toolUseResult === 'string') {
        sequence.errorOutput = errorEntry.toolUseResult.substring(0, 500);
      } else if (typeof errorEntry.toolUseResult === 'object') {
        const result = errorEntry.toolUseResult as ToolResult;
        sequence.errorOutput = String(result.stdout || result.stderr || result.output || '').substring(0, 500);
      }
    }

    // Find what tool/command caused this error
    const parent = errorEntry.parentUuid ? this.entries.get(errorEntry.parentUuid) : null;
    if (parent?.message?.content && Array.isArray(parent.message.content)) {
      for (const content of parent.message.content) {
        if (content.type === 'tool_use') {
          // Format the command based on the tool type
          if (content.name === 'Bash' && content.input?.command) {
            sequence.errorCommand = content.input.command;
          } else {
            const inputStr = JSON.stringify(content.input || {});
            sequence.errorCommand = `${content.name}: ${inputStr}`;
          }
          break;
        }
      }
    }

    // Fallback: check for command in result
    if (!sequence.errorCommand && errorEntry.toolUseResult && typeof errorEntry.toolUseResult === 'object') {
      const result = errorEntry.toolUseResult as ToolResult;
      if (result.command) {
        sequence.errorCommand = String(result.command);
      }
    }
  }

  private findSubsequentAttempts(errorEntry: TranscriptEntry, sequence: ErrorSequence) {
    const errorTime = new Date(errorEntry.timestamp).getTime();
    const laterEntries = Array.from(this.entries.values())
      .filter((e) => new Date(e.timestamp).getTime() > errorTime)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let foundSuccess = false;
    const maxAttempts = 5;
    let attemptCount = 0;

    for (const entry of laterEntries) {
      if (attemptCount >= maxAttempts) break;

      if (entry.type === 'assistant' && entry.message?.content && Array.isArray(entry.message.content)) {
        for (const content of entry.message.content) {
          if (content.type === 'tool_use') {
            attemptCount++;

            // Find the corresponding result
            const resultEntry = laterEntries.find(
              (e) =>
                e.type === 'user' &&
                e.message?.content &&
                Array.isArray(e.message.content) &&
                e.message.content.some((c: { tool_use_id?: string }) => c.tool_use_id === content.id),
            );

            if (resultEntry) {
              const isError = this.isErrorEntry(resultEntry);
              const attempt = {
                command: this.formatToolCommand(content.name, content.input),
                output: this.extractResultOutput(resultEntry).substring(0, 400),
                success: !isError,
              };

              sequence.subsequentAttempts.push(attempt);

              if (!isError) {
                sequence.resolution = attempt.command;
                foundSuccess = true;
                break;
              }
            }
          }
        }
      }

      if (foundSuccess) break;
    }
  }

  formatToolCommand(toolName: string, input: unknown): string {
    if (!input) return toolName;
    const typedInput = input as ToolInput;

    switch (toolName) {
      case 'Bash':
        return typedInput.command || 'bash command';
      case 'Read':
        return `Read ${typedInput.file_path || 'file'}`;
      case 'Write':
        return `Write ${typedInput.file_path || 'file'}`;
      case 'Edit':
      case 'MultiEdit':
        return `Edit ${typedInput.file_path || 'file'}`;
      case 'Grep':
        return `Grep for "${typedInput.pattern || ''}" in ${typedInput.path || '.'}`;
      case 'TodoWrite':
        return `Update todo list`;
      case 'WebSearch':
        return `Search web for "${typedInput.query || ''}"`;
      default:
        if (typeof input === 'string') return `${toolName}: ${input.substring(0, 100)}`;
        if (typedInput.file_path) return `${toolName} ${typedInput.file_path}`;
        if (typedInput.path) return `${toolName} ${typedInput.path}`;
        if (typedInput.command) return `${toolName}: ${typedInput.command}`;
        return toolName;
    }
  }

  extractResultOutput(entry: TranscriptEntry): string {
    if (entry.toolUseResult) {
      if (typeof entry.toolUseResult === 'string') {
        return entry.toolUseResult;
      } else if (typeof entry.toolUseResult === 'object') {
        const result = entry.toolUseResult as ToolResult;
        return String(
          result.stdout ||
            result.stderr ||
            result.output ||
            result.content ||
            JSON.stringify(entry.toolUseResult).substring(0, 200),
        );
      }
    }

    // Check message content for tool results
    if (entry.message?.content && Array.isArray(entry.message.content)) {
      for (const content of entry.message.content) {
        if (content.type === 'tool_result' && content.content) {
          return String(content.content).substring(0, 200);
        }
      }
    }

    return '';
  }
}

export async function analyzeErrorPatterns(
  sequences: ErrorSequence[],
  projectRoot: string,
  logger: ReturnType<typeof createLogger>,
  deps?: PreCompactDependencies,
): Promise<string[]> {
  // Only analyze sequences that actually found a resolution after multiple attempts
  const interestingSequences = sequences.filter((seq) => seq.subsequentAttempts.length >= 2 && seq.errorOutput);

  if (interestingSequences.length === 0) {
    logger.info('No interesting error sequences to analyze');
    return [];
  }

  logger.info(`Analyzing ${interestingSequences.length} interesting sequences out of ${sequences.length} total`);

  // Read existing lessons to merge with
  const mistakesPath = join(projectRoot, '.claude', 'learned_mistakes.md');
  let existingLessons: string[] = [];
  if (existsSync(mistakesPath)) {
    const content = readFileSync(mistakesPath, 'utf-8');
    const matches = content.match(/^- .+$/gm);
    if (matches) {
      existingLessons = matches.map((m) => m.substring(2));
    }
  }

  // Format all sequences for Claude to analyze
  const sequenceDescriptions = interestingSequences
    .map((seq, i) => {
      const errorCommand = seq.errorCommand || 'Unknown command';
      const errorSnippet = seq.errorOutput?.substring(0, 200) || 'Unknown error';
      const attempts = seq.subsequentAttempts
        .map((a, j) => `  ${j + 1}. ${a.command}: ${a.success ? '✓' : '✗'}`)
        .join('\n');

      return `SEQUENCE ${i + 1}:
Initial failure: ${errorCommand}
Error: ${errorSnippet}
Recovery attempts:
${attempts}
${seq.resolution ? `Resolution: ${seq.resolution}` : 'No resolution found'}`;
    })
    .join('\n\n');

  const prompt = `You are analyzing error sequences from an AI coding session to extract lessons learned.

${
  existingLessons.length > 0
    ? `EXISTING LESSONS (do not repeat these):
${existingLessons.map((l) => `- ${l}`).join('\n')}

`
    : ''
}ERROR SEQUENCES TO ANALYZE:

${sequenceDescriptions}

Based on these sequences, identify NEW lessons learned about:
1. Common mistakes in tool usage (wrong tool for the job, incorrect syntax)
2. Error recovery patterns (what worked after failures)
3. Cases where the AI gave up and tried something completely different

Write a bulleted list of concise, actionable lessons. Each lesson should be specific and practical.
Examples of good lessons:
- When encountering "permission denied" errors, use sudo or check file ownership before retrying
- Always use quotes around file paths containing spaces or special characters
- When "file not found" errors occur with relative paths, verify the current working directory first

Ignore sequences that are inconclusive or don't provide clear lessons.
If there are no new lessons beyond the existing ones, respond with "NO NEW LESSONS".

Output ONLY the bulleted list of new lessons, nothing else.`;

  try {
    // Use SDK instead of CLI - no temp files needed!
    const claudeSDK = deps?.claudeSDK || DefaultClaudeSDK;
    const response = await claudeSDK.extractErrorPatterns(prompt);

    if (response === 'NO NEW LESSONS') {
      return [];
    }

    const newLessons = response
      .split('\n')
      .filter((line: string) => line.startsWith('- '))
      .map((line: string) => line.substring(2).trim())
      .filter((lesson: string) => lesson.length > 0 && lesson.length < 300);

    return newLessons;
  } catch (e) {
    logger.error('Claude CLI analysis failed:', { error: e });
    return [];
  }
}

export async function updateLearnedMistakes(projectRoot: string, patterns: string[]) {
  if (patterns.length === 0) return;

  const mistakesPath = join(projectRoot, '.claude', 'learned_mistakes.md');
  const now = new Date();
  const timestamp = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;

  if (existsSync(mistakesPath)) {
    let content = readFileSync(mistakesPath, 'utf-8');

    // Add new patterns
    const newSection = `\n### Session: ${timestamp}\n${patterns.map((p) => `- ${p}`).join('\n')}\n`;

    // Find the end of the Error Patterns section and insert there
    const marker = '## Error Patterns';
    const insertPos = content.indexOf(marker);
    if (insertPos >= 0) {
      const endOfSection = content.indexOf('\n##', insertPos + marker.length);
      if (endOfSection > 0) {
        content = content.slice(0, endOfSection) + newSection + content.slice(endOfSection);
      } else {
        content += newSection;
      }
    } else {
      content += `\n## Error Patterns\n${newSection}`;
    }

    writeFileSync(mistakesPath, content);
  }
}

export interface PreCompactDependencies {
  isHookEnabled?: typeof isHookEnabled;
  logger?: ReturnType<typeof createLogger>;
  claudeSDK?: ClaudeSDKInterface & {
    extractErrorPatterns: (transcript: string) => Promise<string>;
  };
}

/**
 * Main pre-compact hook function
 */
export async function preCompactHook(input: HookInput, deps: PreCompactDependencies = {}): Promise<HookOutput> {
  const checkEnabled = deps.isHookEnabled || isHookEnabled;
  const log = deps.logger || logger;

  try {
    // Check if hook is enabled
    if (!checkEnabled('pre_compact')) {
      return {
        continue: true,
        success: true,
        message: 'Hook disabled',
      };
    }

    log.info('Pre-compact hook started');

    const transcriptPath = input.transcript_path;
    const projectRoot = input.cwd || process.cwd();

    if (!transcriptPath || !existsSync(transcriptPath)) {
      return {
        continue: true,
        success: false,
        message: 'No transcript found',
      };
    }

    // Extract error patterns
    const extractor = new ErrorPatternExtractor(log);
    const sequences = await extractor.extractFromTranscript(transcriptPath);

    // Analyze patterns and update learned mistakes
    if (sequences.length > 0) {
      const patterns = await analyzeErrorPatterns(sequences, projectRoot, log, deps);
      await updateLearnedMistakes(projectRoot, patterns);

      return {
        continue: true,
        success: true,
        message: `Extracted ${sequences.length} error sequences, learned ${patterns.length} patterns`,
      };
    }

    return {
      continue: true,
      success: true,
      message: 'No error patterns found in this session',
    };
  } catch (error) {
    log.exception('Error in pre_compact hook', error as Error);
    return {
      continue: true,
      success: false,
      message: `Error: ${error}`,
    };
  }
}
