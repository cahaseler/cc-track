import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { createLogger } from '../lib/logger';
import type { HookInput } from '../types';
import {
  analyzeErrorPatterns,
  ErrorPatternExtractor,
  type ErrorSequence,
  preCompactHook,
  type TranscriptEntry,
  updateLearnedMistakes,
} from './pre-compact';

// Create a properly typed logger mock
function createMockLogger(): ReturnType<typeof createLogger> {
  return {
    debug: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    exception: mock(() => {}),
  } as unknown as ReturnType<typeof createLogger>;
}

describe('pre-compact', () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('ErrorPatternExtractor', () => {
    describe('isErrorEntry', () => {
      test('detects string error in toolUseResult', () => {
        const logger = {
          info: mock(() => {}),
          debug: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
          exception: mock(() => {}),
        };

        const extractor = new ErrorPatternExtractor(logger);

        const entry: TranscriptEntry = {
          type: 'user',
          timestamp: '2025-01-01T00:00:00Z',
          uuid: 'test-uuid',
          toolUseResult: 'Error: Something went wrong',
        };

        expect(extractor.isErrorEntry(entry)).toBe(true);
      });

      test('detects failed in toolUseResult string', () => {
        const logger = {
          info: mock(() => {}),
          debug: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
          exception: mock(() => {}),
        };

        const extractor = new ErrorPatternExtractor(logger);

        const entry: TranscriptEntry = {
          type: 'user',
          timestamp: '2025-01-01T00:00:00Z',
          uuid: 'test-uuid',
          toolUseResult: 'Command failed with exit code 1',
        };

        expect(extractor.isErrorEntry(entry)).toBe(true);
      });

      test('detects error in bash command stdout', () => {
        const logger = {
          info: mock(() => {}),
          debug: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
          exception: mock(() => {}),
        };

        const extractor = new ErrorPatternExtractor(logger);

        const entry: TranscriptEntry = {
          type: 'user',
          timestamp: '2025-01-01T00:00:00Z',
          uuid: 'test-uuid',
          toolUseResult: {
            stdout: 'Error: Missing script test',
          },
        };

        expect(extractor.isErrorEntry(entry)).toBe(true);
      });

      test('detects error in message content array', () => {
        const logger = {
          info: mock(() => {}),
          debug: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
          exception: mock(() => {}),
        };

        const extractor = new ErrorPatternExtractor(logger);

        const entry: TranscriptEntry = {
          type: 'user',
          timestamp: '2025-01-01T00:00:00Z',
          uuid: 'test-uuid',
          message: {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                is_error: true,
                content: 'File not found',
              },
            ],
          },
        };

        expect(extractor.isErrorEntry(entry)).toBe(true);
      });

      test('returns false for non-error entries', () => {
        const logger = {
          info: mock(() => {}),
          debug: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
          exception: mock(() => {}),
        };

        const extractor = new ErrorPatternExtractor(logger);

        const entry: TranscriptEntry = {
          type: 'user',
          timestamp: '2025-01-01T00:00:00Z',
          uuid: 'test-uuid',
          toolUseResult: {
            stdout: 'Success! All tests passed',
          },
        };

        expect(extractor.isErrorEntry(entry)).toBe(false);
      });
    });

    describe('formatToolCommand', () => {
      test('formats Bash command', () => {
        const logger = {
          info: mock(() => {}),
          debug: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
          exception: mock(() => {}),
        };

        const extractor = new ErrorPatternExtractor(logger);

        const result = extractor.formatToolCommand('Bash', { command: 'npm test' });
        expect(result).toBe('npm test');
      });

      test('formats Read command', () => {
        const logger = {
          info: mock(() => {}),
          debug: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
          exception: mock(() => {}),
        };

        const extractor = new ErrorPatternExtractor(logger);

        const result = extractor.formatToolCommand('Read', { file_path: '/path/to/file.ts' });
        expect(result).toBe('Read /path/to/file.ts');
      });

      test('formats Grep command', () => {
        const logger = {
          info: mock(() => {}),
          debug: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
          exception: mock(() => {}),
        };

        const extractor = new ErrorPatternExtractor(logger);

        const result = extractor.formatToolCommand('Grep', {
          pattern: 'TODO',
          path: './src',
        });
        expect(result).toBe('Grep for "TODO" in ./src');
      });

      test('handles unknown tools gracefully', () => {
        const logger = {
          info: mock(() => {}),
          debug: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
          exception: mock(() => {}),
        };

        const extractor = new ErrorPatternExtractor(logger);

        const result = extractor.formatToolCommand('UnknownTool', { some: 'data' });
        expect(result).toBe('UnknownTool');
      });
    });

    describe('extractResultOutput', () => {
      test('extracts string toolUseResult', () => {
        const logger = {
          info: mock(() => {}),
          debug: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
          exception: mock(() => {}),
        };

        const extractor = new ErrorPatternExtractor(logger);

        const entry: TranscriptEntry = {
          type: 'user',
          timestamp: '2025-01-01T00:00:00Z',
          uuid: 'test-uuid',
          toolUseResult: 'Command output here',
        };

        const result = extractor.extractResultOutput(entry);
        expect(result).toBe('Command output here');
      });

      test('extracts stdout from object toolUseResult', () => {
        const logger = {
          info: mock(() => {}),
          debug: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
          exception: mock(() => {}),
        };

        const extractor = new ErrorPatternExtractor(logger);

        const entry: TranscriptEntry = {
          type: 'user',
          timestamp: '2025-01-01T00:00:00Z',
          uuid: 'test-uuid',
          toolUseResult: {
            stdout: 'Standard output',
            stderr: 'Standard error',
          },
        };

        const result = extractor.extractResultOutput(entry);
        expect(result).toBe('Standard output');
      });

      test('extracts from message content tool_result', () => {
        const logger = {
          info: mock(() => {}),
          debug: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
          exception: mock(() => {}),
        };

        const extractor = new ErrorPatternExtractor(logger);

        const entry: TranscriptEntry = {
          type: 'user',
          timestamp: '2025-01-01T00:00:00Z',
          uuid: 'test-uuid',
          message: {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                content: 'Tool result content',
              },
            ],
          },
        };

        const result = extractor.extractResultOutput(entry);
        expect(result).toBe('Tool result content');
      });
    });
  });

  describe('analyzeErrorPatterns', () => {
    test('returns empty array when no interesting sequences', async () => {
      const logger = {
        info: mock(() => {}),
        debug: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
        exception: mock(() => {}),
      };

      const sequences: ErrorSequence[] = [
        {
          errorUuid: 'uuid1',
          errorTimestamp: '2025-01-01T00:00:00Z',
          subsequentAttempts: [], // Not interesting - no attempts
        },
      ];

      const result = await analyzeErrorPatterns(sequences, '/project', logger);
      expect(result).toEqual([]);
    });

    test('analyzes interesting sequences with Claude CLI', async () => {
      const logger = {
        info: mock(() => {}),
        debug: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
        exception: mock(() => {}),
      };

      const mockExec = mock((cmd: string) => {
        if (cmd.includes('claude --output-format text')) {
          return '- When encountering permission denied, use sudo\n- Always quote file paths with spaces\n';
        }
        return '';
      });

      mock.module('node:fs', () => ({
        existsSync: () => false,
        writeFileSync: mock(() => {}),
        unlinkSync: mock(() => {}),
      }));

      const sequences: ErrorSequence[] = [
        {
          errorUuid: 'uuid1',
          errorCommand: 'rm /protected/file',
          errorOutput: 'Permission denied',
          errorTimestamp: '2025-01-01T00:00:00Z',
          subsequentAttempts: [
            { command: 'chmod +x /protected/file', success: false },
            { command: 'sudo rm /protected/file', success: true },
          ],
          resolution: 'sudo rm /protected/file',
        },
      ];

      const result = await analyzeErrorPatterns(sequences, '/project', logger, mockExec);

      expect(result).toContain('When encountering permission denied, use sudo');
      expect(result).toContain('Always quote file paths with spaces');
    });

    test('handles Claude CLI failure gracefully', async () => {
      const logger = {
        info: mock(() => {}),
        debug: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
        exception: mock(() => {}),
      };

      const mockExec = mock(() => {
        throw new Error('Claude CLI failed');
      });

      mock.module('node:fs', () => ({
        existsSync: () => false,
        writeFileSync: mock(() => {}),
      }));

      const sequences: ErrorSequence[] = [
        {
          errorUuid: 'uuid1',
          errorCommand: 'test command',
          errorOutput: 'test error',
          errorTimestamp: '2025-01-01T00:00:00Z',
          subsequentAttempts: [
            { command: 'fix1', success: false },
            { command: 'fix2', success: true },
          ],
        },
      ];

      const result = await analyzeErrorPatterns(sequences, '/project', logger, mockExec);
      expect(result).toEqual([]);
    });

    test('merges with existing lessons', async () => {
      const logger = {
        info: mock(() => {}),
        debug: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
        exception: mock(() => {}),
      };

      const mockExec = mock((cmd: string) => {
        if (cmd.includes('claude --output-format text')) {
          return '- New lesson about file permissions\n';
        }
        return '';
      });

      mock.module('node:fs', () => ({
        existsSync: () => true,
        readFileSync: () => '## Error Patterns\n- Existing lesson one\n- Existing lesson two\n',
        writeFileSync: mock(() => {}),
        unlinkSync: mock(() => {}),
      }));

      const sequences: ErrorSequence[] = [
        {
          errorUuid: 'uuid1',
          errorCommand: 'chmod 777 /file',
          errorOutput: 'Operation not permitted',
          errorTimestamp: '2025-01-01T00:00:00Z',
          subsequentAttempts: [
            { command: 'sudo chmod 777 /file', success: false },
            { command: 'sudo chown user /file', success: true },
          ],
        },
      ];

      const result = await analyzeErrorPatterns(sequences, '/project', logger, mockExec);
      expect(result).toContain('New lesson about file permissions');
    });
  });

  describe('updateLearnedMistakes', () => {
    test('updates existing mistakes file', async () => {
      let writtenContent = '';

      mock.module('node:fs', () => ({
        existsSync: () => true,
        readFileSync: () => '# Learned Mistakes\n\n## Error Patterns\n\nExisting content here\n',
        writeFileSync: mock((_path: string, content: string) => {
          writtenContent = content;
        }),
      }));

      await updateLearnedMistakes('/project', ['New pattern 1', 'New pattern 2']);

      expect(writtenContent).toContain('## Error Patterns');
      expect(writtenContent).toContain('### Session:');
      expect(writtenContent).toContain('- New pattern 1');
      expect(writtenContent).toContain('- New pattern 2');
      expect(writtenContent).toContain('Existing content here');
    });

    test('does nothing when no patterns provided', async () => {
      const writeFileSync = mock(() => {});

      mock.module('node:fs', () => ({
        existsSync: () => true,
        readFileSync: () => '',
        writeFileSync,
      }));

      await updateLearnedMistakes('/project', []);

      expect(writeFileSync).not.toHaveBeenCalled();
    });

    test('creates new section when file exists but has no Error Patterns section', async () => {
      let writtenContent = '';

      mock.module('node:fs', () => ({
        existsSync: () => true,
        readFileSync: () => '# Learned Mistakes\n\nOther content\n',
        writeFileSync: mock((_path: string, content: string) => {
          writtenContent = content;
        }),
      }));

      await updateLearnedMistakes('/project', ['Pattern 1']);

      expect(writtenContent).toContain('## Error Patterns');
      expect(writtenContent).toContain('- Pattern 1');
    });
  });

  describe('preCompactHook', () => {
    test('returns success when hook is disabled', async () => {
      const input: HookInput = {
        transcript_path: '/path/to/transcript.jsonl',
        cwd: '/project',
      };

      const result = await preCompactHook(input, {
        isHookEnabled: () => false,
      });

      expect(result.continue).toBe(true);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Hook disabled');
    });

    test('returns error when transcript path is missing', async () => {
      const input: HookInput = {
        cwd: '/project',
      };

      const result = await preCompactHook(input, {
        isHookEnabled: () => true,
      });

      expect(result.continue).toBe(true);
      expect(result.success).toBe(false);
      expect(result.message).toBe('No transcript found');
    });

    test("returns error when transcript doesn't exist", async () => {
      mock.module('node:fs', () => ({
        existsSync: () => false,
      }));

      const input: HookInput = {
        transcript_path: '/nonexistent.jsonl',
        cwd: '/project',
      };

      const result = await preCompactHook(input, {
        isHookEnabled: () => true,
      });

      expect(result.continue).toBe(true);
      expect(result.success).toBe(false);
      expect(result.message).toBe('No transcript found');
    });

    test('handles extraction errors gracefully', async () => {
      mock.module('node:fs', () => ({
        existsSync: () => true,
        createReadStream: () => {
          throw new Error('Read error');
        },
      }));

      const input: HookInput = {
        transcript_path: '/path/to/transcript.jsonl',
        cwd: '/project',
      };

      const result = await preCompactHook(input, {
        isHookEnabled: () => true,
      });

      expect(result.continue).toBe(true);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Error:');
    });

    test('processes transcript and returns success message', async () => {
      const mockReadStream = {
        on: mock((event: string, handler: (...args: unknown[]) => void) => {
          if (event === 'close') {
            setTimeout(() => handler(), 0);
          }
          return mockReadStream;
        }),
      };

      const mockReadline = {
        on: mock((event: string, handler: (...args: unknown[]) => void) => {
          if (event === 'line') {
            // Simulate some transcript lines
            handler('{"type":"user","uuid":"1","timestamp":"2025-01-01T00:00:00Z","toolUseResult":"Error: test"}');
            handler('{"type":"assistant","uuid":"2","timestamp":"2025-01-01T00:01:00Z"}');
          }
          if (event === 'close') {
            setTimeout(() => handler(), 10);
          }
          return mockReadline;
        }),
      };

      mock.module('node:fs', () => ({
        existsSync: () => true,
        createReadStream: () => mockReadStream,
        readFileSync: () => '',
        writeFileSync: mock(() => {}),
        unlinkSync: mock(() => {}),
      }));

      mock.module('node:readline', () => ({
        createInterface: () => mockReadline,
      }));

      const _mockExec = mock(() => 'NO NEW LESSONS');

      // Need to import fresh with mocked modules
      const { preCompactHook: freshHook } = await import('./pre-compact');

      const input: HookInput = {
        transcript_path: '/path/to/transcript.jsonl',
        cwd: '/project',
      };

      const result = await freshHook(input, {
        isHookEnabled: () => true,
      });

      expect(result.continue).toBe(true);
      expect(result.success).toBe(true);
      expect(result.message).toContain('error sequences');
    });

    test('extracts and appends error patterns to learned_mistakes.md', async () => {
      const mockExec = mock((cmd: string) => {
        if (cmd.includes('claude')) {
          // Return extracted patterns as bulleted list
          return "- TypeScript error: Property 'foo' does not exist, fixed by adding foo property to interface\n- Always check compilation before committing";
        }
        return '';
      });

      let learnedMistakesContent = '# Learned Mistakes\n\n## Error Patterns\n';

      mock.module('node:fs', () => ({
        existsSync: (_path: string) => true,
        readFileSync: (path: string) => {
          if (path.includes('learned_mistakes')) return learnedMistakesContent;
          return '';
        },
        writeFileSync: (path: string, content: string) => {
          if (path.includes('learned_mistakes')) {
            learnedMistakesContent = content;
          }
        },
        unlinkSync: () => {}, // Mock unlink for temp file cleanup
        createReadStream: () => {
          // Simple mock stream
          return {
            on: (event: string, callback: (...args: unknown[]) => void) => {
              if (event === 'end') setTimeout(() => callback(), 0);
              return { on: () => {} };
            },
          };
        },
      }));

      mock.module('node:readline', () => ({
        createInterface: () => ({
          on: (event: string, callback: (...args: unknown[]) => void) => {
            if (event === 'line') {
              const now = Date.now();
              // Emit error entry
              callback(
                JSON.stringify({
                  uuid: 'error-1',
                  type: 'user',
                  timestamp: new Date(now).toISOString(),
                  toolUseResult: 'Error: TypeScript compilation failed',
                }),
              );

              // First attempt (fails)
              callback(
                JSON.stringify({
                  uuid: 'attempt-1',
                  type: 'assistant',
                  timestamp: new Date(now + 1000).toISOString(),
                  message: {
                    role: 'assistant',
                    content: [
                      {
                        type: 'tool_use',
                        id: 'tool-1',
                        name: 'Bash',
                        input: { command: 'bunx tsc --noEmit' },
                      },
                    ],
                  },
                }),
              );
              callback(
                JSON.stringify({
                  uuid: 'result-1',
                  type: 'user',
                  timestamp: new Date(now + 2000).toISOString(),
                  message: {
                    content: [
                      {
                        type: 'tool_result',
                        tool_use_id: 'tool-1',
                        is_error: true,
                        content: 'Error: Type errors found',
                      },
                    ],
                  },
                }),
              );

              // Second attempt (succeeds)
              callback(
                JSON.stringify({
                  uuid: 'attempt-2',
                  type: 'assistant',
                  timestamp: new Date(now + 3000).toISOString(),
                  message: {
                    role: 'assistant',
                    content: [
                      {
                        type: 'tool_use',
                        id: 'tool-2',
                        name: 'Edit',
                        input: { file_path: 'test.ts', old_string: 'foo', new_string: 'bar' },
                      },
                    ],
                  },
                }),
              );
              callback(
                JSON.stringify({
                  uuid: 'result-2',
                  type: 'user',
                  timestamp: new Date(now + 4000).toISOString(),
                  message: {
                    content: [
                      {
                        type: 'tool_result',
                        tool_use_id: 'tool-2',
                        content: 'File updated successfully',
                      },
                    ],
                  },
                }),
              );
            }
            if (event === 'close') {
              setTimeout(() => callback(), 0);
            }
            return { on: () => {} };
          },
        }),
      }));

      const { analyzeErrorPatterns } = await import('./pre-compact');

      const _input: HookInput = {
        transcript_path: '/transcript.jsonl',
        cwd: '/project',
        session_id: 'test-123',
      };

      // Need to pass the mock exec directly to analyzeErrorPatterns
      // Since preCompactHook doesn't accept deps, we'll test at a slightly lower level
      const { ErrorPatternExtractor } = await import('./pre-compact');
      const logger = createMockLogger();

      const extractor = new ErrorPatternExtractor(logger);
      const sequences = await extractor.extractFromTranscript('/transcript.jsonl');

      if (sequences.length > 0) {
        const patterns = await analyzeErrorPatterns(sequences, '/project', logger, mockExec);
        const { updateLearnedMistakes } = await import('./pre-compact');
        await updateLearnedMistakes('/project', patterns);
      }

      expect(learnedMistakesContent).toContain('Session:');
      expect(learnedMistakesContent).toContain('TypeScript error');
    });
  });
});
