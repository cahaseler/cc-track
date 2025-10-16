// ABOUTME: Helper function to determine platform-specific installation directory for plugin scripts
// ABOUTME: Returns ~/.local/share/cc-track/scripts/ on Linux, %LOCALAPPDATA%\cc-track\scripts\ on Windows

import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Determines the platform-specific installation directory for cc-track scripts.
 *
 * @returns Absolute path to scripts installation directory:
 *          - Linux: ~/.local/share/cc-track/scripts/
 *          - Windows: %LOCALAPPDATA%\cc-track\scripts\
 */
export function getScriptsInstallPath(): string {
  return process.platform === 'win32'
    ? join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'cc-track', 'scripts')
    : join(homedir(), '.local', 'share', 'cc-track', 'scripts');
}
