// ABOUTME: SessionStart hook that sets CC_TRACK_SCRIPTS_ROOT environment variable
// ABOUTME: to point to the plugin's scripts directory for slash command execution

import { join } from 'node:path';

async function main() {
  try {
    // 1. Read and validate stdin (hook input not used for this hook)
    await Bun.stdin.text(); // Consume stdin to prevent blocking

    // 2. Get plugin root directory
    const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || join(__dirname, '..');
    const scriptsDir = join(pluginRoot, 'commands', 'scripts');

    // 3. Set environment variable to plugin's scripts directory
    process.env.CC_TRACK_SCRIPTS_ROOT = scriptsDir;

    // 4. Output context for Claude
    const output = {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `Environment variable CC_TRACK_SCRIPTS_ROOT set to: ${scriptsDir}`,
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
