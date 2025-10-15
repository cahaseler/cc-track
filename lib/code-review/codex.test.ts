import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createMockLogger } from '../../test-utils/command-mocks';
import { performCodexReview } from './codex';
import type { CodeReviewOptions } from './types';

describe('performCodexReview', () => {
  beforeEach(() => {
    mock.restore();
  });

  test('returns error when Codex CLI is not installed', async () => {
    const mockExec = mock(() => {
      throw new Error('Command not found');
    });

    const options: CodeReviewOptions = {
      taskId: 'TASK_001',
      taskTitle: 'Test Task',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodexReview(options, {
      execSync: mockExec,
      logger: createMockLogger(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Codex CLI is not installed');
    expect(mockExec).toHaveBeenCalledWith('which codex', { encoding: 'utf-8' });
  });

  test('runs codex exec and creates review file with metadata', async () => {
    const mockExec = mock((cmd: string) => {
      if (cmd === 'which codex') {
        return '/usr/local/bin/codex';
      }
      // For codex exec command, it writes to file directly
      return '';
    });

    const reviewContent =
      '## Review Summary\n\nThe code looks good overall. Minor suggestions:\n\n- Consider adding error handling in function X\n- Update documentation for module Y';

    const mockFileOps = {
      existsSync: mock(() => false),
      mkdirSync: mock(() => {}),
      readFileSync: mock(() => reviewContent),
      writeFileSync: mock(() => {}),
    };

    const options: CodeReviewOptions = {
      taskId: 'TASK_001',
      taskTitle: 'Test Task',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodexReview(options, {
      execSync: mockExec,
      fileOps: mockFileOps as any,
      logger: createMockLogger(),
    });

    expect(result.success).toBe(true);
    expect(result.review).toContain('Code Review: Test Task');
    expect(result.review).toContain('**Task ID:** TASK_001');
    expect(result.review).toContain('**Reviewed by:** Codex CLI');
    expect(result.review).toContain(reviewContent);

    // Check that codex exec was called with correct flags
    const execCalls = mockExec.mock.calls;
    const codexCall = execCalls.find((call: any) => call[0].startsWith('codex exec'));
    expect(codexCall).toBeDefined();
    expect(codexCall[0]).toContain('codex exec --output-last-message');
    expect(codexCall[1]).toMatchObject({
      encoding: 'utf-8',
      cwd: '/project',
      timeout: 1800000, // 30 minutes
    });

    // Check that directory was created and files were written (temp prompt file + final with metadata)
    expect(mockFileOps.mkdirSync).toHaveBeenCalledWith('/project/code-reviews', { recursive: true });
    expect(mockFileOps.readFileSync).toHaveBeenCalled();
    expect(mockFileOps.writeFileSync).toHaveBeenCalledTimes(2); // Temp prompt file + final with metadata
  });

  test('handles timeout gracefully', async () => {
    const mockExec = mock((cmd: string) => {
      if (cmd === 'which codex') {
        return '/usr/local/bin/codex';
      }
      if (cmd.startsWith('codex exec')) {
        const error: any = new Error('Timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      }
      return '';
    });

    const mockFileOps = {
      existsSync: mock(() => true),
      mkdirSync: mock(() => {}),
      readFileSync: mock(() => ''),
      writeFileSync: mock(() => {}),
    };

    const options: CodeReviewOptions = {
      taskId: 'TASK_003',
      taskTitle: 'Timeout Task',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodexReview(options, {
      execSync: mockExec,
      fileOps: mockFileOps as any,
      logger: createMockLogger(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out after 30 minutes');
  });

  test('handles execution errors', async () => {
    const mockExec = mock((cmd: string) => {
      if (cmd === 'which codex') {
        return '/usr/local/bin/codex';
      }
      if (cmd.startsWith('codex exec')) {
        throw new Error('Execution failed: API rate limit exceeded');
      }
      return '';
    });

    const mockFileOps = {
      existsSync: mock(() => true),
      mkdirSync: mock(() => {}),
      readFileSync: mock(() => ''),
      writeFileSync: mock(() => {}),
    };

    const options: CodeReviewOptions = {
      taskId: 'TASK_004',
      taskTitle: 'Error Task',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodexReview(options, {
      execSync: mockExec,
      fileOps: mockFileOps as any,
      logger: createMockLogger(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Codex review failed');
    expect(result.error).toContain('API rate limit exceeded');
  });

  test('creates code-reviews directory if it does not exist', async () => {
    const mockExec = mock((cmd: string) => {
      if (cmd === 'which codex') {
        return '/usr/local/bin/codex';
      }
      return '';
    });

    const mockFileOps = {
      existsSync: mock(() => false), // Directory does not exist
      mkdirSync: mock(() => {}),
      readFileSync: mock(() => 'Review content'),
      writeFileSync: mock(() => {}),
    };

    const options: CodeReviewOptions = {
      taskId: 'TASK_005',
      taskTitle: 'New Dir Task',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    await performCodexReview(options, {
      execSync: mockExec,
      fileOps: mockFileOps as any,
      logger: createMockLogger(),
    });

    expect(mockFileOps.existsSync).toHaveBeenCalledWith('/project/code-reviews');
    expect(mockFileOps.mkdirSync).toHaveBeenCalledWith('/project/code-reviews', { recursive: true });
  });

  test('passes comprehensive prompt to codex exec', async () => {
    const mockExec = mock((cmd: string) => {
      if (cmd === 'which codex') {
        return '/usr/local/bin/codex';
      }
      return '';
    });

    const mockFileOps = {
      existsSync: mock(() => true),
      mkdirSync: mock(() => {}),
      readFileSync: mock(() => 'Review'),
      writeFileSync: mock(() => {}),
    };

    const options: CodeReviewOptions = {
      taskId: 'TASK_006',
      taskTitle: 'Prompt Test Task',
      taskRequirements: 'Must implement feature X\nMust handle edge case Y',
      gitDiff: '+++ added line\n--- removed line',
      projectRoot: '/project',
    };

    await performCodexReview(options, {
      execSync: mockExec,
      fileOps: mockFileOps as any,
      logger: createMockLogger(),
    });

    const execCalls = mockExec.mock.calls;
    const codexCall = execCalls.find((call: any) => call[0].startsWith('codex exec'));
    expect(codexCall).toBeDefined();

    // The command should use cat with a temp file for the prompt
    const commandStr = codexCall[0];
    expect(commandStr).toContain('codex exec --output-last-message');
    expect(commandStr).toContain('$(cat');
    expect(commandStr).toContain('codex-prompt-TASK_006');

    // The prompt was written to a temp file - check writeFileSync calls
    const writeFileCalls = mockFileOps.writeFileSync.mock.calls;
    expect(writeFileCalls.length).toBeGreaterThanOrEqual(1);
    const promptWrite = writeFileCalls.find((call: any) => call[0].includes('codex-prompt'));
    expect(promptWrite).toBeDefined();
    expect(promptWrite[1]).toContain('TASK_006');
    expect(promptWrite[1]).toContain('Prompt Test Task');
    expect(promptWrite[1]).toContain('Requirements Alignment');
    expect(promptWrite[1]).toContain('Security');
    expect(promptWrite[1]).toContain('Code Quality');
  });
});
