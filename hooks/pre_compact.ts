#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { execSync } from 'child_process';

interface CompactInput {
  messageId: string;
  threadId: string;
  conversationStats: any;
  transcript: string;
}

interface TranscriptEntry {
  type: string;
  timestamp: string;
  uuid: string;
  parentUuid?: string;
  message?: {
    role: string;
    content?: any;
  };
  toolUseResult?: any;
}

interface ErrorSequence {
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

class ErrorPatternExtractor {
  private entries: Map<string, TranscriptEntry> = new Map();
  private errorSequences: ErrorSequence[] = [];
  private timeout: NodeJS.Timeout | null = null;
  
  async extractFromTranscript(transcriptPath: string): Promise<ErrorSequence[]> {
    // First pass: Load all entries into memory with UUID index
    await this.loadEntries(transcriptPath);
    
    // Second pass: Find errors and trace their resolutions
    this.findErrorSequences();
    
    return this.errorSequences;
  }
  
  private async loadEntries(transcriptPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Set 20 second timeout for loading
      this.timeout = setTimeout(() => {
        console.error('Loading timeout - proceeding with partial data');
        resolve();
      }, 20000);
      
      const fileStream = createReadStream(transcriptPath);
      const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      rl.on('line', (line) => {
        try {
          const entry: TranscriptEntry = JSON.parse(line);
          if (entry.uuid) {
            this.entries.set(entry.uuid, entry);
          }
        } catch (e) {
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
        console.error('Error reading transcript:', error);
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
      // Look for tool results that indicate errors
      if (this.isErrorEntry(entry)) {
        errorCount++;
        const sequence = this.buildErrorSequence(uuid, entry);
        // Keep all errors, even without subsequent attempts for now
        this.errorSequences.push(sequence);
      }
    }
    console.error(`Found ${errorCount} error entries, created ${this.errorSequences.length} sequences`);
  }
  
  private isErrorEntry(entry: TranscriptEntry): boolean {
    // Check if toolUseResult is a string error
    if (entry.toolUseResult && typeof entry.toolUseResult === 'string') {
      const result = entry.toolUseResult.toLowerCase();
      return result.includes('error') || result.includes('failed');
    }
    
    // Check for bash command errors
    if (entry.toolUseResult && 
        typeof entry.toolUseResult === 'object' && 
        entry.toolUseResult.stdout) {
      const output = String(entry.toolUseResult.stdout || entry.toolUseResult.stderr || '').toLowerCase();
      return output.includes('error') || 
             output.includes('failed') || 
             output.includes('not found') ||
             output.includes('permission denied') ||
             output.includes('update') ||
             output.includes('version');
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
      subsequentAttempts: []
    };
    
    // Extract error details from the failed tool use
    this.extractErrorDetails(errorEntry, sequence);
    
    // Find ALL subsequent tool attempts until we get a success
    // We want to capture the full struggle, not just retries of the same command
    this.findSubsequentAttempts(errorEntry, sequence);
    
    return sequence;
  }
  
  private extractErrorDetails(errorEntry: TranscriptEntry, sequence: ErrorSequence) {
    // First extract the error output
    if (errorEntry.toolUseResult) {
      if (typeof errorEntry.toolUseResult === 'string') {
        sequence.errorOutput = errorEntry.toolUseResult.substring(0, 500);
      } else if (typeof errorEntry.toolUseResult === 'object') {
        sequence.errorOutput = String(
          errorEntry.toolUseResult.stdout || 
          errorEntry.toolUseResult.stderr || 
          errorEntry.toolUseResult.output || 
          ''
        ).substring(0, 500);
      }
    }
    
    // Now find what tool/command caused this error
    // Look for the tool_use in the parent assistant message
    const parent = errorEntry.parentUuid ? this.entries.get(errorEntry.parentUuid) : null;
    if (parent?.message?.content && Array.isArray(parent.message.content)) {
      for (const content of parent.message.content) {
        if (content.type === 'tool_use') {
          // Format the command based on the tool type
          if (content.name === 'Bash' && content.input?.command) {
            sequence.errorCommand = content.input.command;
          } else {
            // For other tools, show tool name and key parameters
            const inputStr = JSON.stringify(content.input || {});
            sequence.errorCommand = `${content.name}: ${inputStr}`;
          }
          break;
        }
      }
    }
    
    // Fallback: if we have a bash result object with command
    if (!sequence.errorCommand && errorEntry.toolUseResult?.command) {
      sequence.errorCommand = errorEntry.toolUseResult.command;
    }
  }
  
  private findSubsequentAttempts(errorEntry: TranscriptEntry, sequence: ErrorSequence) {
    // Get all entries chronologically after this error
    const errorTime = new Date(errorEntry.timestamp).getTime();
    const laterEntries = Array.from(this.entries.values())
      .filter(e => new Date(e.timestamp).getTime() > errorTime)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    let foundSuccess = false;
    const maxAttempts = 5; // Look at up to 20 subsequent tool uses
    let attemptCount = 0;
    
    for (const entry of laterEntries) {
      if (attemptCount >= maxAttempts) break;
      
      // Look for any tool use (not just Bash)
      if (entry.type === 'assistant' && entry.message?.content && Array.isArray(entry.message.content)) {
        for (const content of entry.message.content) {
          if (content.type === 'tool_use') {
            attemptCount++;
            
            // Find the corresponding result
            const resultEntry = laterEntries.find(e => 
              e.type === 'user' && 
              e.message?.content && 
              Array.isArray(e.message.content) &&
              e.message.content.some((c: any) => c.tool_use_id === content.id)
            );
            
            if (resultEntry) {
              const isError = this.isErrorEntry(resultEntry);
              const attempt = {
                command: this.formatToolCommand(content.name, content.input),
                output: this.extractResultOutput(resultEntry).substring(0, 400),
                success: !isError
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
  
  private formatToolCommand(toolName: string, input: any): string {
    if (!input) return toolName;
    
    switch(toolName) {
      case 'Bash':
        return input.command || 'bash command';
      case 'Read':
        return `Read ${input.file_path || 'file'}`;
      case 'Write':
        return `Write ${input.file_path || 'file'}`;
      case 'Edit':
      case 'MultiEdit':
        return `Edit ${input.file_path || 'file'}`;
      case 'Grep':
        return `Grep for "${input.pattern || ''}" in ${input.path || '.'}`;
      case 'TodoWrite':
        return `Update todo list`;
      case 'WebSearch':
        return `Search web for "${input.query || ''}"`;
      default:
        // For unknown tools, try to extract something meaningful
        if (typeof input === 'string') return `${toolName}: ${input.substring(0, 100)}`;
        if (input.file_path) return `${toolName} ${input.file_path}`;
        if (input.path) return `${toolName} ${input.path}`;
        if (input.command) return `${toolName}: ${input.command}`;
        return toolName;
    }
  }
  
  private extractResultOutput(entry: TranscriptEntry): string {
    if (entry.toolUseResult) {
      if (typeof entry.toolUseResult === 'string') {
        return entry.toolUseResult;
      } else if (typeof entry.toolUseResult === 'object') {
        return String(
          entry.toolUseResult.stdout || 
          entry.toolUseResult.stderr || 
          entry.toolUseResult.output ||
          entry.toolUseResult.content ||
          JSON.stringify(entry.toolUseResult).substring(0, 200)
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

async function analyzeErrorPatterns(sequences: ErrorSequence[], projectRoot: string): Promise<string[]> {
  // Only analyze sequences that actually found a resolution after multiple attempts
  const interestingSequences = sequences.filter(seq => 
    seq.subsequentAttempts.length >= 2 && 
    seq.errorOutput
  );
  
  if (interestingSequences.length === 0) {
    console.error('No interesting error sequences to analyze');
    return [];
  }
  
  console.error(`Analyzing ${interestingSequences.length} interesting sequences out of ${sequences.length} total`);
  
  // Read existing lessons to merge with
  const mistakesPath = join(projectRoot, '.claude', 'learned_mistakes.md');
  let existingLessons: string[] = [];
  if (existsSync(mistakesPath)) {
    const content = readFileSync(mistakesPath, 'utf-8');
    // Extract existing bullet points
    const matches = content.match(/^- .+$/gm);
    if (matches) {
      existingLessons = matches.map(m => m.substring(2)); // Remove "- " prefix
    }
  }
  
  // Format all sequences for Claude to analyze at once
  const sequenceDescriptions = interestingSequences.map((seq, i) => {
    const errorCommand = seq.errorCommand || 'Unknown command';
    const errorSnippet = seq.errorOutput?.substring(0, 200) || 'Unknown error';
    const attempts = seq.subsequentAttempts.map((a, j) => 
      `  ${j+1}. ${a.command}: ${a.success ? '✓' : '✗'}`
    ).join('\n');
    
    return `SEQUENCE ${i+1}:
Initial failure: ${errorCommand}
Error: ${errorSnippet}
Recovery attempts:
${attempts}
${seq.resolution ? `Resolution: ${seq.resolution}` : 'No resolution found'}`;
  }).join('\n\n');
  
  const prompt = `You are analyzing error sequences from an AI coding session to extract lessons learned.

${existingLessons.length > 0 ? `EXISTING LESSONS (do not repeat these):
${existingLessons.map(l => `- ${l}`).join('\n')}

` : ''}ERROR SEQUENCES TO ANALYZE:

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
    const tempFile = `/tmp/error_analysis_batch_${Date.now()}.txt`;
    writeFileSync(tempFile, prompt);
    
    const response = execSync(
      `claude --output-format text < "${tempFile}"`,
      { 
        encoding: 'utf-8',
        timeout: 15000, // Give more time for analyzing multiple sequences
        shell: '/bin/bash',
        cwd: '/tmp'  // Run in /tmp to avoid triggering Stop hook recursion
      }
    ).trim();
    
    // Clean up temp file
    if (existsSync(tempFile)) {
      unlinkSync(tempFile);
    }
    
    // Parse the response into individual lessons
    if (response === 'NO NEW LESSONS') {
      return [];
    }
    
    const newLessons = response
      .split('\n')
      .filter(line => line.startsWith('- '))
      .map(line => line.substring(2).trim())
      .filter(lesson => lesson.length > 0 && lesson.length < 300);
    
    return newLessons;
    
  } catch (e) {
    console.error('Claude CLI analysis failed:', e);
    return [];
  }
}

async function updateLearnedMistakes(projectRoot: string, patterns: string[]) {
  if (patterns.length === 0) return;
  
  const mistakesPath = join(projectRoot, '.claude', 'learned_mistakes.md');
  const now = new Date();
  const timestamp = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;
  
  if (existsSync(mistakesPath)) {
    let content = readFileSync(mistakesPath, 'utf-8');
    
    // Add new patterns
    const newSection = `\n### Session: ${timestamp}\n${patterns.map(p => `- ${p}`).join('\n')}\n`;
    
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

async function main() {
  try {
    const input = await Bun.stdin.text();
    const data: CompactInput = JSON.parse(input);
    
    if (!data.transcript || !existsSync(data.transcript)) {
      console.log(JSON.stringify({ success: false, message: 'No transcript found' }));
      process.exit(0);
    }
    
    // Extract error patterns
    const extractor = new ErrorPatternExtractor();
    const sequences = await extractor.extractFromTranscript(data.transcript);
    
    // Get project root
    const scriptPath = process.argv[1];
    let projectRoot: string;
    if (scriptPath.includes('/.claude/hooks/')) {
      projectRoot = scriptPath.substring(0, scriptPath.indexOf('/.claude/hooks/'));
    } else if (scriptPath.includes('/hooks/')) {
      projectRoot = scriptPath.substring(0, scriptPath.indexOf('/hooks/'));
    } else {
      projectRoot = process.cwd();
    }
    
    // Analyze patterns and update learned mistakes
    if (sequences.length > 0) {
      const patterns = await analyzeErrorPatterns(sequences, projectRoot);
      await updateLearnedMistakes(projectRoot, patterns);
      
      console.log(JSON.stringify({ 
        success: true, 
        message: `Extracted ${sequences.length} error sequences, learned ${patterns.length} patterns` 
      }));
    } else {
      console.log(JSON.stringify({ 
        success: true, 
        message: 'No error patterns found in this session' 
      }));
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error(`Error in pre_compact_focused hook: ${error}`);
    console.log(JSON.stringify({ success: false, message: `Error: ${error}` }));
    process.exit(0);
  }
}

main();