import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import {
  findNextTaskNumber,
  generateEnrichmentPrompt,
  enrichPlanWithClaude,
  handleGitBranching,
  handleGitHubIntegration,
  updateClaudeMd,
  capturePlanHook,
  type CapturePlanDependencies,
} from "./capture-plan";
import type { HookInput } from "../types";

describe("capture-plan", () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  describe("findNextTaskNumber", () => {
    test("returns 1 when tasks directory doesn't exist", () => {
      const fileOps = {
        existsSync: mock(() => false),
        readdirSync: mock(() => []),
      };

      const result = findNextTaskNumber("/tasks", fileOps);
      expect(result).toBe(1);
    });

    test("returns 1 when tasks directory is empty", () => {
      const fileOps = {
        existsSync: mock(() => true),
        readdirSync: mock(() => []),
      };

      const result = findNextTaskNumber("/tasks", fileOps);
      expect(result).toBe(1);
    });

    test("finds highest task number and returns next", () => {
      const fileOps = {
        existsSync: mock(() => true),
        readdirSync: mock(() => [
          "TASK_001.md",
          "TASK_003.md",
          "TASK_002.md",
          "other-file.txt",
        ]),
      };

      const result = findNextTaskNumber("/tasks", fileOps);
      expect(result).toBe(4);
    });

    test("handles non-standard filenames gracefully", () => {
      const fileOps = {
        existsSync: mock(() => true),
        readdirSync: mock(() => [
          "TASK_001.md",
          "TASK_invalid.md",
          "random.txt",
          "TASK_005.md",
        ]),
      };

      const result = findNextTaskNumber("/tasks", fileOps);
      expect(result).toBe(6);
    });
  });

  describe("generateEnrichmentPrompt", () => {
    test("generates correct prompt with all required fields", () => {
      const plan = "Test plan content";
      const taskId = "001";
      const now = new Date("2025-01-01T10:30:00Z");

      const prompt = generateEnrichmentPrompt(plan, taskId, now);

      expect(prompt).toContain("Test plan content");
      expect(prompt).toContain("TASK_001.md");
      expect(prompt).toContain("**Task ID:** 001");
      expect(prompt).toContain("**Started:** 2025-01-01 10:30");
      expect(prompt).toContain("## Requirements");
      expect(prompt).toContain("## Success Criteria");
    });
  });

  describe("enrichPlanWithClaude", () => {
    test("successfully enriches plan using Claude CLI", async () => {
      const mockExecSync = mock(() => "# Enriched Task\n\nTask content here");
      const fileOps = {
        writeFileSync: mock(() => {}),
        existsSync: mock(() => true),
        unlinkSync: mock(() => {}),
      };
      const logger = {
        error: mock(() => {}),
      };

      const deps: CapturePlanDependencies = {
        execSync: mockExecSync,
        fileOps,
        logger: logger as any,
      };

      const result = await enrichPlanWithClaude("test prompt", "/tmp/prompt.txt", deps);

      expect(result).toBe("# Enriched Task\n\nTask content here");
      expect(fileOps.writeFileSync).toHaveBeenCalledWith("/tmp/prompt.txt", "test prompt");
      expect(fileOps.unlinkSync).toHaveBeenCalledWith("/tmp/prompt.txt");
    });

    test("cleans up temp file even on error", async () => {
      const mockExecSync = mock(() => {
        throw new Error("Claude CLI failed");
      });
      const fileOps = {
        writeFileSync: mock(() => {}),
        existsSync: mock(() => true),
        unlinkSync: mock(() => {}),
      };
      const logger = {
        error: mock(() => {}),
      };

      const deps: CapturePlanDependencies = {
        execSync: mockExecSync,
        fileOps,
        logger: logger as any,
      };

      await expect(enrichPlanWithClaude("test prompt", "/tmp/prompt.txt", deps)).rejects.toThrow(
        "Claude CLI failed"
      );

      expect(fileOps.unlinkSync).toHaveBeenCalledWith("/tmp/prompt.txt");
    });
  });

  describe("handleGitBranching", () => {
    test("returns null when git branching is disabled", async () => {
      mock.module("../lib/config", () => ({
        isHookEnabled: () => false,
      }));

      const result = await handleGitBranching("plan", "001", "/project", {});
      expect(result).toBe(null);
    });

    test("creates branch when enabled and in git repo", async () => {
      mock.module("../lib/config", () => ({
        isHookEnabled: (name: string) => name === "git_branching",
      }));

      const mockExecSync = mock((cmd: string) => {
        if (cmd.includes("git rev-parse")) return ".git";
        if (cmd.includes("git diff HEAD")) return "diff content";
        return "";
      });

      const mockGitHelpers = {
        hasUncommittedChanges: mock(() => true),
        generateCommitMessage: mock(async () => "Auto-commit message"),
        generateBranchName: mock(async () => "feature/task-001"),
        createTaskBranch: mock(() => {}),
      };

      const logger = {
        info: mock(() => {}),
        error: mock(() => {}),
      };

      const deps: CapturePlanDependencies = {
        execSync: mockExecSync,
        gitHelpers: mockGitHelpers as any,
        logger: logger as any,
      };

      const result = await handleGitBranching("plan", "001", "/project", deps);

      expect(result).toBe("feature/task-001");
      expect(mockGitHelpers.createTaskBranch).toHaveBeenCalledWith("feature/task-001", "/project");
    });

    test("returns null on git error", async () => {
      mock.module("../lib/config", () => ({
        isHookEnabled: () => true,
      }));

      const mockExecSync = mock(() => {
        throw new Error("Not a git repository");
      });

      const logger = {
        info: mock(() => {}),
        error: mock(() => {}),
      };

      const deps: CapturePlanDependencies = {
        execSync: mockExecSync,
        logger: logger as any,
      };

      const result = await handleGitBranching("plan", "001", "/project", deps);
      expect(result).toBe(null);
    });
  });

  describe("handleGitHubIntegration", () => {
    test("returns empty string when GitHub integration is disabled", async () => {
      mock.module("../lib/config", () => ({
        isGitHubIntegrationEnabled: () => false,
        getGitHubConfig: () => null,
      }));

      const result = await handleGitHubIntegration("content", "001", "/project", false, {});
      expect(result).toBe("");
    });

    test("creates issue and returns info when enabled", async () => {
      mock.module("../lib/config", () => ({
        isGitHubIntegrationEnabled: () => true,
        getGitHubConfig: () => ({
          auto_create_issues: true,
          use_issue_branches: false,
        }),
      }));

      const mockGitHubHelpers = {
        validateGitHubIntegration: mock(() => ({ valid: true, errors: [] })),
        formatTaskForGitHub: mock(() => ({
          title: "Test Task",
          body: "Task body",
        })),
        createGitHubIssue: mock(() => ({
          number: 42,
          url: "https://github.com/test/repo/issues/42",
        })),
        createIssueBranch: mock(() => null),
      };

      const logger = {
        info: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
      };

      const deps: CapturePlanDependencies = {
        githubHelpers: mockGitHubHelpers as any,
        logger: logger as any,
      };

      const result = await handleGitHubIntegration("content", "001", "/project", false, deps);

      expect(result).toContain("<!-- github_issue: 42 -->");
      expect(result).toContain("<!-- github_url: https://github.com/test/repo/issues/42 -->");
    });

    test("creates issue branch when configured", async () => {
      mock.module("../lib/config", () => ({
        isGitHubIntegrationEnabled: () => true,
        getGitHubConfig: () => ({
          auto_create_issues: true,
          use_issue_branches: true,
        }),
      }));

      const mockGitHubHelpers = {
        validateGitHubIntegration: mock(() => ({ valid: true, errors: [] })),
        formatTaskForGitHub: mock(() => ({
          title: "Test Task",
          body: "Task body",
        })),
        createGitHubIssue: mock(() => ({
          number: 42,
          url: "https://github.com/test/repo/issues/42",
        })),
        createIssueBranch: mock(() => "issue-42"),
      };

      const logger = {
        info: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
      };

      const deps: CapturePlanDependencies = {
        githubHelpers: mockGitHubHelpers as any,
        logger: logger as any,
      };

      const result = await handleGitHubIntegration("content", "001", "/project", false, deps);

      expect(result).toContain("<!-- issue_branch: issue-42 -->");
    });
  });

  describe("updateClaudeMd", () => {
    test("updates CLAUDE.md with new task when no active task", () => {
      const fileOps = {
        existsSync: mock(() => true),
        readFileSync: mock(() => "# Project\n\n@.claude/no_active_task.md\n"),
        writeFileSync: mock(() => {}),
      };

      updateClaudeMd("/project", "005", fileOps);

      expect(fileOps.writeFileSync).toHaveBeenCalledWith(
        "/project/CLAUDE.md",
        "# Project\n\n@.claude/tasks/TASK_005.md\n"
      );
    });

    test("replaces existing task reference", () => {
      const fileOps = {
        existsSync: mock(() => true),
        readFileSync: mock(() => "# Project\n\n@.claude/tasks/TASK_003.md\n"),
        writeFileSync: mock(() => {}),
      };

      updateClaudeMd("/project", "005", fileOps);

      expect(fileOps.writeFileSync).toHaveBeenCalledWith(
        "/project/CLAUDE.md",
        "# Project\n\n@.claude/tasks/TASK_005.md\n"
      );
    });

    test("does nothing when CLAUDE.md doesn't exist", () => {
      const fileOps = {
        existsSync: mock(() => false),
        readFileSync: mock(() => ""),
        writeFileSync: mock(() => {}),
      };

      updateClaudeMd("/project", "005", fileOps);

      expect(fileOps.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe("capturePlanHook", () => {
    test("returns early when hook is disabled", async () => {
      mock.module("../lib/config", () => ({
        isHookEnabled: () => false,
      }));

      const input: HookInput = {
        hook_event_name: "PostToolUse",
        tool_name: "ExitPlanMode",
        tool_input: { plan: "Test plan" },
        cwd: "/project",
      };

      const result = await capturePlanHook(input);
      expect(result).toEqual({ continue: true });
    });

    test("returns early when plan not approved in PostToolUse", async () => {
      mock.module("../lib/config", () => ({
        isHookEnabled: () => true,
      }));

      const input: HookInput = {
        hook_event_name: "PostToolUse",
        tool_name: "ExitPlanMode",
        tool_input: { plan: "Test plan" },
        tool_response: { success: false }, // No plan field
        cwd: "/project",
      };

      const logger = {
        debug: mock(() => {}),
        info: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
        exception: mock(() => {}),
      };

      const result = await capturePlanHook(input, { logger: logger as any });
      
      expect(result).toEqual({ continue: true });
      expect(logger.info).toHaveBeenCalledWith(
        "Plan was not approved, skipping task creation",
        expect.any(Object)
      );
    });

    test("creates task successfully when plan is approved", async () => {
      mock.module("../lib/config", () => ({
        isHookEnabled: (name: string) => name === "capture_plan",
        isGitHubIntegrationEnabled: () => false,
        getGitHubConfig: () => null,
      }));

      const mockExecSync = mock(() => "# Task Title\n\nEnriched content");
      
      let writtenFiles: Record<string, string> = {};
      const fileOps = {
        existsSync: mock((path: string) => path.includes("CLAUDE.md")),
        mkdirSync: mock(() => {}),
        readdirSync: mock(() => []),  // Empty tasks directory, so next will be 001
        readFileSync: mock(() => "# Project\n\n@.claude/no_active_task.md\n"),
        writeFileSync: mock((path: string, content: string) => {
          writtenFiles[path] = content;
        }),
        unlinkSync: mock(() => {}),
      };

      const input: HookInput = {
        hook_event_name: "PostToolUse",
        tool_name: "ExitPlanMode",
        tool_input: { plan: "Create a new feature" },
        tool_response: { plan: "Create a new feature" }, // Plan approved
        cwd: "/project",
        session_id: "test-session",
      };

      const deps: CapturePlanDependencies = {
        execSync: mockExecSync,
        fileOps,
      };

      const result = await capturePlanHook(input, deps);

      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain("✅ Plan captured as task 001");
      expect(writtenFiles["/project/.claude/plans/001.md"]).toContain("Create a new feature");
      expect(writtenFiles["/project/.claude/tasks/TASK_001.md"]).toContain("# Task Title");
      expect(writtenFiles["/project/CLAUDE.md"]).toContain("@.claude/tasks/TASK_001.md");
    });

    test("handles errors gracefully", async () => {
      mock.module("../lib/config", () => ({
        isHookEnabled: () => true,
      }));

      const mockExecSync = mock(() => {
        throw new Error("Claude CLI error");
      });

      const fileOps = {
        existsSync: mock(() => false),
        mkdirSync: mock(() => {}),
        readdirSync: mock(() => []),
        writeFileSync: mock(() => {}),
        unlinkSync: mock(() => {}),
      };

      const logger = {
        debug: mock(() => {}),
        info: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
        exception: mock(() => {}),
      };

      const input: HookInput = {
        hook_event_name: "PreToolUse",
        tool_name: "ExitPlanMode",
        tool_input: { plan: "Test plan" },
        cwd: "/project",
      };

      const deps: CapturePlanDependencies = {
        execSync: mockExecSync,
        fileOps,
        logger: logger as any,
        debugLog: mock(() => {}),
      };

      const result = await capturePlanHook(input, deps);

      expect(result).toEqual({ continue: true });
      expect(logger.exception).toHaveBeenCalled();
    });
  });
});