import { mock } from 'bun:test';
import type { GitHelpers } from '../skills/cc-track-tools/lib/git-helpers';
import type { createLogger } from '../skills/cc-track-tools/lib/logger';

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
