// ABOUTME: SessionStart hook that copies plugin scripts to platform-specific user directory
// ABOUTME: and sets CC_TRACK_SCRIPTS_ROOT environment variable for slash command execution

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getScriptsInstallPath } from './lib/platform-paths';

async function main() {
  try {
    // 1. Read and validate stdin (hook input not used for this hook)
    await Bun.stdin.text(); // Consume stdin to prevent blocking

    // 2. Determine platform-specific installation directory
    const scriptsRoot = getScriptsInstallPath();

    // 3. Set environment variable (for this process and children)
    process.env.CC_TRACK_SCRIPTS_ROOT = scriptsRoot;

    // 4. Create scripts directory if needed
    try {
      mkdirSync(scriptsRoot, { recursive: true });
    } catch (_err) {
      console.error(`⚠️  Failed to create ${scriptsRoot} - check permissions`);
      process.exit(0); // Exit 0 to not block session
    }

    // 5. Get plugin root and version
    const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || join(__dirname, '..');
    const pluginJsonPath = join(pluginRoot, '.claude-plugin', 'plugin.json');

    let pluginVersion = 'unknown';
    try {
      const pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf-8'));
      pluginVersion = pluginJson.version || 'unknown';
    } catch {
      // If can't read version, always copy
    }

    const versionFilePath = join(scriptsRoot, '.version');
    const installedVersion = existsSync(versionFilePath) ? readFileSync(versionFilePath, 'utf-8').trim() : '';

    // 6. Copy scripts if version changed
    if (pluginVersion !== installedVersion) {
      const scriptsSourceDir = join(pluginRoot, 'commands', 'scripts');

      try {
        const scriptFiles = readdirSync(scriptsSourceDir).filter((f) => f.endsWith('.ts'));

        for (const file of scriptFiles) {
          copyFileSync(join(scriptsSourceDir, file), join(scriptsRoot, file));
        }

        writeFileSync(versionFilePath, pluginVersion, 'utf-8');
      } catch (err) {
        console.error(`⚠️  Failed to copy scripts to ${scriptsRoot}: ${err}`);
        process.exit(0); // Exit 0 to not block session
      }
    }

    // 7. Output context for Claude
    const output = {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `cc-track scripts installed at: ${scriptsRoot}\nEnvironment variable CC_TRACK_SCRIPTS_ROOT is set for command execution.`,
      },
    };

    console.log(JSON.stringify(output));
    process.exit(0);
  } catch (err) {
    console.error(`⚠️  SessionStart hook error: ${err}`);
    process.exit(0); // Exit 0 to not block session
  }
}

main();
