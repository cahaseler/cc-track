import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { createLogger } from '../lib/logger';
import type { HookInput } from '../types';
import {
  extractActiveTaskFile,
  generatePostCompactionInstructions,
  generateUserSummary,
  type PostCompactDependencies,
  postCompactHook,
  readImportedFiles,
} from './post-compact';

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

describe('post-compact', () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('extractActiveTaskFile', () => {
    test('extracts task file name from CLAUDE.md', () => {
      const content = `# Project\n\n@.claude/tasks/TASK_042.md\n\nOther content`;
      const result = extractActiveTaskFile(content);
      expect(result).toBe('TASK_042.md');
    });

    test('returns empty string when no task found', () => {
      const content = `# Project\n\n@.claude/no_active_task.md\n\nOther content`;
      const result = extractActiveTaskFile(content);
      expect(result).toBe('');
    });

    test('handles multiple task references (takes first)', () => {
      const content = `# Project\n\n@.claude/tasks/TASK_001.md\n\n@.claude/tasks/TASK_002.md`;
      const result = extractActiveTaskFile(content);
      expect(result).toBe('TASK_001.md');
    });
  });

  describe('readImportedFiles', () => {
    test('reads all imported files from CLAUDE.md', () => {
      const claudeMd = `# Project\n\n@.claude/product_context.md\n@.claude/system_patterns.md`;
      const fileOps = {
        existsSync: mock(() => true),
        readFileSync: mock((path: string) => {
          if (path.includes('product_context')) return 'Product content';
          if (path.includes('system_patterns')) return 'System patterns content';
          return '';
        }),
      };

      const result = readImportedFiles(claudeMd, '/project', fileOps);

      expect(result.content).toContain('## product_context.md:');
      expect(result.content).toContain('Product content');
      expect(result.content).toContain('## system_patterns.md:');
      expect(result.content).toContain('System patterns content');
      expect(result.files).toEqual(['product_context.md', 'system_patterns.md']);
    });

    test('skips non-existent files', () => {
      const claudeMd = `@.claude/exists.md\n@.claude/missing.md`;
      const fileOps = {
        existsSync: mock((path: string) => path.includes('exists')),
        readFileSync: mock(() => 'Exists content'),
      };

      const result = readImportedFiles(claudeMd, '/project', fileOps);

      expect(result.content).toContain('## exists.md:');
      expect(result.content).toContain('Exists content');
      expect(result.content).not.toContain('missing.md');
      expect(result.files).toEqual(['exists.md']);
    });

    test('handles no imports', () => {
      const claudeMd = `# Project\n\nNo imports here`;
      const fileOps = {
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
      };

      const result = readImportedFiles(claudeMd, '/project', fileOps);
      expect(result.content).toBe('');
      expect(result.files).toEqual([]);
    });
  });

  describe('generatePostCompactionInstructions', () => {
    test('generates instructions with active task', () => {
      const claudeMd = '# Project content';
      const imported = '## Imported files';
      const activeTask = 'TASK_001.md';

      const result = generatePostCompactionInstructions(claudeMd, imported, activeTask);

      expect(result).toContain('POST-COMPACTION CONTEXT RESTORATION');
      expect(result).toContain('# Project content');
      expect(result).toContain('## Imported files');
      expect(result).toContain('Review the active task file shown above (TASK_001.md)');
      expect(result).toContain('mcp__private-journal__list_recent_entries');
      expect(result).toContain('.claude/decision_log.md');
    });

    test('generates instructions without active task', () => {
      const claudeMd = '# Project content';
      const imported = '## Imported files';
      const activeTask = '';

      const result = generatePostCompactionInstructions(claudeMd, imported, activeTask);

      expect(result).toContain('POST-COMPACTION CONTEXT RESTORATION');
      expect(result).not.toContain('Review the active task file');
      expect(result).toContain('technical decisions were made');
    });

    test('includes all required sections', () => {
      const result = generatePostCompactionInstructions('', '', '');

      // Check for all major sections
      expect(result).toContain('1. First, review your recent journal entries');
      expect(result).toContain('2. Review the compaction summary');
      expect(result).toContain('3. Update the project documentation');
      expect(result).toContain('4. After updating the documentation');
      expect(result).toContain('.claude/system_patterns.md');
      expect(result).toContain('.claude/progress_log.md');
    });
  });

  describe('generateUserSummary', () => {
    test('generates summary with files and active task', () => {
      const files = ['product_context.md', 'system_patterns.md', 'decision_log.md'];
      const activeTask = 'TASK_026.md';

      const result = generateUserSummary(files, activeTask);

      expect(result).toContain('📋 Post-compaction context restored:');
      expect(result).toContain('• Added 3 context files: product_context.md, system_patterns.md, decision_log.md');
      expect(result).toContain('• Active task: TASK_026.md');
      expect(result).toContain('• Instructed Claude to:');
      expect(result).toContain('Review recent journal entries');
      expect(result).toContain('Update task documentation');
      expect(result).toContain('Record any technical decisions');
    });

    test('generates summary without files', () => {
      const files: string[] = [];
      const activeTask = 'TASK_001.md';

      const result = generateUserSummary(files, activeTask);

      expect(result).toContain('📋 Post-compaction context restored:');
      expect(result).not.toContain('Added');
      expect(result).toContain('• Active task: TASK_001.md');
      expect(result).toContain('• Instructed Claude to:');
    });

    test('generates summary without active task', () => {
      const files = ['config.md'];
      const activeTask = '';

      const result = generateUserSummary(files, activeTask);

      expect(result).toContain('• Added 1 context files: config.md');
      expect(result).not.toContain('Active task:');
      expect(result).toContain('• Instructed Claude to:');
    });
  });

  describe('postCompactHook', () => {
    test('returns early when hook is disabled', async () => {
      const input: HookInput = {
        hook_event_name: 'SessionStart',
        source: 'compact',
        cwd: '/project',
      };

      const result = await postCompactHook(input, {
        isHookEnabled: () => false,
      });
      expect(result).toEqual({ continue: true });
    });

    test('returns early when source is not compact', async () => {
      const logger = createMockLogger();

      const input: HookInput = {
        hook_event_name: 'SessionStart',
        source: 'startup', // Not 'compact'
        cwd: '/project',
      };

      const result = await postCompactHook(input, {
        logger,
        isHookEnabled: () => true,
      });

      expect(result).toEqual({ continue: true });
      expect(logger.debug).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenCalledWith('SessionStart hook called', { data: input });
      expect(logger.debug).toHaveBeenCalledWith("Skipping - source is not 'compact' (got: startup)");
    });

    test('processes compact source and generates instructions', async () => {
      const fileOps = {
        existsSync: mock((path: string) => {
          // Return true for CLAUDE.md and any imported files
          return path.includes('CLAUDE.md') || path.includes('.claude/');
        }),
        readFileSync: mock((path: string) => {
          if (path.includes('CLAUDE.md')) {
            return `# Project\n\n@.claude/tasks/TASK_026.md\n@.claude/product_context.md\n@.claude/system_patterns.md`;
          }
          if (path.includes('product_context')) return 'Product context content';
          if (path.includes('system_patterns')) return 'System patterns content';
          return '';
        }),
      };

      const logger = createMockLogger();

      const input: HookInput = {
        hook_event_name: 'SessionStart',
        source: 'compact',
        cwd: '/project',
        session_id: 'test-session',
      };

      const deps: PostCompactDependencies = {
        fileOps,
        logger,
      };

      const result = await postCompactHook(input, {
        ...deps,
        isHookEnabled: () => true,
      });

      expect(result.continue).toBe(true);
      // systemMessage should be brief summary for user
      expect(result.systemMessage).toContain('📋 Post-compaction context restored:');
      expect(result.systemMessage).toContain('Active task: TASK_026.md');
      expect(result.systemMessage).toContain('• Added 2 context files');
      // additionalContext should have full instructions for Claude
      expect(result.hookSpecificOutput?.additionalContext).toContain('POST-COMPACTION CONTEXT RESTORATION');
      expect(result.hookSpecificOutput?.additionalContext).toContain('review your recent journal entries');
      expect(result.hookSpecificOutput).toEqual({
        hookEventName: 'SessionStart',
        additionalContext: expect.any(String),
      });
      expect(logger.info).toHaveBeenCalledWith('Post-compaction context restoration starting');
    });

    test('handles missing CLAUDE.md gracefully', async () => {
      const fileOps = {
        existsSync: mock(() => false),
        readFileSync: mock(() => ''),
      };

      const input: HookInput = {
        hook_event_name: 'SessionStart',
        source: 'compact',
        cwd: '/project',
      };

      const result = await postCompactHook(input, {
        fileOps,
        isHookEnabled: () => true,
      });

      expect(result.continue).toBe(true);
      // With no CLAUDE.md, should still have basic summary
      expect(result.systemMessage).toContain('📋 Post-compaction context restored:');
      expect(result.systemMessage).toContain('Instructed Claude to:');
      // additionalContext should still have full instructions
      expect(result.hookSpecificOutput?.additionalContext).toContain('POST-COMPACTION CONTEXT RESTORATION');
    });

    test('handles errors gracefully', async () => {
      const fileOps = {
        existsSync: mock(() => {
          throw new Error('File system error');
        }),
        readFileSync: mock(() => ''),
      };

      const logger = createMockLogger();

      const input: HookInput = {
        hook_event_name: 'SessionStart',
        source: 'compact',
        cwd: '/project',
      };

      const result = await postCompactHook(input, {
        fileOps,
        logger,
        isHookEnabled: () => true,
      });

      expect(result).toEqual({ continue: true });
      expect(logger.error).toHaveBeenCalledWith('Error in post_compact hook', expect.any(Object));
    });
  });
});
