import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  detectOutdatedYear,
  extractFilePath,
  getCurrentYear,
  isGitIgnored,
  isHistoricalSearch,
  isMetadataFile,
  preToolValidationHook,
} from '../../hooks/pre-tool-validation';
import { createMockGitHelpers, createMockLogger } from '../../test-utils/command-mocks';
import type { HookInput } from '../../types';

// Helper to create mocks for detection functions (always return "OK" for tests)
const createMockDetectionFunctions = () => ({
  detectNpmPackage: mock(() => ({ detected: false })), // No npm conflict
  verifyBunInstalled: mock(() => ({ detected: true, message: 'Bun v1.0.0 is installed' })), // Bun OK
  verifyPluginDependencies: mock(() => ({ detected: true, message: 'All dependencies installed' })), // Deps OK
});

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

  describe('isMetadataFile', () => {
    test('identifies metadata files correctly', () => {
      expect(isMetadataFile('.cc-track/specs/001-feature-name/.metadata.json')).toBe(true);
      expect(isMetadataFile('/home/user/project/.cc-track/specs/999-another-feature/.metadata.json')).toBe(true);
      expect(isMetadataFile('.cc-track/specs/123-test-task/.metadata.json')).toBe(true);
    });

    test('rejects non-metadata files', () => {
      expect(isMetadataFile('.cc-track/specs/001-feature-name/spec.md')).toBe(false);
      expect(isMetadataFile('.cc-track/specs/001-feature-name/plan.md')).toBe(false);
      expect(isMetadataFile('.cc-track/specs/001-feature-name/tasks.md')).toBe(false);
      expect(isMetadataFile('.cc-track/metadata.json')).toBe(false);
      expect(isMetadataFile('src/file.ts')).toBe(false);
      expect(isMetadataFile('.cc-track/specs/no-number/.metadata.json')).toBe(false);
      expect(isMetadataFile('package.json')).toBe(false);
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
        ...createMockDetectionFunctions(),
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
        ...createMockDetectionFunctions(),
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
        ...createMockDetectionFunctions(),
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
        ...createMockDetectionFunctions(),
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
        ...createMockDetectionFunctions(),
      });

      expect(result).toEqual({ continue: true });
    });
  });

  describe('preToolValidationHook - metadata protection', () => {
    const createMockConfig = () => ({
      hooks: {
        pre_tool_validation: { enabled: true, description: 'test' },
      },
      features: {
        branch_protection: {
          enabled: false,
          description: 'test',
          protected_branches: ['main', 'master'],
          allow_gitignored: true,
        },
      },
      logging: { enabled: false, level: 'INFO' as const, retentionDays: 7, prettyPrint: false },
    });

    test('blocks Edit to metadata files', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '/project/.cc-track/specs/001-feature/.metadata.json',
          old_string: '"status": "in_progress"',
          new_string: '"status": "completed"',
        },
        cwd: '/project',
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        getConfig: createMockConfig,
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'feature/test' }),
        logger: createMockLogger(),
        ...createMockDetectionFunctions(),
      });

      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('Metadata Protection');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('/cc-track:complete-task');
    });

    test('blocks Write to metadata files', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/.cc-track/specs/042-another-feature/.metadata.json',
          content: '{"status": "completed"}',
        },
        cwd: '/project',
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        getConfig: createMockConfig,
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'feature/test' }),
        logger: createMockLogger(),
        ...createMockDetectionFunctions(),
      });

      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('Metadata Protection');
    });

    test('blocks MultiEdit to metadata files', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'MultiEdit',
        tool_input: {
          file_path: '/project/.cc-track/specs/105-cleanup/.metadata.json',
          edits: [{ old_string: 'old', new_string: 'new' }],
        },
        cwd: '/project',
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        getConfig: createMockConfig,
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'feature/test' }),
        logger: createMockLogger(),
        ...createMockDetectionFunctions(),
      });

      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    });

    test('allows edits to non-metadata files in specs directory', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '/project/.cc-track/specs/001-feature/tasks.md',
          old_string: '- [ ] Task 1',
          new_string: '- [x] Task 1',
        },
        cwd: '/project',
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        getConfig: createMockConfig,
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'feature/test' }),
        logger: createMockLogger(),
        ...createMockDetectionFunctions(),
      });

      expect(result).toEqual({ continue: true });
    });

    test('allows edits to regular project files', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: '/project/src/index.ts',
          old_string: 'old code',
          new_string: 'new code',
        },
        cwd: '/project',
      };

      const result = await preToolValidationHook(input, {
        isHookEnabled: () => true,
        getConfig: createMockConfig,
        gitHelpers: createMockGitHelpers({ getCurrentBranch: () => 'feature/test' }),
        logger: createMockLogger(),
        ...createMockDetectionFunctions(),
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
        ...createMockDetectionFunctions(),
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
        ...createMockDetectionFunctions(),
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
        ...createMockDetectionFunctions(),
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
        ...createMockDetectionFunctions(),
      });

      expect(result).toEqual({ continue: true });
    });
  });
});
