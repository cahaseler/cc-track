// ABOUTME: Unit tests for platform-specific path determination helper
// ABOUTME: Tests Linux, Windows, and Windows fallback scenarios using Bun's mocking

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('getScriptsInstallPath', () => {
  let originalPlatform: string;
  let originalLocalAppData: string | undefined;

  beforeEach(() => {
    // Save original values
    originalPlatform = process.platform;
    originalLocalAppData = process.env.LOCALAPPDATA;
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
    if (originalLocalAppData !== undefined) {
      process.env.LOCALAPPDATA = originalLocalAppData;
    } else {
      delete process.env.LOCALAPPDATA;
    }

    // Clear module cache to get fresh imports
    mock.restore();
  });

  it('returns Linux XDG path on Linux platform', async () => {
    // Mock Linux platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Dynamic import after mocking
    const { getScriptsInstallPath } = await import('./platform-paths');

    const result = getScriptsInstallPath();
    const expected = join(homedir(), '.local', 'share', 'cc-track', 'scripts');

    expect(result).toBe(expected);
  });

  it('returns Windows LOCALAPPDATA path on Windows platform', async () => {
    // Mock Windows platform
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      writable: true,
      configurable: true,
    });

    // Set LOCALAPPDATA
    process.env.LOCALAPPDATA = 'C:\\Users\\TestUser\\AppData\\Local';

    // Dynamic import after mocking
    const { getScriptsInstallPath } = await import('./platform-paths');

    const result = getScriptsInstallPath();
    const expected = join('C:\\Users\\TestUser\\AppData\\Local', 'cc-track', 'scripts');

    expect(result).toBe(expected);
  });

  it('returns Windows fallback path when LOCALAPPDATA is undefined', async () => {
    // Mock Windows platform
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      writable: true,
      configurable: true,
    });

    // Remove LOCALAPPDATA
    delete process.env.LOCALAPPDATA;

    // Dynamic import after mocking
    const { getScriptsInstallPath } = await import('./platform-paths');

    const result = getScriptsInstallPath();
    const expected = join(homedir(), 'AppData', 'Local', 'cc-track', 'scripts');

    expect(result).toBe(expected);
  });

  it('returns Linux path on macOS (same as Linux)', async () => {
    // Mock macOS platform
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      writable: true,
      configurable: true,
    });

    // Dynamic import after mocking
    const { getScriptsInstallPath } = await import('./platform-paths');

    const result = getScriptsInstallPath();
    const expected = join(homedir(), '.local', 'share', 'cc-track', 'scripts');

    expect(result).toBe(expected);
  });
});
