# Dependency Injection and Mocking Guide

This codebase uses explicit dependency injection to keep side effects isolated and tests parallel‑safe. The pattern is consistent across libs, hooks, and commands: accept dependencies via constructor params or a `deps` object, provide production defaults inside the module, and never rely on mutable singletons in tests.

## Principles
- Inject side effects (filesystem, child_process, network, config, logging) via constructor args or a `deps` parameter.
- Provide narrow interfaces and production defaults inside the module. Tests pass mocks; production uses defaults.
- Avoid module‑level mutable state. If caching is required, expose a reset (e.g., `clearConfigCache()`), and call it in tests.
- Do not share mocks between tests. Each test creates fresh instances and restores with `mock.restore()` to avoid cross‑test leakage in parallel runs.

## Common Patterns

- Deps object (hooks):
  - Example: `capturePlanHook(input, deps)` accepts optional overrides for `execSync`, `fileOps`, `gitHelpers`, `githubHelpers`, `claudeSDK`, `logger`, and feature flags. The implementation uses `const exec = deps.execSync || execSync;` style to resolve defaults.
  - Files: `src/hooks/capture-plan.ts`, `src/hooks/stop-review.ts`, `src/hooks/post-compact.ts`, `src/hooks/edit-validation.ts`.

- Constructor injection (libs):
  - `GitHelpers(exec?, getGitConfig?, claudeSDK?)` injects command execution, config lookup, and Claude SDK.
  - `GitHubHelpers(exec?)` injects a shell exec adapter.
  - `ClaudeMdHelpers(fileOps?)` and `Logger(..., fs?)` inject file operations.
  - Files: `src/lib/git-helpers.ts`, `src/lib/github-helpers.ts`, `src/lib/claude-md.ts`, `src/lib/logger.ts`.

- Default adapters (production):
  - Modules define local defaults (e.g., `defaultExec`, `defaultFs`) and fall back when a dependency isn’t provided.
  - Standalone convenience functions use a lazily created default instance but tests should prefer class instances with explicit mocks.

## Parallel‑Safe Testing
- Always inject per‑test instances. Example: `new GitHelpers(mockExec, mockGetGitConfig, mockClaudeSDK)`.
- Reset global mocks between tests: `beforeEach(() => { mock.restore(); clearConfigCache(); })` where config is involved.
- Prefer DI over `mock.module` for Node built‑ins. If `mock.module` is unavoidable, restore it in `afterEach` and use fresh dynamic imports inside the test scope.
- Avoid mutating process‑wide state (e.g., `process.env`) without restoring it within the test.

## Shared Test Utilities

The codebase provides reusable test utilities in `src/test-utils/command-mocks.ts`:

```typescript
import { createMockLogger, createMockConsole, createMockProcess, createMockFileSystem,
         createTestDeps, assertFileWritten, assertConsoleContains } from '../test-utils/command-mocks';

// Create all test dependencies at once
const deps = createTestDeps({ cwd: '/project', fixedDate: '2025-01-01' });

// Or create individual mocks
const logger = createMockLogger();
const console = createMockConsole();
const fs = createMockFileSystem({ '/file.txt': 'content' });

// Use assertion helpers
assertFileWritten(deps, '/output.txt', 'expected content');
assertConsoleContains(deps, 'Success message');
```

## Example: Hook With DI

// Implementation (production defaults with overrides)
export async function exampleHook(input: HookInput, deps: {
  execSync?: typeof execSync;
  fileOps?: { existsSync: typeof existsSync };
  logger?: ReturnType<typeof createLogger>;
} = {}) {
  const exec = deps.execSync || execSync;
  const fs = deps.fileOps || { existsSync };
  const log = deps.logger || createLogger('example');
  // ...use exec, fs, log...
  return { continue: true };
}

// Test (parallel‑safe) - using shared utilities
import { createMockLogger } from '../test-utils/command-mocks';

beforeEach(() => { mock.restore(); /* clearConfigCache() if config used */ });

test('does work without touching globals', async () => {
  const exec = mock(() => 'ok');
  const fileOps = { existsSync: mock(() => true) };
  const logger = createMockLogger();  // Use shared utility

  const out = await exampleHook({ hook_event_name: 'PostToolUse' }, { execSync: exec, fileOps, logger });
  expect(out.continue).toBe(true);
});

## Example: Lib With Constructor Injection

// Implementation
export class MyService {
  constructor(private exec: ExecFn = defaultExec, private fs: FileOps = defaultFs, private log = createLogger('my-service')) {}
  run(cwd: string) { this.exec('echo hi', { cwd }); }
}

// Test
test('runs with mocked exec', () => {
  const calls: string[] = [];
  const exec = mock((cmd: string) => { calls.push(cmd); return ''; });
  const svc = new MyService(exec);
  svc.run('/tmp');
  expect(calls).toContain('echo hi');
});

## Do / Don’t
- Do: accept external effects via DI; provide production defaults inside the module.
- Do: export reset helpers for any caches (e.g., `clearConfigCache()`) and call them in tests.
- Do: create fresh instances and mocks per test; call `mock.restore()` in `beforeEach/afterEach`.
- Don’t: mutate module‑level singletons or share mocks across tests.
- Don’t: rely on hidden globals in tests; inject what you need.

## Quick References in Repo
- File system DI: `Logger` (`fs?`), `ClaudeMdHelpers(fileOps?)`
- Process execution DI: `GitHelpers(exec?)`, `GitHubHelpers(exec?)`
- Hook deps objects: `capturePlanHook`, `stopReviewHook`, `postCompactHook`, `editValidationHook`
- Config cache reset: `clearConfigCache()` in `src/lib/config.ts`
- Shared test utilities: `src/test-utils/command-mocks.ts` - createMockLogger, createMockConsole, createMockFileSystem, createTestDeps, assertFileWritten, assertConsoleContains

