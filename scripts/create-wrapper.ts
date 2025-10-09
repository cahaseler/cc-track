import { writeFileSync } from 'fs';
import { join } from 'path';

const wrapper = `#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const platform = process.platform;

let binaryPath;
if (platform === 'win32') {
  binaryPath = join(__dirname, 'cc-track-windows.exe');
} else if (platform === 'linux') {
  binaryPath = join(__dirname, 'cc-track-linux');
} else {
  binaryPath = join(__dirname, 'cc-track');
}

const result = spawnSync(binaryPath, process.argv.slice(2), {
  stdio: 'inherit',
  shell: false
});

process.exit(result.status ?? 1);
`;

writeFileSync(join('dist', 'cc-track.js'), wrapper);
console.log('Created platform wrapper at dist/cc-track.js');