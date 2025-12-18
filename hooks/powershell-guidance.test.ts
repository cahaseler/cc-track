// ABOUTME: Tests for the PowerShell guidance hook
// ABOUTME: Verifies path normalization for Windows (Claude Code bug #7918 workaround)

import { describe, expect, test } from 'bun:test';
import { powershellGuidanceHook } from './powershell-guidance';

describe('powershellGuidanceHook', () => {
  const mockEnabled = () => true;
  const mockDisabled = () => false;

  describe('platform detection', () => {
    test('approves all tools on non-Windows platforms', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Edit', tool_input: { file_path: 'D:/test/file.ts' } },
        { isEnabled: mockEnabled, platform: 'linux' },
      );

      expect(result.decision).toBe('approve');
    });

    test('approves all tools on macOS', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Edit', tool_input: { file_path: '/home/user/file.ts' } },
        { isEnabled: mockEnabled, platform: 'darwin' },
      );

      expect(result.decision).toBe('approve');
    });
  });

  describe('config check', () => {
    test('approves all tools when hook is disabled', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Edit', tool_input: { file_path: 'D:/test/file.ts' } },
        { isEnabled: mockDisabled, platform: 'win32' },
      );

      expect(result.decision).toBe('approve');
    });
  });

  describe('file path normalization (workaround for Claude Code #7918)', () => {
    test('normalizes forward slashes to backslashes in Edit tool', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Edit', tool_input: { file_path: 'D:/repos/project/file.ts', old_string: 'a', new_string: 'b' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.file_path).toBe('D:\\repos\\project\\file.ts');
      expect(result.modified_tool_input?.old_string).toBe('a');
    });

    test('normalizes forward slashes in Write tool', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Write', tool_input: { file_path: 'C:/Users/test/file.txt', content: 'hello' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.file_path).toBe('C:\\Users\\test\\file.txt');
      expect(result.modified_tool_input?.content).toBe('hello');
    });

    test('normalizes forward slashes in Read tool', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Read', tool_input: { file_path: 'D:/Development/pars/cc-track/src/index.ts' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.file_path).toBe('D:\\Development\\pars\\cc-track\\src\\index.ts');
    });

    test('normalizes forward slashes in MultiEdit tool', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'MultiEdit', tool_input: { file_path: 'src/lib/config.ts', edits: [] } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.file_path).toBe('src\\lib\\config.ts');
    });

    test('approves file tools that already use backslashes', async () => {
      const result = await powershellGuidanceHook(
        {
          tool_name: 'Edit',
          tool_input: { file_path: 'D:\\repos\\project\\file.ts', old_string: 'a', new_string: 'b' },
        },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('approve');
    });

    test('does not normalize paths on non-Windows platforms', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Edit', tool_input: { file_path: '/home/user/file.ts', old_string: 'a', new_string: 'b' } },
        { isEnabled: mockEnabled, platform: 'linux' },
      );

      expect(result.decision).toBe('approve');
    });

    test('does not normalize paths when hook is disabled', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Edit', tool_input: { file_path: 'D:/repos/file.ts', old_string: 'a', new_string: 'b' } },
        { isEnabled: mockDisabled, platform: 'win32' },
      );

      expect(result.decision).toBe('approve');
    });
  });

  describe('tool filtering', () => {
    test('approves non-file tools', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Grep', tool_input: { pattern: 'test' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('approve');
    });

    test('approves Bash tool (no command conversion)', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'cat file.txt' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('approve');
    });

    test('approves file tools without file_path', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Edit', tool_input: { other: 'value' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('approve');
    });
  });

  describe('preserves other tool_input properties', () => {
    test('preserves all properties in modified output', async () => {
      const result = await powershellGuidanceHook(
        {
          tool_name: 'Edit',
          tool_input: {
            file_path: 'D:/test/file.ts',
            old_string: 'foo',
            new_string: 'bar',
            replace_all: true,
          },
        },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.file_path).toBe('D:\\test\\file.ts');
      expect(result.modified_tool_input?.old_string).toBe('foo');
      expect(result.modified_tool_input?.new_string).toBe('bar');
      expect(result.modified_tool_input?.replace_all).toBe(true);
    });
  });
});
