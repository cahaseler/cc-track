// ABOUTME: PreToolUse hook for Windows that provides two main functions:
// ABOUTME: 1. Converts Linux/bash commands to PowerShell equivalents or rejects with guidance
// ABOUTME: 2. Normalizes file paths to Windows backslash format (workaround for Claude Code #7918)
// ABOUTME: Only active when explicitly enabled in track.config.json

import { existsSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { join } from 'node:path/posix';
import { createLogger } from '../skills/cc-track-tools/lib/logger';

const logger = createLogger('powershell-guidance');

interface HookInput {
  tool_name: string;
  tool_input: {
    command?: string;
    file_path?: string;
    [key: string]: unknown;
  };
}

interface HookResult {
  decision: 'block' | 'approve' | 'modify';
  reason?: string;
  modified_tool_input?: {
    command?: string;
    file_path?: string;
    [key: string]: unknown;
  };
}

// File tools that use file_path parameter
const FILE_TOOLS = ['Edit', 'Write', 'Read', 'MultiEdit'];

// Simple command conversions - these are safe to auto-convert
// Format: [regex pattern, replacement function or string]
type ConversionRule = {
  pattern: RegExp;
  convert: (match: RegExpMatchArray) => string;
  description: string;
};

const SIMPLE_CONVERSIONS: ConversionRule[] = [
  // cat file → Get-Content file
  {
    pattern: /^cat\s+(.+)$/,
    convert: (m) => `Get-Content ${m[1]}`,
    description: 'cat → Get-Content',
  },
  // which command → Get-Command command
  {
    pattern: /^which\s+(\S+)$/,
    convert: (m) => `Get-Command ${m[1]}`,
    description: 'which → Get-Command',
  },
  // pwd → Get-Location
  {
    pattern: /^pwd$/,
    convert: () => 'Get-Location',
    description: 'pwd → Get-Location',
  },
  // rm -rf dir → Remove-Item -Recurse -Force dir
  {
    pattern: /^rm\s+-rf\s+(.+)$/,
    convert: (m) => `Remove-Item -Recurse -Force ${m[1]}`,
    description: 'rm -rf → Remove-Item -Recurse -Force',
  },
  // rm -r dir → Remove-Item -Recurse dir
  {
    pattern: /^rm\s+-r\s+(.+)$/,
    convert: (m) => `Remove-Item -Recurse ${m[1]}`,
    description: 'rm -r → Remove-Item -Recurse',
  },
  // rm file → Remove-Item file
  {
    pattern: /^rm\s+([^-].*)$/,
    convert: (m) => `Remove-Item ${m[1]}`,
    description: 'rm → Remove-Item',
  },
  // cp -r src dst → Copy-Item -Recurse src dst
  {
    pattern: /^cp\s+-r\s+(\S+)\s+(\S+)$/,
    convert: (m) => `Copy-Item -Recurse ${m[1]} ${m[2]}`,
    description: 'cp -r → Copy-Item -Recurse',
  },
  // cp src dst → Copy-Item src dst
  {
    pattern: /^cp\s+(\S+)\s+(\S+)$/,
    convert: (m) => `Copy-Item ${m[1]} ${m[2]}`,
    description: 'cp → Copy-Item',
  },
  // mv src dst → Move-Item src dst
  {
    pattern: /^mv\s+(\S+)\s+(\S+)$/,
    convert: (m) => `Move-Item ${m[1]} ${m[2]}`,
    description: 'mv → Move-Item',
  },
  // mkdir -p dir → New-Item -ItemType Directory -Force dir
  {
    pattern: /^mkdir\s+-p\s+(.+)$/,
    convert: (m) => `New-Item -ItemType Directory -Force ${m[1]}`,
    description: 'mkdir -p → New-Item -ItemType Directory -Force',
  },
  // touch file → New-Item file -ItemType File -Force
  {
    pattern: /^touch\s+(.+)$/,
    convert: (m) => `New-Item ${m[1]} -ItemType File -Force`,
    description: 'touch → New-Item -ItemType File -Force',
  },
  // head -n N file → Get-Content file -Head N
  {
    pattern: /^head\s+-n\s*(\d+)\s+(.+)$/,
    convert: (m) => `Get-Content ${m[2]} -Head ${m[1]}`,
    description: 'head -n → Get-Content -Head',
  },
  // head -N file → Get-Content file -Head N
  {
    pattern: /^head\s+-(\d+)\s+(.+)$/,
    convert: (m) => `Get-Content ${m[2]} -Head ${m[1]}`,
    description: 'head -N → Get-Content -Head',
  },
  // tail -n N file → Get-Content file -Tail N
  {
    pattern: /^tail\s+-n\s*(\d+)\s+(.+)$/,
    convert: (m) => `Get-Content ${m[2]} -Tail ${m[1]}`,
    description: 'tail -n → Get-Content -Tail',
  },
  // tail -N file → Get-Content file -Tail N
  {
    pattern: /^tail\s+-(\d+)\s+(.+)$/,
    convert: (m) => `Get-Content ${m[2]} -Tail ${m[1]}`,
    description: 'tail -N → Get-Content -Tail',
  },
];

// Patterns that should be rejected with guidance
type RejectionRule = {
  pattern: RegExp;
  message: string;
  suggestion: string;
};

const REJECTION_PATTERNS: RejectionRule[] = [
  // grep
  {
    pattern: /\bgrep\s+/,
    message: 'grep is a Unix command',
    suggestion:
      'Use Select-String instead:\n  Select-String -Pattern "pattern" file.txt\n  Get-Content file.txt | Select-String "pattern"',
  },
  // sed
  {
    pattern: /\bsed\s+/,
    message: 'sed is a Unix command',
    suggestion:
      'Use PowerShell string replacement:\n  (Get-Content file.txt) -replace "old","new" | Set-Content file.txt\n  Or for inline: (Get-Content file.txt).Replace("old","new")',
  },
  // awk
  {
    pattern: /\bawk\s+/,
    message: 'awk is a Unix command',
    suggestion:
      'Use PowerShell for text processing:\n  Get-Content file.txt | ForEach-Object { $_.Split()[0] }  # first column\n  Import-Csv file.csv | Select-Object ColumnName',
  },
  // find (Unix)
  {
    pattern: /^find\s+\S+\s+-/,
    message: 'find with options is Unix syntax',
    suggestion:
      'Use Get-ChildItem:\n  Get-ChildItem -Recurse -Filter "*.txt"  # find by name\n  Get-ChildItem -Recurse | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) }  # by date',
  },
  // chmod
  {
    pattern: /\bchmod\s+/,
    message: 'chmod has no Windows equivalent',
    suggestion:
      'Windows uses ACLs for permissions:\n  icacls file.txt /grant Users:R  # grant read\n  Or use: Set-Acl, Get-Acl cmdlets',
  },
  // chown
  {
    pattern: /\bchown\s+/,
    message: 'chown has no Windows equivalent',
    suggestion:
      'Windows uses ACLs for ownership:\n  icacls file.txt /setowner "Username"\n  Or use: Set-Acl cmdlet with owner property',
  },
  // export VAR=val
  {
    pattern: /^export\s+(\w+)=(.*)$/,
    message: 'export is bash syntax',
    suggestion:
      'Use PowerShell environment variable syntax:\n  $env:VAR_NAME = "value"\n  Or for session: [Environment]::SetEnvironmentVariable("VAR", "value", "Process")',
  },
  // source file
  {
    pattern: /^source\s+/,
    message: 'source is bash syntax',
    suggestion: 'Use dot-sourcing in PowerShell:\n  . .\\script.ps1\n  Or: & .\\script.ps1',
  },
  // /bin/bash, /bin/sh, bash -c, sh -c
  {
    pattern: /(?:\/bin\/(?:ba)?sh|^(?:ba)?sh\s+-c)/,
    message: 'bash/sh is not available on Windows',
    suggestion:
      'Run PowerShell commands directly without a shell wrapper.\nIf you need to run a script: powershell -Command "your commands"',
  },
  // /dev/null
  {
    pattern: /\/dev\/null/,
    message: '/dev/null is a Unix device',
    suggestion:
      'Use $null in PowerShell:\n  command > $null  # discard stdout\n  command 2> $null  # discard stderr\n  command *> $null  # discard all output',
  },
  // Unix absolute paths
  {
    pattern: /(?:^|\s)\/(?:home|tmp|etc|var|usr|opt|bin|sbin)\//,
    message: 'Unix path detected',
    suggestion:
      'Use Windows paths:\n  /home/user → C:\\Users\\username or $env:USERPROFILE\n  /tmp → $env:TEMP or C:\\Users\\username\\AppData\\Local\\Temp\n  /etc → C:\\ProgramData or application-specific config',
  },
  // Shebang
  {
    pattern: /^#!\/(?:bin|usr)/,
    message: 'Shebang is Unix syntax',
    suggestion: "PowerShell scripts use .ps1 extension and don't need shebangs.\nJust run: .\\script.ps1",
  },
  // xargs
  {
    pattern: /\|\s*xargs\s+/,
    message: 'xargs is a Unix command',
    suggestion:
      'Use ForEach-Object in PowerShell:\n  Get-ChildItem *.txt | ForEach-Object { Remove-Item $_ }\n  Or: Get-ChildItem *.txt | Remove-Item  # many cmdlets accept pipeline input',
  },
  // curl with Unix options (complex)
  {
    pattern: /\bcurl\s+.*-[sSkLo]/,
    message: 'curl with these options may behave differently on Windows',
    suggestion:
      'Use Invoke-WebRequest or Invoke-RestMethod:\n  Invoke-WebRequest -Uri "url" -OutFile "file"\n  Invoke-RestMethod -Uri "url"  # for JSON APIs\n  Or use curl.exe (note the .exe) which is the actual curl',
  },
  // wget
  {
    pattern: /\bwget\s+/,
    message: 'wget is not installed by default on Windows',
    suggestion:
      'Use Invoke-WebRequest:\n  Invoke-WebRequest -Uri "url" -OutFile "filename"\n  Or: curl.exe -o filename url',
  },
  // tar with Unix paths
  {
    pattern: /\btar\s+.*\s+\/[a-z]/i,
    message: 'tar with Unix paths',
    suggestion:
      'tar is available on Windows but use Windows paths:\n  tar -xzf archive.tar.gz -C C:\\destination\n  Or use Expand-Archive for .zip: Expand-Archive -Path file.zip -DestinationPath folder',
  },
  // ln -s (symlinks)
  {
    pattern: /\bln\s+-s\s+/,
    message: 'ln -s is Unix symlink syntax',
    suggestion:
      'Use New-Item for symlinks (requires admin or Developer Mode):\n  New-Item -ItemType SymbolicLink -Path "link" -Target "target"\n  Or mklink: cmd /c mklink "link" "target"',
  },
  // ps aux style
  {
    pattern: /\bps\s+aux/,
    message: 'ps aux is Unix process listing syntax',
    suggestion:
      'Use Get-Process:\n  Get-Process  # list all processes\n  Get-Process -Name "name"  # specific process\n  Get-Process | Where-Object { $_.CPU -gt 10 }  # filter',
  },
  // kill with signal
  {
    pattern: /\bkill\s+-\d+\s+/,
    message: 'kill with signal is Unix syntax',
    suggestion:
      'Use Stop-Process:\n  Stop-Process -Id 1234\n  Stop-Process -Name "processname"\n  Stop-Process -Id 1234 -Force  # force kill',
  },
  // df -h
  {
    pattern: /\bdf\s+-h/,
    message: 'df is a Unix command',
    suggestion:
      'Use Get-Volume or Get-PSDrive:\n  Get-Volume  # disk space info\n  Get-PSDrive -PSProvider FileSystem  # drive info',
  },
  // du -sh
  {
    pattern: /\bdu\s+-[sh]/,
    message: 'du is a Unix command',
    suggestion:
      'Use PowerShell to calculate folder size:\n  (Get-ChildItem -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB',
  },
];

// Check if command contains chained operations that might be too complex to convert
function isComplexCommand(command: string): boolean {
  // Multiple pipes with different commands
  const pipeCount = (command.match(/\|/g) || []).length;
  if (pipeCount > 1) return true;

  // Command substitution with backticks (bash style)
  if (command.includes('`') && !command.includes('``')) return true;

  // Complex redirections
  if (/\d>&\d/.test(command) && !/2>&1/.test(command)) return true;

  // Process substitution
  if (/<\(|>\(/.test(command)) return true;

  // Here documents
  if (/<<[-']?\w+/.test(command)) return true;

  // Subshells
  if (/\(\s*[^)]+\s*\)/.test(command) && !/\$\(/.test(command)) return true;

  return false;
}

// Try to convert a simple command
function tryConvert(command: string): { converted: string; description: string } | null {
  const trimmed = command.trim();

  for (const rule of SIMPLE_CONVERSIONS) {
    const match = trimmed.match(rule.pattern);
    if (match) {
      return {
        converted: rule.convert(match),
        description: rule.description,
      };
    }
  }

  return null;
}

// Check if command matches any rejection pattern
function checkRejection(command: string): RejectionRule | null {
  for (const rule of REJECTION_PATTERNS) {
    if (rule.pattern.test(command)) {
      return rule;
    }
  }
  return null;
}

// Load config to check if hook is enabled
function isHookEnabled(): boolean {
  try {
    // Look for track.config.json in current directory or parents
    let searchPath = process.cwd();

    while (true) {
      const configPath = join(searchPath, '.cc-track', 'track.config.json');
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        return config?.hooks?.powershell_guidance?.enabled === true;
      }

      const parentPath = dirname(searchPath);
      if (parentPath === searchPath) break;
      searchPath = parentPath;
    }

    return false;
  } catch {
    return false;
  }
}

// Main hook function
export async function powershellGuidanceHook(
  input: HookInput,
  deps: {
    isEnabled?: () => boolean;
    platform?: string;
  } = {},
): Promise<HookResult> {
  const isEnabled = deps.isEnabled || isHookEnabled;
  const platform = deps.platform || process.platform;

  // Only run on Windows
  if (platform !== 'win32') {
    return { decision: 'approve' };
  }

  // Only run if explicitly enabled
  if (!isEnabled()) {
    return { decision: 'approve' };
  }

  // Handle file tools - normalize paths to backslashes on Windows
  // This works around Claude Code bug #7918 where Edit fails with forward slashes
  if (FILE_TOOLS.includes(input.tool_name)) {
    const filePath = input.tool_input.file_path;
    if (filePath && typeof filePath === 'string' && filePath.includes('/')) {
      const normalizedPath = filePath.replace(/\//g, '\\');
      logger.info('Normalizing file path to Windows format', {
        original: filePath,
        normalized: normalizedPath,
        tool: input.tool_name,
      });
      return {
        decision: 'modify',
        reason: `Normalized path separators to Windows format (workaround for Claude Code #7918)`,
        modified_tool_input: {
          ...input.tool_input,
          file_path: normalizedPath,
        },
      };
    }
    return { decision: 'approve' };
  }

  // Only intercept Bash tool for command conversion
  if (input.tool_name !== 'Bash') {
    return { decision: 'approve' };
  }

  const command = input.tool_input.command;
  if (!command || typeof command !== 'string') {
    return { decision: 'approve' };
  }

  logger.debug('Checking command', { command });

  // Skip if command is already PowerShell-ish
  if (
    command.includes('Get-') ||
    command.includes('Set-') ||
    command.includes('New-') ||
    command.includes('Remove-Item') ||
    command.includes('$env:') ||
    command.includes('Invoke-')
  ) {
    return { decision: 'approve' };
  }

  // Check if it's too complex to safely convert
  if (isComplexCommand(command)) {
    const rejection = checkRejection(command);
    if (rejection) {
      logger.info('Blocking complex command with Unix patterns', { command });
      return {
        decision: 'block',
        reason: `${rejection.message}. This command is too complex to auto-convert.\n\n${rejection.suggestion}`,
      };
    }
    // Complex but no specific rejection - let it through, it'll fail with a clear error
    return { decision: 'approve' };
  }

  // Try simple conversion first
  const conversion = tryConvert(command);
  if (conversion) {
    logger.info('Converting command', {
      original: command,
      converted: conversion.converted,
      rule: conversion.description,
    });
    return {
      decision: 'modify',
      reason: `Converted Linux command to PowerShell (${conversion.description})`,
      modified_tool_input: {
        ...input.tool_input,
        command: conversion.converted,
      },
    };
  }

  // Check for patterns that should be rejected with guidance
  const rejection = checkRejection(command);
  if (rejection) {
    logger.info('Blocking command with guidance', { command, message: rejection.message });
    return {
      decision: 'block',
      reason: `${rejection.message}\n\n${rejection.suggestion}`,
    };
  }

  // No issues found - approve
  return { decision: 'approve' };
}

// CLI entry point for Claude Code hook system
async function main() {
  try {
    const input = await new Promise<string>((resolve) => {
      let data = '';
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });
      process.stdin.on('end', () => {
        resolve(data);
      });
    });

    const hookInput: HookInput = JSON.parse(input);
    const result = await powershellGuidanceHook(hookInput);

    if (result.decision === 'block') {
      // Output the blocking message
      console.log(
        JSON.stringify({
          error: result.reason,
        }),
      );
      process.exit(2); // Exit code 2 = block
    } else if (result.decision === 'modify') {
      // Output the modified input
      console.log(
        JSON.stringify({
          tool_input: result.modified_tool_input,
          message: result.reason,
        }),
      );
      process.exit(0);
    } else {
      // Approve - just exit cleanly
      process.exit(0);
    }
  } catch (error) {
    logger.error('Hook error', { error });
    // On error, don't block - let the command through
    process.exit(0);
  }
}

// CLI entrypoint - only run when executed directly, not when imported
if (import.meta.main) {
  main();
}
