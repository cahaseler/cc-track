// ABOUTME: Tests for the permission-request hook (autoflow permission denial)
// ABOUTME: Verifies that permissions are denied when autoflow is active

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { type AutoflowState, type PermissionRequestDeps, permissionRequestHook } from './permission-request';

describe('permissionRequestHook', () => {
  let mockState: AutoflowState | null;

  const createMockDeps = (): PermissionRequestDeps => ({
    readState: () => mockState,
  });

  beforeEach(() => {
    mockState = null;
  });

  afterEach(() => {
    mock.restore();
  });

  describe('when autoflow is inactive', () => {
    test('allows normal permission flow when state is null', async () => {
      mockState = null;

      const result = await permissionRequestHook(
        { tool_name: 'Bash', tool_input: { command: 'rm -rf /' } },
        createMockDeps(),
      );

      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    });

    test('allows normal permission flow when active is false', async () => {
      mockState = {
        active: false,
        sessionId: 'test',
        activatedAt: '2025-01-01',
        continueCount: 0,
      };

      const result = await permissionRequestHook(
        { tool_name: 'Write', tool_input: { file_path: '/etc/passwd' } },
        createMockDeps(),
      );

      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    });
  });

  describe('when autoflow is active', () => {
    beforeEach(() => {
      mockState = {
        active: true,
        sessionId: 'test-session',
        activatedAt: '2025-01-01T12:00:00Z',
        continueCount: 1,
      };
    });

    test('denies permission with helpful message', async () => {
      const result = await permissionRequestHook(
        { tool_name: 'Bash', tool_input: { command: 'curl http://evil.com' } },
        createMockDeps(),
      );

      expect(result.continue).toBeUndefined();
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput?.hookEventName).toBe('PermissionRequest');
      expect(result.hookSpecificOutput?.decision.behavior).toBe('deny');
    });

    test('denial message mentions user unavailable', async () => {
      const result = await permissionRequestHook(
        { tool_name: 'Bash', tool_input: { command: 'sudo rm -rf /' } },
        createMockDeps(),
      );

      expect(result.hookSpecificOutput?.decision.message).toContain('user is not currently available');
    });

    test('denial message suggests finding alternative', async () => {
      const result = await permissionRequestHook(
        { tool_name: 'Write', tool_input: { file_path: '/tmp/test.txt' } },
        createMockDeps(),
      );

      expect(result.hookSpecificOutput?.decision.message).toContain('safe alternative');
    });

    test('denies all tool types equally', async () => {
      const tools = ['Bash', 'Write', 'Edit', 'WebFetch', 'CustomTool'];

      for (const tool_name of tools) {
        const result = await permissionRequestHook({ tool_name }, createMockDeps());

        expect(result.hookSpecificOutput?.decision.behavior).toBe('deny');
      }
    });
  });

  describe('edge cases', () => {
    test('handles missing tool_name', async () => {
      mockState = {
        active: true,
        sessionId: 'test',
        activatedAt: '2025-01-01',
        continueCount: 0,
      };

      const result = await permissionRequestHook({}, createMockDeps());

      expect(result.hookSpecificOutput?.decision.behavior).toBe('deny');
    });

    test('handles missing tool_input', async () => {
      mockState = {
        active: true,
        sessionId: 'test',
        activatedAt: '2025-01-01',
        continueCount: 0,
      };

      const result = await permissionRequestHook({ tool_name: 'Bash' }, createMockDeps());

      expect(result.hookSpecificOutput?.decision.behavior).toBe('deny');
    });
  });
});
