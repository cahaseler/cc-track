import { describe, expect, test } from 'bun:test';
import type { HookInput } from '../types';
import { determineHookType, hookCommand } from './hook';

describe('hook command', () => {
  test('has correct name and description', () => {
    expect(hookCommand.name()).toBe('hook');
    expect(hookCommand.description()).toBe('Handle Claude Code hook events (reads JSON from stdin)');
  });

  test('has no options', () => {
    const options = hookCommand.options;
    expect(options).toHaveLength(0);
  });

  test('has an action handler', () => {
    expect(hookCommand.commands).toHaveLength(0);
    // Verify the command has an action handler configured
    const handler = (hookCommand as unknown as { _actionHandler: unknown })._actionHandler;
    expect(typeof handler).toBe('function');
  });
});

describe('determineHookType', () => {
  describe('PostToolUse events', () => {
    test('routes ExitPlanMode to capture-plan', () => {
      const input: HookInput = {
        hook_event_name: 'PostToolUse',
        tool_name: 'ExitPlanMode',
      };
      expect(determineHookType(input)).toBe('capture-plan');
    });

    test('routes Edit to edit-validation', () => {
      const input: HookInput = {
        hook_event_name: 'PostToolUse',
        tool_name: 'Edit',
      };
      expect(determineHookType(input)).toBe('edit-validation');
    });

    test('routes Write to edit-validation', () => {
      const input: HookInput = {
        hook_event_name: 'PostToolUse',
        tool_name: 'Write',
      };
      expect(determineHookType(input)).toBe('edit-validation');
    });

    test('routes MultiEdit to edit-validation', () => {
      const input: HookInput = {
        hook_event_name: 'PostToolUse',
        tool_name: 'MultiEdit',
      };
      expect(determineHookType(input)).toBe('edit-validation');
    });

    test('returns null for other PostToolUse tools', () => {
      const input: HookInput = {
        hook_event_name: 'PostToolUse',
        tool_name: 'Read',
      };
      expect(determineHookType(input)).toBe(null);
    });
  });

  describe('PreCompact events', () => {
    test('routes PreCompact to pre-compact', () => {
      const input: HookInput = {
        hook_event_name: 'PreCompact',
      };
      expect(determineHookType(input)).toBe('pre-compact');
    });
  });

  describe('Stop events', () => {
    test('routes Stop to stop-review', () => {
      const input: HookInput = {
        hook_event_name: 'Stop',
      };
      expect(determineHookType(input)).toBe('stop-review');
    });
  });

  describe('Unknown events', () => {
    test('returns null for unknown event types', () => {
      const input: HookInput = {
        hook_event_name: 'UnknownEvent',
      };
      expect(determineHookType(input)).toBe(null);
    });

    test('returns null for missing event name', () => {
      const input: HookInput = {};
      expect(determineHookType(input)).toBe(null);
    });
  });
});
