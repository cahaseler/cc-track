import { mock } from 'bun:test';
import type { ClaudeResponse } from '../lib/claude-sdk';
import type { ClaudeSDKInterface, GitHelpers } from '../lib/git-helpers';
import type { createLogger } from '../lib/logger';

/**
 * Create a mock logger instance
 */
export function createMockLogger(): ReturnType<typeof createLogger> {
  return {
    debug: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    exception: mock(() => {}),
  } as unknown as ReturnType<typeof createLogger>;
}

/**
 * Mock ClaudeSDK interface for testing
 */
export interface MockClaudeSDK extends ClaudeSDKInterface {
  generateCommitMessage: ReturnType<typeof mock>;
  generateBranchName: ReturnType<typeof mock>;
  prompt?: ReturnType<typeof mock>;
}

export function createMockClaudeSDK(options?: {
  commitMessage?: string;
  branchName?: string;
  promptResponse?: ClaudeResponse;
}): MockClaudeSDK {
  return {
    generateCommitMessage: mock(async (changes: string) => {
      if (options?.commitMessage) return options.commitMessage;
      // Default smart responses based on content
      if (changes.includes('new feature') || changes.includes('feat:')) {
        return 'feat: add new feature';
      }
      if (changes.includes('login bug')) {
        return 'fix: resolve login bug';
      }
      if (changes.includes('bug') || changes.includes('fix')) {
        return 'fix: resolve issue';
      }
      return 'chore: save work in progress';
    }),
    generateBranchName: mock(async (taskTitle: string, taskId: string) => {
      if (options?.branchName) return options.branchName;
      // Default smart branch naming
      if (taskTitle.includes('authentication') || taskTitle.includes('auth')) {
        return `feature/user-auth-${taskId.toLowerCase()}`;
      }
      if (taskTitle.includes('login')) {
        return `bug/fix-login-${taskId.toLowerCase()}`;
      }
      if (taskTitle.includes('bug') || taskTitle.includes('fix')) {
        return `bug/fix-${taskId.toLowerCase()}`;
      }
      return `feature/task-${taskId.toLowerCase()}`;
    }),
    prompt: mock(
      async () =>
        options?.promptResponse ?? {
          text: '# Enhanced Task\n\nEnriched content with research',
          success: true,
        },
    ),
  };
}

/**
 * Mock GitHelpers class for testing
 */
export function createMockGitHelpers(overrides?: Partial<GitHelpers>): GitHelpers {
  const mockInstance = {
    getDefaultBranch: mock(() => 'main'),
    getCurrentBranch: mock(() => 'main'),
    createTaskBranch: mock(() => {}),
    switchToBranch: mock(() => {}),
    mergeTaskBranch: mock(() => {}),
    pushCurrentBranch: mock(() => true),
    getMergeBase: mock(() => 'abc123'),
    generateCommitMessage: mock(async () => 'chore: save work in progress'),
    generateBranchName: mock(async () => 'feature/test-branch'),
    ...overrides,
  } as unknown as GitHelpers;

  return mockInstance;
}
