// ABOUTME: Tests for the PowerShell guidance hook
// ABOUTME: Verifies Linux command conversion and rejection with guidance

import { describe, expect, test } from 'bun:test';
import { powershellGuidanceHook } from './powershell-guidance';

describe('powershellGuidanceHook', () => {
  const mockEnabled = () => true;
  const mockDisabled = () => false;

  describe('platform detection', () => {
    test('approves all commands on non-Windows platforms', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'cat file.txt' } },
        { isEnabled: mockEnabled, platform: 'linux' },
      );

      expect(result.decision).toBe('approve');
    });

    test('approves all commands on macOS', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'grep pattern file' } },
        { isEnabled: mockEnabled, platform: 'darwin' },
      );

      expect(result.decision).toBe('approve');
    });
  });

  describe('config check', () => {
    test('approves all commands when hook is disabled', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'cat file.txt' } },
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
    test('approves non-file, non-Bash tools', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Grep', tool_input: { pattern: 'test' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('approve');
    });

    test('approves commands without command property', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { other: 'value' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('approve');
    });
  });

  describe('PowerShell passthrough', () => {
    test('approves Get-* cmdlets', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'Get-ChildItem' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('approve');
    });

    test('approves Set-* cmdlets', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'Set-Content file.txt -Value "text"' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('approve');
    });

    test('approves $env: variables', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'echo $env:USERPROFILE' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('approve');
    });

    test('approves Invoke-* cmdlets', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'Invoke-WebRequest -Uri "http://example.com"' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('approve');
    });
  });

  describe('simple conversions', () => {
    test('converts cat to Get-Content', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'cat file.txt' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('Get-Content file.txt');
    });

    test('converts which to Get-Command', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'which node' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('Get-Command node');
    });

    test('converts pwd to Get-Location', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'pwd' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('Get-Location');
    });

    test('converts rm -rf to Remove-Item -Recurse -Force', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'rm -rf node_modules' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('Remove-Item -Recurse -Force node_modules');
    });

    test('converts rm -r to Remove-Item -Recurse', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'rm -r folder' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('Remove-Item -Recurse folder');
    });

    test('converts simple rm to Remove-Item', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'rm file.txt' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('Remove-Item file.txt');
    });

    test('converts cp -r to Copy-Item -Recurse', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'cp -r src dest' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('Copy-Item -Recurse src dest');
    });

    test('converts simple cp to Copy-Item', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'cp file1.txt file2.txt' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('Copy-Item file1.txt file2.txt');
    });

    test('converts mv to Move-Item', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'mv old.txt new.txt' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('Move-Item old.txt new.txt');
    });

    test('converts mkdir -p to New-Item -ItemType Directory -Force', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'mkdir -p path/to/dir' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('New-Item -ItemType Directory -Force path/to/dir');
    });

    test('converts touch to New-Item', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'touch newfile.txt' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('New-Item newfile.txt -ItemType File -Force');
    });

    test('converts head -n to Get-Content -Head', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'head -n 10 file.txt' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('Get-Content file.txt -Head 10');
    });

    test('converts head -N shorthand to Get-Content -Head', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'head -5 file.txt' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('Get-Content file.txt -Head 5');
    });

    test('converts tail -n to Get-Content -Tail', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'tail -n 20 log.txt' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('Get-Content log.txt -Tail 20');
    });

    test('converts tail -N shorthand to Get-Content -Tail', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'tail -100 log.txt' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('Get-Content log.txt -Tail 100');
    });
  });

  describe('rejection with guidance', () => {
    test('rejects grep with guidance', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'grep pattern file.txt' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('grep is a Unix command');
      expect(result.reason).toContain('Select-String');
    });

    test('rejects sed with guidance', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: "sed 's/old/new/g' file.txt" } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('sed is a Unix command');
      expect(result.reason).toContain('-replace');
    });

    test('rejects awk with guidance', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: "awk '{print $1}' file.txt" } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('awk is a Unix command');
      expect(result.reason).toContain('ForEach-Object');
    });

    test('rejects chmod with guidance', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'chmod +x script.sh' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('chmod has no Windows equivalent');
      expect(result.reason).toContain('icacls');
    });

    test('rejects chown with guidance', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'chown user:group file.txt' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('chown has no Windows equivalent');
    });

    test('rejects export with guidance', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'export PATH=$PATH:/new/path' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('export is bash syntax');
      expect(result.reason).toContain('$env:');
    });

    test('rejects /dev/null with guidance', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'some-command > /dev/null' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('/dev/null is a Unix device');
      expect(result.reason).toContain('$null');
    });

    test('rejects Unix paths with guidance', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'ls /home/user/documents' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('Unix path detected');
      expect(result.reason).toContain('$env:USERPROFILE');
    });

    test('rejects /tmp path with guidance', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'ls /tmp/something' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('Unix path detected');
      expect(result.reason).toContain('$env:TEMP');
    });

    test('rejects bash -c with guidance', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'bash -c "echo hello"' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('bash/sh is not available on Windows');
    });

    test('rejects /bin/bash with guidance', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: '/bin/bash script.sh' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('bash/sh is not available on Windows');
    });

    test('rejects xargs with guidance', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'ls *.txt | xargs wc -l' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('xargs is a Unix command');
      expect(result.reason).toContain('ForEach-Object');
    });

    test('rejects wget with guidance', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'wget http://example.com/file' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('wget is not installed by default');
      expect(result.reason).toContain('Invoke-WebRequest');
    });

    test('rejects ln -s with guidance', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'ln -s target link' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('ln -s is Unix symlink syntax');
      expect(result.reason).toContain('New-Item -ItemType SymbolicLink');
    });

    test('rejects ps aux with guidance', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'ps aux' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('ps aux is Unix process listing');
      expect(result.reason).toContain('Get-Process');
    });
  });

  describe('complex command detection', () => {
    test('approves complex commands without rejection patterns', async () => {
      // This command is complex but doesn't match rejection patterns
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'node script.js && npm test' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('approve');
    });

    test('rejects complex commands with rejection patterns', async () => {
      const result = await powershellGuidanceHook(
        { tool_name: 'Bash', tool_input: { command: 'cat file.txt | grep pattern | awk "{print $1}"' } },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('block');
      // Should mention it's too complex to convert
      expect(result.reason).toContain('too complex');
    });
  });

  describe('preserves other tool_input properties', () => {
    test('preserves description in modified output', async () => {
      const result = await powershellGuidanceHook(
        {
          tool_name: 'Bash',
          tool_input: {
            command: 'cat file.txt',
            description: 'Read file contents',
            timeout: 5000,
          },
        },
        { isEnabled: mockEnabled, platform: 'win32' },
      );

      expect(result.decision).toBe('modify');
      expect(result.modified_tool_input?.command).toBe('Get-Content file.txt');
      expect(result.modified_tool_input?.description).toBe('Read file contents');
      expect(result.modified_tool_input?.timeout).toBe(5000);
    });
  });
});
