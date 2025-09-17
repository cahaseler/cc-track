import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createMockLogger } from '../../test-utils/command-mocks';
import { performCodeRabbitReview } from './coderabbit';
import type { CodeReviewOptions } from './types';

describe('performCodeRabbitReview', () => {
  beforeEach(() => {
    mock.restore();
  });

  test('returns error when CodeRabbit CLI is not installed', async () => {
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

    const result = await performCodeRabbitReview(options, {
      execSync: mockExec,
      logger: createMockLogger(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('CodeRabbit CLI is not installed');
    expect(mockExec).toHaveBeenCalledWith('which coderabbit', { encoding: 'utf-8' });
  });

  test('parses CodeRabbit output and creates review file', async () => {
    const mockExec = mock((cmd: string) => {
      if (cmd === 'which coderabbit') {
        return '/usr/local/bin/coderabbit';
      }
      if (cmd.startsWith('coderabbit')) {
        return `============================================================================
File: src/lib/test.ts
Line: 42
Type: potential_issue

Comment:
Possible null pointer exception here

#!/bin/bash
# Check for null usage
grep -n "test" src/lib/test.ts

Prompt for AI Agent:
Add null check before accessing the property

============================================================================
File: src/lib/other.ts
Line: 100
Type: warning

Comment:
Unused variable detected

Review completed ✔`;
      }
      return '';
    });

    const mockFileOps = {
      existsSync: mock(() => false),
      mkdirSync: mock(() => {}),
      writeFileSync: mock(() => {}),
    };

    const options: CodeReviewOptions = {
      taskId: 'TASK_001',
      taskTitle: 'Test Task',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
      mergeBase: 'abc123',
    };

    const result = await performCodeRabbitReview(options, {
      execSync: mockExec,
      fileOps: mockFileOps as any,
      logger: createMockLogger(),
    });

    expect(result.success).toBe(true);
    expect(result.review).toContain('Code Review: Test Task');
    expect(result.review).toContain('**Total Issues:** 2');
    expect(result.review).toContain('src/lib/test.ts:42');
    expect(result.review).toContain('Possible null pointer exception');
    expect(mockFileOps.writeFileSync).toHaveBeenCalled();
    expect(mockExec).toHaveBeenCalledWith(
      'coderabbit --plain --base abc123',
      expect.objectContaining({
        encoding: 'utf-8',
        cwd: '/project',
        timeout: 1800000, // 30 minutes
      }),
    );
  });

  test('handles no issues found', async () => {
    const mockExec = mock((cmd: string) => {
      if (cmd === 'which coderabbit') {
        return '/usr/local/bin/coderabbit';
      }
      if (cmd.startsWith('coderabbit')) {
        return 'Review completed ✔';
      }
      return '';
    });

    const mockFileOps = {
      existsSync: mock(() => true),
      mkdirSync: mock(() => {}),
      writeFileSync: mock(() => {}),
    };

    const options: CodeReviewOptions = {
      taskId: 'TASK_002',
      taskTitle: 'Clean Task',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodeRabbitReview(options, {
      execSync: mockExec,
      fileOps: mockFileOps as any,
      logger: createMockLogger(),
    });

    expect(result.success).toBe(true);
    expect(result.review).toContain('No issues found!');
    expect(mockFileOps.writeFileSync).toHaveBeenCalled();
  });

  test('handles timeout gracefully', async () => {
    const mockExec = mock((cmd: string) => {
      if (cmd === 'which coderabbit') {
        return '/usr/local/bin/coderabbit';
      }
      if (cmd.startsWith('coderabbit')) {
        const error: any = new Error('Timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      }
      return '';
    });

    const mockFileOps = {
      existsSync: mock(() => true),
      mkdirSync: mock(() => {}),
      writeFileSync: mock(() => {}),
    };

    const options: CodeReviewOptions = {
      taskId: 'TASK_003',
      taskTitle: 'Timeout Task',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
    };

    const result = await performCodeRabbitReview(options, {
      execSync: mockExec,
      fileOps: mockFileOps as any,
      logger: createMockLogger(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out after 30 minutes');
  });

  test('uses correct command for uncommitted changes when no merge base', async () => {
    const mockExec = mock((cmd: string) => {
      if (cmd === 'which coderabbit') {
        return '/usr/local/bin/coderabbit';
      }
      if (cmd.startsWith('coderabbit')) {
        return 'Review completed ✔';
      }
      return '';
    });

    const mockFileOps = {
      existsSync: mock(() => true),
      mkdirSync: mock(() => {}),
      writeFileSync: mock(() => {}),
    };

    const options: CodeReviewOptions = {
      taskId: 'TASK_004',
      taskTitle: 'Uncommitted Task',
      taskRequirements: 'Requirements',
      gitDiff: 'diff content',
      projectRoot: '/project',
      // No mergeBase provided
    };

    const result = await performCodeRabbitReview(options, {
      execSync: mockExec,
      fileOps: mockFileOps as any,
      logger: createMockLogger(),
    });

    expect(result.success).toBe(true);
    expect(mockExec).toHaveBeenCalledWith(
      'coderabbit --plain --type uncommitted',
      expect.objectContaining({
        encoding: 'utf-8',
        cwd: '/project',
      }),
    );
  });
});
