import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { capturePlanHook } from '../src/hooks/capture-plan';
import type { HookInput } from '../src/types';

async function main() {
  const tmpRoot = join(process.cwd(), '.tmp-capture-plan-test');
  // Clean up and create temp root
  if (existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
  mkdirSync(tmpRoot, { recursive: true });

  const input: HookInput = {
    hook_event_name: 'PostToolUse',
    tool_name: 'ExitPlanMode',
    tool_input: { plan: 'Create feature X with tests' },
    tool_response: { plan: 'Create feature X with tests' },
    cwd: tmpRoot,
  } as any;

  const mockClaude = {
    async prompt(text: string) {
      // Return a minimal valid task body
      return {
        text:
          '# Feature X\n\n**Purpose:** Implement feature X\n\n**Status:** planning\n**Started:** 2025-09-13 10:00\n**Task ID:** 001\n\n## Requirements\n- [ ] Do X\n\n## Success Criteria\n- X works\n\n## Technical Approach\n- Use Y\n\n## Current Focus\n- Start\n\n## Open Questions & Blockers\n- None\n\n## Next Steps\n- Step 1',
        success: true,
      } as const;
    },
    async generateCommitMessage() {
      return 'chore: commit';
    },
    async generateBranchName() {
      return 'feature/feature-x-001';
    },
  } as any;

  const out = await capturePlanHook(input, {
    claudeSDK: mockClaude,
    isHookEnabled: (name: string) => {
      if (name === 'capture_plan') return true;
      if (name === 'git_branching') return false; // avoid running git in test
      return false;
    },
    isGitHubIntegrationEnabled: () => false,
  });

  const taskPath = join(tmpRoot, '.claude', 'tasks', 'TASK_001.md');
  const planPath = join(tmpRoot, '.claude', 'plans', '001.md');

  const taskOk = existsSync(taskPath);
  const planOk = existsSync(planPath);
  const taskPreview = taskOk ? readFileSync(taskPath, 'utf8').slice(0, 120) : '';

  console.log(JSON.stringify({ result: out, taskOk, planOk, taskPreview }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

