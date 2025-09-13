import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

function sh(cmd: string, cwd: string) {
  return execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

async function main() {
  const projectRoot = process.cwd();
  const bin = resolve(projectRoot, 'dist', 'cc-track');
  const localClaudeCli = resolve(projectRoot, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');

  if (!existsSync(bin)) {
    console.error('dist/cc-track not found. Run `bun run build` first.');
    process.exit(1);
  }

  const tmp = resolve(projectRoot, '.tmp-stop-review-bench');
  if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  // Minimal repo structure with an active task
  mkdirSync(join(tmp, '.claude', 'tasks'), { recursive: true });
  writeFileSync(join(tmp, 'CLAUDE.md'), `# Active Task\n\n@.claude/tasks/TASK_001.md\n`, 'utf8');
  writeFileSync(
    join(tmp, '.claude', 'tasks', 'TASK_001.md'),
    `# Test Task\n\n**Task ID:** 001\n\n## Requirements\n- [ ] Do something\n`,
    'utf8',
  );

  // Init a git repo and create a small code change
  sh('git init -q', tmp);
  sh('git config user.email bench@example.com', tmp);
  sh('git config user.name bench', tmp);
  writeFileSync(join(tmp, 'src.ts'), 'export const x = 1;\n', 'utf8');
  sh('git add -A && git commit -m init -q', tmp);
  writeFileSync(join(tmp, 'src.ts'), 'export const x = 2;\n', 'utf8');

  const payload = {
    hook_event_name: 'Stop',
    cwd: tmp,
  };

  const child = spawn(bin, ['hook'], {
    cwd: tmp,
    env: {
      ...process.env,
      CC_TRACK_STOP_REVIEW_MODEL: process.env.CC_TRACK_STOP_REVIEW_MODEL || 'sonnet',
      STOP_REVIEW_TIMEOUT_MS: process.env.STOP_REVIEW_TIMEOUT_MS || '45000',
      // Prefer system claude if available, else fall back to local node_modules cli.js
      CC_TRACK_CLAUDE_EXECUTABLE: existsSync('/usr/local/bin/claude')
        ? '/usr/local/bin/claude'
        : existsSync(localClaudeCli)
          ? localClaudeCli
          : '',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const t0 = Date.now();
  const chunks: string[] = [];
  const errs: string[] = [];
  child.stdout.on('data', (d) => chunks.push(d.toString()));
  child.stderr.on('data', (d) => errs.push(d.toString()));
  child.stdin.write(JSON.stringify(payload));
  child.stdin.end();

  const code: number = await new Promise((r) => child.on('close', (c) => r(c ?? 1)));
  const dt = Date.now() - t0;
  console.log(
    JSON.stringify(
      {
        exitCode: code,
        duration_ms: dt,
        stdout: chunks.join(''),
        stderr: errs.join(''),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
