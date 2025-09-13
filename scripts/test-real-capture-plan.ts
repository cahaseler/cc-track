import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const projectRoot = process.cwd();
  const ccTrackBin = resolve(projectRoot, 'dist', 'cc-track');
  const localClaudeCli = resolve(projectRoot, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');

  if (!existsSync(ccTrackBin)) {
    console.error('dist/cc-track not found. Run `bun run build` first.');
    process.exit(1);
  }
  if (!existsSync(localClaudeCli)) {
    console.error('Local Claude CLI not found at node_modules/@anthropic-ai/claude-code/cli.js');
    process.exit(1);
  }

  const tmpRoot = resolve(projectRoot, '.tmp-real-capture-plan');
  if (existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
  mkdirSync(tmpRoot, { recursive: true });

  const payload = {
    hook_event_name: 'PostToolUse',
    tool_name: 'ExitPlanMode',
    tool_input: { plan: 'Implement Feature X end-to-end with tests' },
    tool_response: { plan: 'Implement Feature X end-to-end with tests' },
    cwd: tmpRoot,
  };

  const child = spawn(ccTrackBin, ['hook'], {
    cwd: tmpRoot,
    env: {
      ...process.env,
      // Ensure SDK finds a real on-disk executable, not Bun VFS
      CC_TRACK_CLAUDE_EXECUTABLE: localClaudeCli,
      // Make logging verbose if configured to aid debugging
      // (logging config is read from .claude/track.config.json if present)
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const chunks: string[] = [];
  const errChunks: string[] = [];
  child.stdout.on('data', (d) => chunks.push(d.toString()));
  child.stderr.on('data', (d) => errChunks.push(d.toString()));

  // Write JSON to stdin
  child.stdin.write(JSON.stringify(payload));
  child.stdin.end();

  // Timeout guard to avoid indefinite wait
  const timeoutMs = 120000; // 2 minutes max
  const killer = setTimeout(() => {
    child.kill('SIGKILL');
  }, timeoutMs);

  const exitCode: number = await new Promise((resolveCode) => {
    child.on('close', (code) => resolveCode(code ?? 1));
  });
  clearTimeout(killer);

  const stdout = chunks.join('');
  const stderr = errChunks.join('');

  // Inspect outputs and artifacts
  const taskPath = join(tmpRoot, '.claude', 'tasks', 'TASK_001.md');
  const planPath = join(tmpRoot, '.claude', 'plans', '001.md');
  const taskOk = existsSync(taskPath);
  const planOk = existsSync(planPath);
  const taskPreview = taskOk ? readFileSync(taskPath, 'utf8').slice(0, 120) : '';

  const summary = {
    exitCode,
    stdout,
    stderr,
    artifacts: { taskOk, planOk, taskPreview },
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

