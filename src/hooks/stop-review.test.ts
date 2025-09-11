import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import {
  SessionReviewer,
  isGitRepository,
  hasUncommittedChanges,
  generateStopOutput,
  stopReviewHook,
  type StopReviewDependencies,
  type ReviewResult,
} from "./stop-review";
import type { HookInput } from "../types";

describe("stop-review", () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  describe("isGitRepository", () => {
    test("returns true when in git repo", () => {
      const mockExec = mock(() => ".git");
      expect(isGitRepository("/project", mockExec)).toBe(true);
    });

    test("returns false when not in git repo", () => {
      const mockExec = mock(() => {
        throw new Error("Not a git repository");
      });
      expect(isGitRepository("/project", mockExec)).toBe(false);
    });
  });

  describe("hasUncommittedChanges", () => {
    test("returns true when changes exist", () => {
      const mockExec = mock(() => "M file.ts\nA new.ts");
      expect(hasUncommittedChanges("/project", mockExec)).toBe(true);
    });

    test("returns false when no changes", () => {
      const mockExec = mock(() => "");
      expect(hasUncommittedChanges("/project", mockExec)).toBe(false);
    });

    test("returns false on error", () => {
      const mockExec = mock(() => {
        throw new Error("Git error");
      });
      expect(hasUncommittedChanges("/project", mockExec)).toBe(false);
    });
  });

  describe("generateStopOutput", () => {
    test("allows stop when in stop hook regardless of status", () => {
      const review: ReviewResult = {
        status: "deviation",
        message: "Major deviation",
        commitMessage: "",
      };

      const output = generateStopOutput(review, true, null);
      expect(output.continue).toBe(true);
      expect(output.systemMessage).toContain("Review: Major deviation");
    });

    test("generates on_track output", () => {
      const review: ReviewResult = {
        status: "on_track",
        message: "All good",
        commitMessage: "[wip] Work done",
        details: "Details here",
      };

      const output = generateStopOutput(review, false, "Task suggestion");
      expect(output.continue).toBe(true);
      expect(output.systemMessage).toContain("🛤️ Project is on track");
      expect(output.systemMessage).toContain("Task suggestion");
    });

    test("blocks on deviation", () => {
      const review: ReviewResult = {
        status: "deviation",
        message: "Wrong direction",
        commitMessage: "",
      };

      const output = generateStopOutput(review, false, null);
      expect(output.decision).toBe("block");
      expect(output.systemMessage).toContain("⚠️ DEVIATION DETECTED");
    });

    test("blocks on needs_verification", () => {
      const review: ReviewResult = {
        status: "needs_verification",
        message: "Test your code",
        commitMessage: "",
      };

      const output = generateStopOutput(review, false, null);
      expect(output.decision).toBe("block");
      expect(output.systemMessage).toContain("🔍 VERIFICATION NEEDED");
    });

    test("allows stop on critical_failure", () => {
      const review: ReviewResult = {
        status: "critical_failure",
        message: "Deleted important files",
        commitMessage: "",
      };

      const output = generateStopOutput(review, false, null);
      expect(output.continue).toBe(true);
      expect(output.systemMessage).toContain("🚨 CRITICAL ISSUE");
    });
  });

  describe("SessionReviewer", () => {
    describe("getGitDiff", () => {
      test("returns diff when changes exist", () => {
        const mockExec = mock((cmd: string) => {
          if (cmd.includes("status")) return "M file.ts";
          if (cmd.includes("diff")) return "diff content here";
          return "";
        });

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer("/project", logger as any, { execSync: mockExec });
        const diff = reviewer.getGitDiff();
        expect(diff).toBe("diff content here");
      });

      test("returns empty string when no changes", () => {
        const mockExec = mock(() => "");
        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer("/project", logger as any, { execSync: mockExec });
        const diff = reviewer.getGitDiff();
        expect(diff).toBe("");
      });
    });

    describe("getFilteredGitDiff", () => {
      test("filters out documentation files", () => {
        const mockExec = mock(() => `diff --git a/file.ts b/file.ts
+code change
diff --git a/README.md b/README.md
+doc change
diff --git a/src/test.ts b/src/test.ts
+more code`);

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer("/project", logger as any, { execSync: mockExec });
        const result = reviewer.getFilteredGitDiff();

        expect(result.hasDocChanges).toBe(true);
        expect(result.docOnlyChanges).toBe(false);
        expect(result.filteredDiff).toContain("file.ts");
        expect(result.filteredDiff).not.toContain("README.md");
        expect(result.filteredDiff).toContain("test.ts");
      });

      test("identifies doc-only changes", () => {
        const mockExec = mock(() => `diff --git a/README.md b/README.md
+doc change
diff --git a/docs/guide.md b/docs/guide.md
+more docs`);

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer("/project", logger as any, { execSync: mockExec });
        const result = reviewer.getFilteredGitDiff();

        expect(result.hasDocChanges).toBe(true);
        expect(result.docOnlyChanges).toBe(true);
        expect(result.filteredDiff).toBe("");
      });
    });

    describe("buildReviewPrompt", () => {
      test("builds prompt with all sections", () => {
        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer("/project", logger as any);
        const prompt = reviewer.buildReviewPrompt(
          "Task content",
          "Recent messages",
          "Diff content",
          false
        );

        expect(prompt).toContain("Active Task Requirements:");
        expect(prompt).toContain("Recent Conversation");
        expect(prompt).toContain("Git Diff");
        expect(prompt).toContain("Review Categories");
        expect(prompt).toContain("ONLY a valid JSON object");
      });

      test("includes doc note when has doc changes", () => {
        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer("/project", logger as any);
        const prompt = reviewer.buildReviewPrompt(
          "Task",
          "Messages",
          "Diff",
          true
        );

        expect(prompt).toContain("documentation files have been filtered out");
      });

      test("throws when diff is too large", () => {
        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer("/project", logger as any);
        const hugeDiff = "x".repeat(60000);

        expect(() => {
          reviewer.buildReviewPrompt("Task", "Messages", hugeDiff, false);
        }).toThrow("Diff too large for review");
      });
    });

    describe("checkRecentNonTaskCommits", () => {
      test("counts consecutive non-task commits", () => {
        const mockExec = mock(() => `abc123 chore: update docs
def456 fix: bug fix
ghi789 [wip] TASK_001: feature work`);

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer("/project", logger as any, { execSync: mockExec });
        const count = reviewer.checkRecentNonTaskCommits();
        expect(count).toBe(2);
      });

      test("returns 0 when most recent is task commit", () => {
        const mockExec = mock(() => `abc123 [wip] TASK_002: work
def456 chore: cleanup`);

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer("/project", logger as any, { execSync: mockExec });
        const count = reviewer.checkRecentNonTaskCommits();
        expect(count).toBe(0);
      });
    });

    describe("commitChanges", () => {
      test("commits successfully", async () => {
        const commands: string[] = [];
        const mockExec = mock((cmd: string) => {
          commands.push(cmd);
          return "";
        });

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer("/project", logger as any, { execSync: mockExec });
        const result = await reviewer.commitChanges("[wip] Test commit");

        expect(result).toBe(true);
        expect(commands).toContain("git add -A");
        expect(commands[1]).toContain("[wip] Test commit");
      });

      test("returns false on error", async () => {
        const mockExec = mock(() => {
          throw new Error("Commit failed");
        });

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer("/project", logger as any, { execSync: mockExec });
        const result = await reviewer.commitChanges("[wip] Test");
        expect(result).toBe(false);
      });
    });

    describe("review", () => {
      test("returns no changes when diff is empty", async () => {
        const mockExec = mock(() => "");
        const fileOps = {
          existsSync: mock(() => false),
          readFileSync: mock(() => ""),
        };

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer("/project", logger as any, { execSync: mockExec, fileOps: fileOps as any });
        const result = await reviewer.review("/transcript.jsonl");

        expect(result.status).toBe("on_track");
        expect(result.message).toBe("No changes to commit");
        expect(result.commitMessage).toBe("");
      });

      test("handles doc-only changes without task", async () => {
        const mockExec = mock((cmd: string) => {
          if (cmd.includes("status")) return "M README.md";
          if (cmd.includes("diff")) return "diff --git a/README.md b/README.md\n+doc change";
          return "";
        });

        const fileOps = {
          existsSync: mock(() => false),
          readFileSync: mock(() => ""),
        };

        const logger = {
          debug: mock(() => {}),
          info: mock(() => {}),
          warn: mock(() => {}),
          error: mock(() => {}),
        };

        const reviewer = new SessionReviewer("/project", logger as any, { execSync: mockExec, fileOps: fileOps as any });
        const result = await reviewer.review("/transcript.jsonl");

        expect(result.status).toBe("on_track");
        expect(result.message).toBe("Documentation updates only");
        expect(result.commitMessage).toBe("docs: update project documentation");
      });
    });
  });

  describe("stopReviewHook", () => {
    test("returns early when hook is disabled", async () => {
      mock.module("../lib/config", () => ({
        isHookEnabled: () => false,
      }));

      const input: HookInput = {
        hook_event_name: "Stop",
        cwd: "/project",
      };

      const result = await stopReviewHook(input);
      expect(result).toEqual({ continue: true });
    });

    test("returns early when not in git repo", async () => {
      mock.module("../lib/config", () => ({
        isHookEnabled: () => true,
      }));

      const mockExec = mock(() => {
        throw new Error("Not a git repository");
      });

      const input: HookInput = {
        hook_event_name: "Stop",
        cwd: "/project",
      };

      const result = await stopReviewHook(input, { execSync: mockExec });
      expect(result.success).toBe(true);
      expect(result.message).toContain("Not a git repository");
    });

    test("returns early when no changes", async () => {
      mock.module("../lib/config", () => ({
        isHookEnabled: () => true,
      }));

      const mockExec = mock((cmd: string) => {
        if (cmd.includes("rev-parse")) return ".git";
        if (cmd.includes("status")) return "";
        return "";
      });

      const logger = {
        debug: mock(() => {}),
        info: mock(() => {}),
        error: mock(() => {}),
        exception: mock(() => {}),
      };

      const input: HookInput = {
        hook_event_name: "Stop",
        cwd: "/project",
      };

      const result = await stopReviewHook(input, { execSync: mockExec, logger: logger as any });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBe("✅ No changes to commit");
    });

    test("handles review and commit successfully", async () => {
      mock.module("../lib/config", () => ({
        isHookEnabled: () => true,
      }));

      const mockExec = mock((cmd: string) => {
        if (cmd.includes("rev-parse")) return ".git";
        if (cmd.includes("status")) return "M file.ts";
        if (cmd.includes("diff")) return "diff content";
        if (cmd.includes("log")) return "recent commits";
        return "";
      });

      // Mock file operations for SessionReviewer
      const fileOps = {
        existsSync: mock(() => false),
        readFileSync: mock(() => ""),
        createReadStream: mock(() => ({
          on: mock(() => {}),
        })),
      };

      const logger = {
        debug: mock(() => {}),
        info: mock(() => {}),
        error: mock(() => {}),
        exception: mock(() => {}),
      };

      const input: HookInput = {
        hook_event_name: "Stop",
        cwd: "/project",
        session_id: "test-session",
        transcript_path: "/transcript.jsonl",
      };

      const deps: StopReviewDependencies = {
        execSync: mockExec,
        fileOps: fileOps as any,
        logger: logger as any,
      };

      const result = await stopReviewHook(input, deps);
      expect(result.continue).toBe(true);
    });
  });
});