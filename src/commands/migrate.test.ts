import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { MigrateDeps } from './migrate';
import { runMigrate } from './migrate';

describe('migrate command', () => {
  beforeEach(() => {
    mock.restore();
  });

  function getWrittenContent(writes: Map<string, string>, pathEnding: string): string {
    const path = Array.from(writes.keys()).find((k) => k.endsWith(pathEnding));
    if (!path) throw new Error(`No file found ending with ${pathEnding}`);
    const content = writes.get(path);
    if (!content) throw new Error(`No content found for ${path}`);
    return content;
  }

  function createMockDeps(
    options: {
      tasksExist?: boolean;
      taskFiles?: string[];
      taskContents?: Record<string, string>;
      constitutionExists?: boolean;
      backupExists?: boolean;
    } = {},
  ): { deps: MigrateDeps; capturedWrites: Map<string, string>; capturedDeletes: string[] } {
    const {
      tasksExist = true,
      taskFiles = ['TASK_001.md'],
      taskContents = {
        'TASK_001.md': '# Test Task\n\n**Purpose:** Test purpose\n\n## Requirements\n\n- Test requirement',
      },
      constitutionExists = false,
      backupExists = false,
    } = options;

    const capturedWrites = new Map<string, string>();
    const capturedDeletes: string[] = [];

    const fileOpsMock = {
      existsSync: mock((path: string) => {
        // Metadata files exist if they've been written
        if (path.endsWith('.metadata.json')) {
          return capturedWrites.has(path);
        }
        return false;
      }),
      mkdirSync: mock(() => {}),
      readFileSync: mock((path: string) => {
        if (capturedWrites.has(path)) {
          return capturedWrites.get(path) || '';
        }
        return '';
      }),
      writeFileSync: mock((path: string, content: string) => {
        capturedWrites.set(path, content);
      }),
    };

    const deps: MigrateDeps = {
      console: {
        log: mock(() => {}),
        error: mock(() => {}),
        warn: mock(() => {}),
      },
      process: {
        cwd: () => '/project',
        env: {},
        getExitCode: () => undefined,
        setExitCode: () => {},
      },
      fs: {
        existsSync: mock((path: string) => {
          if (path === '/project/.claude/tasks') return tasksExist;
          if (path === '/project/.claude/constitution.md') return constitutionExists;
          if (path === '/project/.claude/tasks.backup') return backupExists;
          // Spec directories don't exist yet (will be created)
          if (path.includes('/project/.claude/specs/') && path.endsWith('.metadata.json')) {
            return capturedWrites.has(path);
          }
          return false;
        }),
        readFileSync: mock((path: string, _encoding?: string) => {
          // Check if we've written this file in the test
          if (capturedWrites.has(path)) {
            return capturedWrites.get(path) || '';
          }
          // Handle task file reads
          const fileName = path.split('/').pop();
          if (fileName && taskContents[fileName]) {
            return taskContents[fileName];
          }
          // Handle CLAUDE.md reads for ClaudeMdHelpers
          if (path.endsWith('CLAUDE.md')) {
            return '# Project\n\nNo active task';
          }
          return '';
        }),
        writeFileSync: mock((path: string, content: string) => {
          capturedWrites.set(path, content);
        }),
        appendFileSync: mock(() => {}),
        mkdirSync: mock(() => {}),
        readdirSync: mock((path: string) => {
          if (path === '/project/.claude/tasks') return taskFiles;
          return [];
        }),
        unlinkSync: mock((path: string) => {
          capturedDeletes.push(path);
        }),
        copyFileSync: mock(() => {}),
      },
      path: {
        join: (...parts: string[]) => parts.join('/'),
        resolve: (...parts: string[]) => parts.join('/'),
        dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
        basename: (p: string) => p.split('/').pop() || '',
      },
      logger: () => ({
        debug: mock(() => {}),
        info: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
        exception: mock(() => {}),
      }),
      fileOps: fileOpsMock,
    };

    return { deps, capturedWrites, capturedDeletes };
  }

  describe('runMigrate', () => {
    test('returns success with 0 migrations when tasks directory does not exist', () => {
      const { deps } = createMockDeps({ tasksExist: false });

      const result = runMigrate(deps);

      expect(result.success).toBeTrue();
      expect(result.data?.migratedCount).toBe(0);
      expect(result.data?.failedCount).toBe(0);
      expect(result.data?.backupCreated).toBe(false);
      expect(result.messages?.some((m) => m.includes('No tasks directory'))).toBeTrue();
    });

    test('returns success with 0 migrations when no task files found', () => {
      const { deps } = createMockDeps({ taskFiles: [] });

      const result = runMigrate(deps);

      expect(result.success).toBeTrue();
      expect(result.data?.migratedCount).toBe(0);
      expect(result.data?.failedCount).toBe(0);
      expect(result.data?.backupCreated).toBe(false);
      expect(result.messages?.some((m) => m.includes('No old task files'))).toBeTrue();
    });

    test('migrates single task successfully', () => {
      const { deps, capturedWrites } = createMockDeps();

      const result = runMigrate(deps);

      expect(result.success).toBeTrue();
      expect(result.data?.migratedCount).toBe(1);
      expect(result.data?.failedCount).toBe(0);

      // Check that spec files were created
      const specFiles = Array.from(capturedWrites.keys()).filter((k) => k.includes('/specs/001-'));
      expect(specFiles.length).toBeGreaterThan(0);

      // Verify spec.md was created
      const specContent = getWrittenContent(capturedWrites, '/spec.md');
      expect(specContent).toContain('# Feature Specification:');
      expect(specContent).toContain('Test Task');
    });

    test('migrates multiple tasks', () => {
      const { deps } = createMockDeps({
        taskFiles: ['TASK_001.md', 'TASK_002.md', 'TASK_003.md'],
        taskContents: {
          'TASK_001.md': '# Task One\n\n**Purpose:** Purpose one',
          'TASK_002.md': '# Task Two\n\n**Purpose:** Purpose two',
          'TASK_003.md': '# Task Three\n\n**Purpose:** Purpose three',
        },
      });

      const result = runMigrate(deps);

      expect(result.success).toBeTrue();
      expect(result.data?.migratedCount).toBe(3);
      expect(result.data?.failedCount).toBe(0);
    });

    test('creates all required files for migrated task', () => {
      const { deps, capturedWrites } = createMockDeps();

      runMigrate(deps);

      const writtenPaths = Array.from(capturedWrites.keys());

      // Check for spec directory files
      expect(writtenPaths.some((p) => p.endsWith('/spec.md'))).toBeTrue();
      expect(writtenPaths.some((p) => p.endsWith('/plan.md'))).toBeTrue();
      expect(writtenPaths.some((p) => p.endsWith('/tasks.md'))).toBeTrue();
      expect(writtenPaths.some((p) => p.endsWith('/progress.md'))).toBeTrue();
      expect(writtenPaths.some((p) => p.endsWith('/.metadata.json'))).toBeTrue();
    });

    test('spec.md contains migration note', () => {
      const { deps, capturedWrites } = createMockDeps();

      runMigrate(deps);

      const specContent = getWrittenContent(capturedWrites, '/spec.md');
      expect(specContent).toContain('Migration Note');
      expect(specContent).toContain('auto-generated during migration');
    });

    test('plan.md contains original task content', () => {
      const originalContent = '# Original Task\n\nOriginal task content here';
      const { deps, capturedWrites } = createMockDeps({
        taskContents: { 'TASK_001.md': originalContent },
      });

      runMigrate(deps);

      const planContent = getWrittenContent(capturedWrites, '/plan.md');
      expect(planContent).toBe(originalContent);
    });

    test('metadata.json contains correct structure', () => {
      const { deps, capturedWrites } = createMockDeps();

      runMigrate(deps);

      const metadataContent = getWrittenContent(capturedWrites, '/.metadata.json');
      const metadata = JSON.parse(metadataContent);
      expect(metadata.task_id).toBe('001');
      expect(metadata.feature_name).toBeDefined();
      expect(metadata.status).toBe('in_progress');
      expect(metadata.started).toBeDefined();
    });

    test('extracts GitHub metadata when present', () => {
      const taskContent = `# GitHub Task
<!-- github_issue: 42 -->
<!-- github_url: https://github.com/user/repo/issues/42 -->

**Purpose:** Task with GitHub issue`;

      const { deps, capturedWrites } = createMockDeps({
        taskContents: { 'TASK_001.md': taskContent },
      });

      runMigrate(deps);

      const metadataContent = getWrittenContent(capturedWrites, '/.metadata.json');
      const metadata = JSON.parse(metadataContent);
      expect(metadata.github).toBeDefined();
      expect(metadata.github.issue).toBe(42);
      expect(metadata.github.url).toBe('https://github.com/user/repo/issues/42');
    });

    test('extracts branch metadata when present', () => {
      const taskContent = `# Branched Task
<!-- branch: feature/my-branch-001 -->

**Purpose:** Task with branch`;

      const { deps, capturedWrites } = createMockDeps({
        taskContents: { 'TASK_001.md': taskContent },
      });

      runMigrate(deps);

      const metadataContent = getWrittenContent(capturedWrites, '/.metadata.json');
      const metadata = JSON.parse(metadataContent);
      expect(metadata.branch).toBe('feature/my-branch-001');
    });

    test('creates backup when backup directory does not exist', () => {
      const { deps, capturedWrites, capturedDeletes } = createMockDeps({ backupExists: false });

      const result = runMigrate(deps);

      expect(result.data?.backupCreated).toBeTrue();

      // Check backup file was written
      const backupPath = Array.from(capturedWrites.keys()).find((k) => k.includes('tasks.backup'));
      expect(backupPath).toBeDefined();

      // Check original file was deleted
      expect(capturedDeletes.some((p) => p.endsWith('TASK_001.md'))).toBeTrue();
    });

    test('skips backup when backup directory already exists', () => {
      const { deps } = createMockDeps({ backupExists: true });

      const result = runMigrate(deps);

      expect(result.data?.backupCreated).toBe(false);
      expect(result.messages?.some((m) => m.includes('already exists'))).toBeTrue();
    });

    test('mentions constitution when it does not exist', () => {
      const { deps } = createMockDeps({ constitutionExists: false });

      const result = runMigrate(deps);

      expect(result.messages?.some((m) => m.includes('Constitution file not found'))).toBeTrue();
    });

    test('does not mention constitution when it exists', () => {
      const { deps } = createMockDeps({ constitutionExists: true });

      const result = runMigrate(deps);

      expect(result.messages?.some((m) => m.includes('Constitution file not found'))).toBe(false);
    });

    test('ignores non-task files in tasks directory', () => {
      const { deps } = createMockDeps({
        taskFiles: ['TASK_001.md', 'README.md', 'notes.txt', 'TASK_002.md'],
        taskContents: {
          'TASK_001.md': '# Task One',
          'TASK_002.md': '# Task Two',
        },
      });

      const result = runMigrate(deps);

      // Should only migrate the 2 valid task files
      expect(result.data?.migratedCount).toBe(2);
    });

    test('provides next steps in success messages', () => {
      const { deps } = createMockDeps();

      const result = runMigrate(deps);

      expect(result.messages?.some((m) => m.includes('Next steps'))).toBeTrue();
      expect(result.messages?.some((m) => m.includes('/clarify'))).toBeTrue();
      expect(result.messages?.some((m) => m.includes('/plan'))).toBeTrue();
      expect(result.messages?.some((m) => m.includes('/tasks'))).toBeTrue();
    });

    test('generates valid feature names from task titles', () => {
      const { deps, capturedWrites } = createMockDeps({
        taskContents: {
          'TASK_001.md': '# Add User Authentication & Authorization',
        },
      });

      runMigrate(deps);

      const metadataContent = getWrittenContent(capturedWrites, '/.metadata.json');
      const metadata = JSON.parse(metadataContent);
      // Should be converted to lowercase slug without special characters
      expect(metadata.feature_name).toBe('add-user-authentication-authorization');
    });

    test('uses default title when no title found in task', () => {
      const { deps, capturedWrites } = createMockDeps({
        taskContents: {
          'TASK_001.md': 'No title here, just content',
        },
      });

      runMigrate(deps);

      const specContent = getWrittenContent(capturedWrites, '/spec.md');
      expect(specContent).toContain('Task 001');
    });

    test('extracts requirements section from old task', () => {
      const taskContent = `# Task With Requirements

**Purpose:** Test purpose

## Requirements

- Must support user authentication
- Must validate email addresses
- Must store passwords securely

## Implementation

Some implementation details`;

      const { deps, capturedWrites } = createMockDeps({
        taskContents: { 'TASK_001.md': taskContent },
      });

      runMigrate(deps);

      const specContent = getWrittenContent(capturedWrites, '/spec.md');
      expect(specContent).toContain('Must support user authentication');
      expect(specContent).toContain('Must validate email addresses');
    });

    test('uses placeholder when no requirements section found', () => {
      const { deps, capturedWrites } = createMockDeps({
        taskContents: {
          'TASK_001.md': '# Simple Task\n\nJust some content',
        },
      });

      runMigrate(deps);

      const specContent = getWrittenContent(capturedWrites, '/spec.md');
      expect(specContent).toContain('[Requirement to be defined based on plan.md]');
    });
  });
});
