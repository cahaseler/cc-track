import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createMockClaudeSDK, createMockGitHelpers, createMockLogger } from '../test-utils/command-mocks';
import type { HookInput } from '../types';
import {
  buildValidationPrompt,
  detectOutdatedYear,
  extractDiffInfo,
  extractFilePath,
  getCurrentYear,
  isGitIgnored,
  isHistoricalSearch,
  isTaskFile,
  preToolValidationHook,
} from './pre-tool-validation';

describe('pre-tool-validation', () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('isGitIgnored', () => {
    test('returns true for ignored files', () => {
      const mockExec = mock(() => '');
      expect(isGitIgnored('/path/to/file.log', '/project', mockExec)).toBe(true);
      expect(mockExec).toHaveBeenCalledWith('git check-ignore "/path/to/file.log"', { cwd: '/project', stdio: 'pipe' });
    });

    test('returns false for non-ignored files', () => {
      const mockExec = mock(() => {
        throw new Error('exit code 1');
      });
      expect(isGitIgnored('/path/to/file.ts', '/project', mockExec)).toBe(false);
    });
  });

  describe('extractFilePath', () => {
    test('extracts path from Edit tool', () => {
      expect(extractFilePath('Edit', { file_path: '/test/file.ts' })).toBe('/test/file.ts');
    });

    test('extracts path from Write tool', () => {
      expect(extractFilePath('Write', { file_path: '/test/new.ts' })).toBe('/test/new.ts');
    });

    test('extracts path from MultiEdit tool', () => {
      expect(extractFilePath('MultiEdit', { file_path: '/test/multi.ts' })).toBe('/test/multi.ts');
    });

    test('returns null for other tools', () => {
      expect(extractFilePath('Read', { file_path: '/test/file.ts' })).toBe(null);
    });

    test('returns null when no file_path', () => {
      expect(extractFilePath('Edit', { other_field: 'value' })).toBe(null);
    });
  });

  describe('isTaskFile', () => {
    test('identifies task files correctly', () => {
      expect(isTaskFile('.claude/tasks/TASK_001.md')).toBe(true);
      expect(isTaskFile('/home/user/.claude/tasks/TASK_999.md')).toBe(true);
      expect(isTaskFile('.claude/tasks/TASK_0123.md')).toBe(true);
    });

    test('rejects non-task files', () => {
      expect(isTaskFile('.claude/tasks/README.md')).toBe(false);
      expect(isTaskFile('.claude/TASK_001.md')).toBe(false);
      expect(isTaskFile('src/file.ts')).toBe(false);
      expect(isTaskFile('.claude/tasks/task_001.md')).toBe(false);
    });
  });

  describe('extractDiffInfo', () => {
    test('extracts diff from Edit tool', () => {
      const result = extractDiffInfo('Edit', {
        file_path: '/path/to/file.md',
        old_string: 'old content',
        new_string: 'new content',
      });

      expect(result).toEqual({
        filePath: '/path/to/file.md',
        oldContent: 'old content',
        newContent: 'new content',
      });
    });

    test('extracts diff from MultiEdit tool', () => {
      const result = extractDiffInfo('MultiEdit', {
        file_path: '/path/to/file.md',
        edits: [
          { old_string: 'old1', new_string: 'new1' },
          { old_string: 'old2', new_string: 'new2' },
        ],
      });

      expect(result).toEqual({
        filePath: '/path/to/file.md',
        oldContent: 'old1\n---\nold2',
        newContent: 'new1\n---\nnew2',
      });
    });

    test('returns null for missing file_path', () => {
      expect(extractDiffInfo('Edit', { old_string: 'old', new_string: 'new' })).toBe(null);
    });

    test('returns null for Write tool', () => {
      expect(extractDiffInfo('Write', { file_path: '/path', content: 'content' })).toBe(null);
    });
  });

  describe('buildValidationPrompt', () => {
    test('includes all required elements', () => {
      const prompt = buildValidationPrompt('.claude/tasks/TASK_001.md', 'Status: in_progress', 'Status: completed');

      expect(prompt).toContain('TASK FILE: .claude/tasks/TASK_001.md');
      expect(prompt).toContain('OLD CONTENT:\nStatus: in_progress');
      expect(prompt).toContain('NEW CONTENT:\nStatus: completed');
      expect(prompt).toContain('100% of tests must pass');
      expect(prompt).toContain('weasel words');
    });
  });

  describe('preToolValidationHook - branch protection', () => {
    const createMockConfig = (
      branchProtectionEnabled: boolean,
      options: {
        protectedBranches?: string[];
        allowGitignored?: boolean;
      } = {},
    ) => ({
      hooks: {
        pre_tool_validation: { enabled: true, description: 'test' },
      },
      features: {
        branch_protection: {
          enabled: branchProtectionEnabled,
          description: 'test',
          protected_branches: options.protectedBranches || ['main', 'master'],
          allow_gitignored: options.allowGitignored !== false,
        },
      },
      logging: { enabled: false, level: 'INFO' as const, retentionDays: 7, prettyPrint: false },
    });

    test('blocks edits on protected branch', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '/project/src/file.ts',
          old_string: 'old',
          new_string: 'new',
        },
        cwd: '/project',
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        getConfig: () => createMockConfig(true),
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'main' }),
        execSync: mock(() => {
          throw new Error('not gitignored');
        }),
        logger: createMockLogger(),
      });

      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('Branch Protection');
    });

    test('allows edits on non-protected branch', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '/project/src/file.ts',
          old_string: 'old',
          new_string: 'new',
        },
        cwd: '/project',
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        getConfig: () => createMockConfig(true),
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'feature/my-feature' }),
        logger: createMockLogger(),
      });

      expect(result).toEqual({ continue: true });
    });

    test('allows gitignored files on protected branch when configured', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/.env',
          content: 'SECRET=value',
        },
        cwd: '/project',
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        getConfig: () => createMockConfig(true, { protectedBranches: ['main'] }),
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'main' }),
        execSync: mock(() => ''), // File is gitignored
        logger: createMockLogger(),
      });

      expect(result).toEqual({ continue: true });
    });

    test('blocks gitignored files when allow_gitignored is false', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/.env',
          content: 'SECRET=value',
        },
        cwd: '/project',
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        getConfig: () => createMockConfig(true, { protectedBranches: ['main'], allowGitignored: false }),
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'main' }),
        execSync: mock(() => ''), // File is gitignored
        logger: createMockLogger(),
      });

      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    });

    test('skips branch protection when disabled', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '/project/src/file.ts',
          old_string: 'old',
          new_string: 'new',
        },
        cwd: '/project',
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        getConfig: () => createMockConfig(false, { protectedBranches: ['main'] }),
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'main' }),
        logger: createMockLogger(),
      });

      expect(result).toEqual({ continue: true });
    });
  });

  describe('preToolValidationHook - task validation', () => {
    const createMockConfig = (
      branchProtectionEnabled: boolean,
      options: {
        protectedBranches?: string[];
        allowGitignored?: boolean;
      } = {},
    ) => ({
      hooks: {
        pre_tool_validation: { enabled: true, description: 'test' },
      },
      features: {
        branch_protection: {
          enabled: branchProtectionEnabled,
          description: 'test',
          protected_branches: options.protectedBranches || ['main', 'master'],
          allow_gitignored: options.allowGitignored !== false,
        },
      },
      logging: { enabled: false, level: 'INFO' as const, retentionDays: 7, prettyPrint: false },
    });

    test('allows edits to non-task files', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/file.ts',
          old_string: 'old',
          new_string: 'new',
        },
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        logger: createMockLogger(),
        getConfig: () => createMockConfig(false),
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'feature/test' }),
      });

      expect(result).toEqual({ continue: true });
    });

    test('blocks status change to completed', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '.claude/tasks/TASK_001.md',
          old_string: 'Status: in_progress',
          new_string: 'Status: completed',
        },
      };

      const mockSDK = createMockClaudeSDK({
        promptResponse: {
          text: JSON.stringify({ shouldBlock: true, reason: 'Cannot change status to completed' }),
          success: true,
        },
      });

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        claudeSDK: mockSDK,
        logger: createMockLogger(),
        getConfig: () => createMockConfig(false),
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'feature/test' }),
      });

      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('Cannot change status to completed');
      expect(mockSDK.prompt).toHaveBeenCalledTimes(1);
    });

    test('blocks weasel words about test failures', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '.claude/tasks/TASK_001.md',
          old_string: '- [ ] All tests pass',
          new_string: '- [x] Most tests pass (environment issues with 2 tests)',
        },
      };

      const mockSDK = createMockClaudeSDK({
        promptResponse: {
          text: JSON.stringify({
            shouldBlock: true,
            reason: 'Weasel words detected: claiming partial test completion',
          }),
          success: true,
        },
      });

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        claudeSDK: mockSDK,
        logger: createMockLogger(),
        getConfig: () => createMockConfig(false),
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'feature/test' }),
      });

      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('Weasel words detected');
    });

    test('allows legitimate progress updates', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '.claude/tasks/TASK_001.md',
          old_string: 'Progress: Started implementation',
          new_string: 'Progress: Implemented core functionality, tests in progress',
        },
      };

      const mockSDK = createMockClaudeSDK({
        promptResponse: {
          text: JSON.stringify({ shouldBlock: false, reason: 'Edit is acceptable' }),
          success: true,
        },
      });

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        claudeSDK: mockSDK,
        logger: createMockLogger(),
        getConfig: () => createMockConfig(false),
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'feature/test' }),
      });

      expect(result).toEqual({ continue: true });
    });

    test('handles Claude SDK errors gracefully', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '.claude/tasks/TASK_001.md',
          old_string: 'old',
          new_string: 'new',
        },
      };

      const mockSDK = createMockClaudeSDK({
        promptResponse: {
          text: '',
          success: false,
          error: 'SDK error',
        },
      });

      const logger = createMockLogger();
      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        claudeSDK: mockSDK,
        logger,
        getConfig: () => createMockConfig(false),
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'feature/test' }),
      });

      // Should allow edit on error
      expect(result).toEqual({ continue: true });
      expect(logger.error).toHaveBeenCalledWith('Claude SDK validation failed', { error: 'SDK error' });
    });

    test('handles invalid JSON response', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '.claude/tasks/TASK_001.md',
          old_string: 'old',
          new_string: 'new',
        },
      };

      const mockSDK = createMockClaudeSDK({
        promptResponse: {
          text: 'Not valid JSON',
          success: true,
        },
      });

      const logger = createMockLogger();
      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        claudeSDK: mockSDK,
        logger,
        getConfig: () => createMockConfig(false),
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'feature/test' }),
      });

      // Should allow edit on parse error
      expect(result).toEqual({ continue: true });
      expect(logger.error).toHaveBeenCalled();
    });

    test('skips validation when disabled', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '.claude/tasks/TASK_001.md',
          old_string: 'Status: in_progress',
          new_string: 'Status: completed',
        },
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => false,
        logger: createMockLogger(),
      });

      expect(result).toEqual({ continue: true });
    });

    test('ignores non-Edit/MultiEdit tools', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: {
          file_path: '.claude/tasks/TASK_001.md',
          content: 'new content',
        },
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        logger: createMockLogger(),
        getConfig: () => createMockConfig(false),
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'feature/test' }),
      });

      expect(result).toEqual({ continue: true });
    });
  });

  describe('getCurrentYear', () => {
    test('returns current year from system', () => {
      const year = getCurrentYear();
      expect(year).toBeGreaterThanOrEqual(2025);
    });

    test('uses TODAY_DATE env variable if set', () => {
      const originalEnv = process.env.TODAY_DATE;
      process.env.TODAY_DATE = '2025-10-03T00:00:00.000Z';

      const year = getCurrentYear();
      expect(year).toBe(2025);

      // Restore
      if (originalEnv) {
        process.env.TODAY_DATE = originalEnv;
      } else {
        delete process.env.TODAY_DATE;
      }
    });
  });

  describe('detectOutdatedYear', () => {
    test('detects year at end of query', () => {
      const result = detectOutdatedYear('TypeScript best practices 2024');
      expect(result.isOutdated).toBe(true);
      expect(result.detectedYear).toBe(2024);
      expect(result.suggestedQuery).toBe('TypeScript best practices 2025');
    });

    test('detects year at start of query', () => {
      const result = detectOutdatedYear('2024 web development trends');
      expect(result.isOutdated).toBe(true);
      expect(result.detectedYear).toBe(2024);
      expect(result.suggestedQuery).toBe('2025 web development trends');
    });

    test('detects "latest YYYY" pattern', () => {
      const result = detectOutdatedYear('latest 2024 React features');
      expect(result.isOutdated).toBe(true);
      expect(result.detectedYear).toBe(2024);
      expect(result.suggestedQuery).toBe('latest 2025 React features');
    });

    test('detects "current YYYY" pattern', () => {
      const result = detectOutdatedYear('current 2024 JavaScript trends');
      expect(result.isOutdated).toBe(true);
      expect(result.suggestedQuery).toBe('current 2025 JavaScript trends');
    });

    test('detects "YYYY documentation" pattern', () => {
      const result = detectOutdatedYear('2024 TypeScript documentation');
      expect(result.isOutdated).toBe(true);
      expect(result.suggestedQuery).toBe('2025 TypeScript documentation');
    });

    test('does not flag current year', () => {
      const result = detectOutdatedYear('TypeScript 2025 features');
      expect(result.isOutdated).toBe(false);
    });

    test('does not flag queries without years', () => {
      const result = detectOutdatedYear('best TypeScript practices');
      expect(result.isOutdated).toBe(false);
    });
  });

  describe('isHistoricalSearch', () => {
    test('allows comparison searches', () => {
      expect(isHistoricalSearch('compare 2024 vs 2025 features')).toBe(true);
      expect(isHistoricalSearch('differences between 2024 and 2025')).toBe(true);
    });

    test('allows election/political searches', () => {
      expect(isHistoricalSearch('2024 election results')).toBe(true);
      expect(isHistoricalSearch('2024 presidential campaign')).toBe(true);
    });

    test('allows explicit historical context', () => {
      expect(isHistoricalSearch('historical trends in 2024')).toBe(true);
      expect(isHistoricalSearch('archive of 2024 data')).toBe(true);
    });

    test('allows temporal references', () => {
      expect(isHistoricalSearch('bugs fixed in 2024')).toBe(true);
      expect(isHistoricalSearch('released during 2024')).toBe(true);
    });

    test('rejects non-historical searches', () => {
      expect(isHistoricalSearch('TypeScript 2024')).toBe(false);
      expect(isHistoricalSearch('best practices 2024')).toBe(false);
    });
  });

  describe('WebSearch validation integration', () => {
    test('blocks outdated year in WebSearch query', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'WebSearch',
        tool_input: {
          query: 'TypeScript best practices 2024',
        },
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        logger: createMockLogger(),
        getConfig: () => ({
          features: {
            websearch_validation: { enabled: true },
          },
        }),
      });

      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('2024');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('2025');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('TypeScript best practices 2025');
    });

    test('allows historical WebSearch queries', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'WebSearch',
        tool_input: {
          query: 'compare 2024 vs 2025 TypeScript features',
        },
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        logger: createMockLogger(),
        getConfig: () => ({
          features: {
            websearch_validation: { enabled: true },
          },
        }),
      });

      expect(result).toEqual({ continue: true });
    });

    test('allows WebSearch when validation disabled', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'WebSearch',
        tool_input: {
          query: 'TypeScript 2024',
        },
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        logger: createMockLogger(),
        getConfig: () => ({
          features: {
            websearch_validation: { enabled: false },
          },
        }),
      });

      expect(result).toEqual({ continue: true });
    });

    test('allows WebSearch with current year', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'WebSearch',
        tool_input: {
          query: 'TypeScript 2025 features',
        },
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        logger: createMockLogger(),
        getConfig: () => ({
          features: {
            websearch_validation: { enabled: true },
          },
        }),
      });

      expect(result).toEqual({ continue: true });
    });
  });
});
