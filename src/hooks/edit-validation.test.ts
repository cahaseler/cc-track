import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { HookInput } from '../types';
import {
  editValidationHook,
  extractFilePaths,
  filterTypeScriptFiles,
  formatValidationResults,
} from './edit-validation';

describe('edit-validation', () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('extractFilePaths', () => {
    test('extracts path from Edit tool', () => {
      const paths = extractFilePaths('Edit', { file_path: '/test/file.ts' });
      expect(paths).toEqual(['/test/file.ts']);
    });

    test('extracts path from Write tool', () => {
      const paths = extractFilePaths('Write', { file_path: '/test/new.ts' });
      expect(paths).toEqual(['/test/new.ts']);
    });

    test('extracts path from MultiEdit tool', () => {
      const paths = extractFilePaths('MultiEdit', { file_path: '/test/multi.ts' });
      expect(paths).toEqual(['/test/multi.ts']);
    });

    test('returns empty array for other tools', () => {
      const paths = extractFilePaths('Read', { file_path: '/test/file.ts' });
      expect(paths).toEqual([]);
    });

    test('returns empty array when no file_path', () => {
      const paths = extractFilePaths('Edit', { other_field: 'value' });
      expect(paths).toEqual([]);
    });
  });

  describe('filterTypeScriptFiles', () => {
    test('filters .ts files', () => {
      const files = filterTypeScriptFiles(['/test/file.ts', '/test/file.js', '/test/other.ts']);
      expect(files).toEqual(['/test/file.ts', '/test/other.ts']);
    });

    test('includes .tsx files', () => {
      const files = filterTypeScriptFiles(['/test/component.tsx', '/test/file.jsx']);
      expect(files).toEqual(['/test/component.tsx']);
    });

    test('includes .mts and .cts files', () => {
      const files = filterTypeScriptFiles(['/test/module.mts', '/test/common.cts', '/test/file.mjs']);
      expect(files).toEqual(['/test/module.mts', '/test/common.cts']);
    });

    test('returns empty array when no TypeScript files', () => {
      const files = filterTypeScriptFiles(['/test/file.js', '/test/style.css', '/test/doc.md']);
      expect(files).toEqual([]);
    });
  });

  describe('formatValidationResults', () => {
    test('formats single file with errors', () => {
      const results = [
        {
          fileName: 'test.ts',
          errors: ['Line 10: Missing semicolon', 'Line 15: Unused variable'],
        },
      ];

      const formatted = formatValidationResults(results);
      expect(formatted).toContain('Issues in test.ts:');
      expect(formatted).toContain('  - Line 10: Missing semicolon');
      expect(formatted).toContain('  - Line 15: Unused variable');
    });

    test('formats multiple files with errors', () => {
      const results = [
        {
          fileName: 'file1.ts',
          errors: ['Error 1'],
        },
        {
          fileName: 'file2.ts',
          errors: ['Error 2'],
        },
      ];

      const formatted = formatValidationResults(results);
      expect(formatted).toContain('Issues in file1.ts:');
      expect(formatted).toContain('Issues in file2.ts:');
    });

    test('returns empty string for no results', () => {
      const formatted = formatValidationResults([]);
      expect(formatted).toBe('');
    });
  });

  describe('editValidationHook', () => {
    test('returns continue when hook is disabled', async () => {
      const input: HookInput = {
        tool_name: 'Edit',
        tool_input: { file_path: '/test/file.ts' },
        tool_response: { success: true },
        cwd: '/test',
      };

      const result = await editValidationHook(input, {
        isHookEnabled: () => false,
      });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    test('returns continue when tool execution failed', async () => {
      const input: HookInput = {
        tool_name: 'Edit',
        tool_input: { file_path: '/test/file.ts' },
        tool_response: { success: false },
        cwd: '/test',
      };

      const result = await editValidationHook(input, {
        isHookEnabled: () => true,
      });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    test('returns continue when no TypeScript files', async () => {
      const input: HookInput = {
        tool_name: 'Edit',
        tool_input: { file_path: '/test/file.js' },
        tool_response: { success: true },
        cwd: '/test',
      };

      const result = await editValidationHook(input, {
        isHookEnabled: () => true,
      });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    test('handles errors gracefully', async () => {
      const input: HookInput = {
        tool_name: 'Edit',
        tool_input: { file_path: '/test/file.ts' },
        tool_response: { success: true },
        cwd: '/test',
      };

      const result = await editValidationHook(input, {
        isHookEnabled: () => {
          throw new Error('Config error');
        },
      });
      expect(result.continue).toBe(true);
    });

    test('blocks edit when TypeScript validation fails', async () => {
      // Mock execSync to return TypeScript errors
      const mockExec = mock((cmd: string) => {
        if (cmd.includes('tsc')) {
          const error: any = new Error('Command failed');
          error.stderr = "test.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.";
          throw error;
        }
        return '';
      });

      const input: HookInput = {
        tool_name: 'Edit',
        tool_input: { file_path: '/test/test.ts' },
        tool_response: { success: true },
        cwd: '/test',
      };

      const result = await editValidationHook(input, {
        execSync: mockExec,
        existsSync: () => true,
        isHookEnabled: () => true,
        loadEditValidationConfig: () => ({
          enabled: true,
          description: 'test',
          typecheck: { enabled: true, command: 'tsc' },
          lint: { enabled: true, command: 'biome' },
        }),
      });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('TypeScript/Biome validation failed');
      expect(result.reason).toContain("Type 'string' is not assignable to type 'number'");
    });

    test('blocks edit when Biome linting fails', async () => {
      // Mock execSync - TypeScript passes, Biome fails
      const mockExec = mock((cmd: string) => {
        if (cmd.includes('tsc')) {
          return ''; // TypeScript passes
        }
        if (cmd.includes('biome')) {
          const error: any = new Error('Command failed');
          error.stdout = '/test/test.ts:15:10 lint/suspicious/noExplicitAny Unexpected any. Specify a different type.';
          throw error;
        }
        return '';
      });

      const input: HookInput = {
        tool_name: 'Edit',
        tool_input: { file_path: '/test/test.ts' },
        tool_response: { success: true },
        cwd: '/test',
      };

      const result = await editValidationHook(input, {
        execSync: mockExec,
        existsSync: () => true,
        isHookEnabled: () => true,
        loadEditValidationConfig: () => ({
          enabled: true,
          description: 'test',
          typecheck: { enabled: true, command: 'tsc' },
          lint: { enabled: true, command: 'biome' },
        }),
      });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('TypeScript/Biome validation failed');
      expect(result.reason).toContain('Unexpected any');
    });

    test('allows edit when all validation passes', async () => {
      // Mock execSync - everything passes
      const mockExec = mock((_cmd: string) => {
        return ''; // Both TypeScript and Biome pass
      });

      const input: HookInput = {
        tool_name: 'Edit',
        tool_input: { file_path: '/test/test.ts' },
        tool_response: { success: true },
        cwd: '/test',
      };

      const result = await editValidationHook(input, {
        execSync: mockExec,
        existsSync: () => true,
        isHookEnabled: () => true,
        loadEditValidationConfig: () => ({
          enabled: true,
          description: 'test',
          typecheck: { enabled: true, command: 'tsc' },
          lint: { enabled: true, command: 'biome' },
        }),
      });
      expect(result.continue).toBe(true);
      expect(result.decision).toBeUndefined();
      expect(result.reason).toBeUndefined();
    });

    test('uses configured commands from track.config.json', async () => {
      const executedCommands: string[] = [];
      const mockExec = mock((cmd: string) => {
        executedCommands.push(cmd);
        return ''; // All validation passes
      });

      const input: HookInput = {
        tool_name: 'Edit',
        tool_input: { file_path: '/test/test.ts' },
        tool_response: { success: true },
        cwd: '/test',
      };

      const result = await editValidationHook(input, {
        execSync: mockExec,
        existsSync: () => true,
        isHookEnabled: () => true,
        loadEditValidationConfig: () => ({
          enabled: true,
          description: 'test',
          typecheck: { enabled: true, command: 'bunx tsc --noEmit' },
          lint: { enabled: true, command: 'bunx biome check --write' },
        }),
      });

      expect(result.continue).toBe(true);
      // Verify the configured commands were used, not hardcoded ones
      expect(executedCommands).toContain('bunx tsc --noEmit "/test/test.ts"');
      expect(executedCommands).toContain('bunx biome check --write "/test/test.ts" --reporter=compact');
    });

    test('handles MultiEdit with multiple files', async () => {
      // Mock execSync - one file fails, one passes
      const mockExec = mock((cmd: string) => {
        if (cmd.includes('file1.ts')) {
          const error: any = new Error('Command failed');
          error.stderr = "file1.ts(5,3): error TS2304: Cannot find name 'undefinedVar'.";
          throw error;
        }
        return '';
      });

      const input: HookInput = {
        tool_name: 'MultiEdit',
        tool_input: {
          file_path: '/test/file1.ts',
          edits: [{ old_string: 'test', new_string: 'test2' }],
        },
        tool_response: { success: true },
        cwd: '/test',
      };

      const result = await editValidationHook(input, {
        execSync: mockExec,
        existsSync: () => true,
        isHookEnabled: () => true,
        loadEditValidationConfig: () => ({
          enabled: true,
          description: 'test',
          typecheck: { enabled: true, command: 'tsc' },
          lint: { enabled: true, command: 'biome' },
        }),
      });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain("Cannot find name 'undefinedVar'");
    });

    test('handles validation timeout', async () => {
      // Mock execSync to simulate timeout
      const mockExec = mock((cmd: string) => {
        if (cmd.includes('tsc')) {
          const error = new Error('Command timed out');
          (error as { code?: string }).code = 'ETIMEDOUT';
          throw error;
        }
        return '';
      });

      const input: HookInput = {
        tool_name: 'Edit',
        tool_input: { file_path: '/test/test.ts' },
        tool_response: { success: true },
        cwd: '/test',
      };

      const result = await editValidationHook(input, {
        execSync: mockExec,
        existsSync: () => true,
        isHookEnabled: () => true,
        loadEditValidationConfig: () => ({
          enabled: true,
          description: 'test',
          typecheck: { enabled: true, command: 'tsc' },
          lint: { enabled: true, command: 'biome' },
        }),
      });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('Validation timeout');
    });

    test('handles file not found errors', async () => {
      // Mock execSync to simulate file not found
      const mockExec = mock(() => {
        const error = new Error('ENOENT: no such file or directory');
        (error as { code?: string }).code = 'ENOENT';
        throw error;
      });

      const input: HookInput = {
        tool_name: 'Write',
        tool_input: { file_path: '/test/new.ts', content: 'const x = 1;' },
        tool_response: { success: true },
        cwd: '/test',
      };

      // For new files, validation should be skipped
      const result = await editValidationHook(input, {
        execSync: mockExec,
        existsSync: () => true,
        isHookEnabled: () => true,
        loadEditValidationConfig: () => ({
          enabled: true,
          description: 'test',
          typecheck: { enabled: true, command: 'tsc' },
          lint: { enabled: true, command: 'biome' },
        }),
      });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });
  });
});
