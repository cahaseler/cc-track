import { describe, expect, test, beforeEach, mock } from "bun:test";
import { GitHelpers } from "./git-helpers";
import type { ExecFunction, FileOps } from "./git-helpers";

describe("GitHelpers", () => {
  let mockExec: ExecFunction;
  let mockFileOps: FileOps;
  let gitHelpers: GitHelpers;
  let execCalls: Array<{ command: string; options: any }> = [];

  beforeEach(() => {
    execCalls = [];
    
    mockExec = mock((command: string, options?: any) => {
      execCalls.push({ command, options });
      return "";
    });
    
    mockFileOps = {
      writeFileSync: mock(() => {}),
      unlinkSync: mock(() => {}),
    };
    
    gitHelpers = new GitHelpers(mockExec, mockFileOps);
  });

  describe("getDefaultBranch", () => {
    test("returns branch from origin HEAD if available", () => {
      mockExec = mock((command: string) => {
        if (command.includes("symbolic-ref")) {
          return "main\n";
        }
        throw new Error("Not found");
      });
      
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      const branch = gitHelpers.getDefaultBranch("/test");
      expect(branch).toBe("main");
    });

    test("checks for local main branch if origin HEAD fails", () => {
      mockExec = mock((command: string) => {
        if (command.includes("symbolic-ref")) {
          throw new Error("No origin");
        }
        if (command.includes("refs/heads/main")) {
          return ""; // Success (no error)
        }
        throw new Error("Not found");
      });
      
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      const branch = gitHelpers.getDefaultBranch("/test");
      expect(branch).toBe("main");
    });

    test("falls back to master if main doesn't exist", () => {
      mockExec = mock((command: string) => {
        if (command.includes("symbolic-ref")) {
          throw new Error("No origin");
        }
        if (command.includes("refs/heads/main")) {
          throw new Error("No main");
        }
        if (command.includes("refs/heads/master")) {
          return ""; // Success
        }
        throw new Error("Not found");
      });
      
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      const branch = gitHelpers.getDefaultBranch("/test");
      expect(branch).toBe("master");
    });

    test("defaults to main if neither main nor master exist", () => {
      mockExec = mock(() => {
        throw new Error("No branches");
      });
      
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      const branch = gitHelpers.getDefaultBranch("/test");
      expect(branch).toBe("main");
    });
  });

  describe("hasUncommittedChanges", () => {
    test("returns true when there are changes", () => {
      mockExec = mock(() => "M  file.txt\n?? newfile.txt\n");
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      expect(gitHelpers.hasUncommittedChanges("/test")).toBe(true);
    });

    test("returns false when working directory is clean", () => {
      mockExec = mock(() => "");
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      expect(gitHelpers.hasUncommittedChanges("/test")).toBe(false);
    });

    test("returns false on error", () => {
      mockExec = mock(() => {
        throw new Error("Not a git repo");
      });
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      expect(gitHelpers.hasUncommittedChanges("/test")).toBe(false);
    });
  });

  describe("getCurrentBranch", () => {
    test("returns current branch name", () => {
      mockExec = mock(() => "feature/test-branch\n");
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      expect(gitHelpers.getCurrentBranch("/test")).toBe("feature/test-branch");
    });

    test("returns empty string on error", () => {
      mockExec = mock(() => {
        throw new Error("Not a git repo");
      });
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      expect(gitHelpers.getCurrentBranch("/test")).toBe("");
    });
  });

  describe("createTaskBranch", () => {
    test("creates and switches to new branch", () => {
      mockExec = mock((command: string, options?: any) => {
        execCalls.push({ command, options });
        return "";
      });
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      gitHelpers.createTaskBranch("feature/new-feature", "/test");
      
      expect(execCalls).toHaveLength(1);
      expect(execCalls[0].command).toBe("git checkout -b feature/new-feature");
      expect(execCalls[0].options.cwd).toBe("/test");
    });

    test("throws error on failure", () => {
      mockExec = mock(() => {
        throw new Error("Branch already exists");
      });
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      expect(() => {
        gitHelpers.createTaskBranch("existing-branch", "/test");
      }).toThrow();
    });
  });

  describe("mergeTaskBranch", () => {
    test("switches to default branch and merges", () => {
      let callIndex = 0;
      const commands: string[] = [];
      
      mockExec = mock((command: string) => {
        commands.push(command);
        callIndex++;
        return "";
      });
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      gitHelpers.mergeTaskBranch("feature/task-001", "main", "/test");
      
      expect(commands).toHaveLength(2);
      expect(commands[0]).toBe("git checkout main");
      expect(commands[1]).toContain("git merge feature/task-001");
    });

    test("throws error on failure", () => {
      mockExec = mock(() => {
        throw new Error("Merge conflict");
      });
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      expect(() => {
        gitHelpers.mergeTaskBranch("feature/task-001", "main", "/test");
      }).toThrow();
    });
  });

  describe("generateCommitMessage", () => {
    test("returns generated commit message", async () => {
      mockExec = mock(() => "feat: add new feature\n");
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      const message = await gitHelpers.generateCommitMessage("diff content", "/test");
      expect(message).toBe("feat: add new feature");
    });

    test("extracts valid commit message from multi-line response", async () => {
      mockExec = mock(() => "Here is your commit message:\n\nfix: resolve login bug\n\nThat's all!");
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      const message = await gitHelpers.generateCommitMessage("diff content", "/test");
      expect(message).toBe("fix: resolve login bug");
    });

    test("returns fallback on error", async () => {
      mockExec = mock(() => {
        throw new Error("Claude API error");
      });
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      const message = await gitHelpers.generateCommitMessage("diff content", "/test");
      expect(message).toBe("chore: save work in progress");
    });

    test("truncates long diffs", async () => {
      const longDiff = "x".repeat(5000);
      let capturedPrompt = "";
      
      mockFileOps.writeFileSync = mock((path: string, content: string) => {
        capturedPrompt = content;
      });
      mockExec = mock(() => "feat: test");
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      await gitHelpers.generateCommitMessage(longDiff, "/test");
      
      // The prompt should contain truncated diff (3000 chars)
      expect(capturedPrompt).toContain("x".repeat(3000));
      expect(capturedPrompt).not.toContain("x".repeat(3001));
    });
  });

  describe("generateBranchName", () => {
    test("returns generated branch name with task ID", async () => {
      mockExec = mock(() => "feature/user-auth\n");
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      const name = await gitHelpers.generateBranchName("Add user authentication", "TASK_001", "/test");
      expect(name).toBe("feature/user-auth-task_001");
    });

    test("extracts valid branch name from multi-line response", async () => {
      mockExec = mock(() => "Here's your branch name:\n\nbug/fix-login\n\nUse this!");
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      const name = await gitHelpers.generateBranchName("Fix login issue", "TASK_002", "/test");
      expect(name).toBe("bug/fix-login-task_002");
    });

    test("returns fallback on error", async () => {
      mockExec = mock(() => {
        throw new Error("Claude API error");
      });
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      const name = await gitHelpers.generateBranchName("Some plan", "TASK_003", "/test");
      expect(name).toBe("feature/task-task_003");
    });
  });

  describe("switchToBranch", () => {
    test("switches to specified branch", () => {
      mockExec = mock((command: string, options?: any) => {
        execCalls.push({ command, options });
        return "";
      });
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      gitHelpers.switchToBranch("main", "/test");
      
      expect(execCalls).toHaveLength(1);
      expect(execCalls[0].command).toBe("git checkout main");
      expect(execCalls[0].options.cwd).toBe("/test");
    });

    test("throws error on failure", () => {
      mockExec = mock(() => {
        throw new Error("Branch not found");
      });
      gitHelpers = new GitHelpers(mockExec, mockFileOps);
      
      expect(() => {
        gitHelpers.switchToBranch("nonexistent", "/test");
      }).toThrow();
    });
  });
});