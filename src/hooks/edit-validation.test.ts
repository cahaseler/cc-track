import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import {
  extractFilePaths,
  filterTypeScriptFiles,
  formatValidationResults,
  editValidationHook,
} from "./edit-validation";
import type { HookInput } from "../types";

describe("edit-validation", () => {
  beforeEach(() => {
    mock.restore();
  });
  
  afterEach(() => {
    mock.restore();
  });

  describe("extractFilePaths", () => {
    test("extracts path from Edit tool", () => {
      const paths = extractFilePaths("Edit", { file_path: "/test/file.ts" });
      expect(paths).toEqual(["/test/file.ts"]);
    });

    test("extracts path from Write tool", () => {
      const paths = extractFilePaths("Write", { file_path: "/test/new.ts" });
      expect(paths).toEqual(["/test/new.ts"]);
    });

    test("extracts path from MultiEdit tool", () => {
      const paths = extractFilePaths("MultiEdit", { file_path: "/test/multi.ts" });
      expect(paths).toEqual(["/test/multi.ts"]);
    });

    test("returns empty array for other tools", () => {
      const paths = extractFilePaths("Read", { file_path: "/test/file.ts" });
      expect(paths).toEqual([]);
    });

    test("returns empty array when no file_path", () => {
      const paths = extractFilePaths("Edit", { other_field: "value" });
      expect(paths).toEqual([]);
    });
  });

  describe("filterTypeScriptFiles", () => {
    test("filters .ts files", () => {
      const files = filterTypeScriptFiles([
        "/test/file.ts",
        "/test/file.js",
        "/test/other.ts",
      ]);
      expect(files).toEqual(["/test/file.ts", "/test/other.ts"]);
    });

    test("includes .tsx files", () => {
      const files = filterTypeScriptFiles([
        "/test/component.tsx",
        "/test/file.jsx",
      ]);
      expect(files).toEqual(["/test/component.tsx"]);
    });

    test("includes .mts and .cts files", () => {
      const files = filterTypeScriptFiles([
        "/test/module.mts",
        "/test/common.cts",
        "/test/file.mjs",
      ]);
      expect(files).toEqual(["/test/module.mts", "/test/common.cts"]);
    });

    test("returns empty array when no TypeScript files", () => {
      const files = filterTypeScriptFiles([
        "/test/file.js",
        "/test/style.css",
        "/test/doc.md",
      ]);
      expect(files).toEqual([]);
    });
  });

  describe("formatValidationResults", () => {
    test("formats single file with errors", () => {
      const results = [{
        fileName: "test.ts",
        errors: ["Line 10: Missing semicolon", "Line 15: Unused variable"],
      }];
      
      const formatted = formatValidationResults(results);
      expect(formatted).toContain("Issues in test.ts:");
      expect(formatted).toContain("  - Line 10: Missing semicolon");
      expect(formatted).toContain("  - Line 15: Unused variable");
    });

    test("formats multiple files with errors", () => {
      const results = [
        {
          fileName: "file1.ts",
          errors: ["Error 1"],
        },
        {
          fileName: "file2.ts",
          errors: ["Error 2"],
        },
      ];
      
      const formatted = formatValidationResults(results);
      expect(formatted).toContain("Issues in file1.ts:");
      expect(formatted).toContain("Issues in file2.ts:");
    });

    test("returns empty string for no results", () => {
      const formatted = formatValidationResults([]);
      expect(formatted).toBe("");
    });
  });

  describe("editValidationHook", () => {
    test("returns continue when hook is disabled", async () => {
      mock.module("../lib/config", () => ({
        isHookEnabled: () => false,
      }));

      const input: HookInput = {
        tool_name: "Edit",
        tool_input: { file_path: "/test/file.ts" },
        tool_response: { success: true },
        cwd: "/test",
      };

      const result = await editValidationHook(input);
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    test("returns continue when tool execution failed", async () => {
      mock.module("../lib/config", () => ({
        isHookEnabled: () => true,
      }));

      const input: HookInput = {
        tool_name: "Edit",
        tool_input: { file_path: "/test/file.ts" },
        tool_response: { success: false },
        cwd: "/test",
      };

      const result = await editValidationHook(input);
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    test("returns continue when no TypeScript files", async () => {
      mock.module("../lib/config", () => ({
        isHookEnabled: () => true,
      }));

      const input: HookInput = {
        tool_name: "Edit",
        tool_input: { file_path: "/test/file.js" },
        tool_response: { success: true },
        cwd: "/test",
      };

      const result = await editValidationHook(input);
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    test("handles errors gracefully", async () => {
      mock.module("../lib/config", () => ({
        isHookEnabled: () => {
          throw new Error("Config error");
        },
      }));

      const input: HookInput = {
        tool_name: "Edit",
        tool_input: { file_path: "/test/file.ts" },
        tool_response: { success: true },
        cwd: "/test",
      };

      const result = await editValidationHook(input);
      expect(result.continue).toBe(true);
    });
  });
});