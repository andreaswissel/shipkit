import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileWriter } from "./writer.js";
import type { GeneratedFile } from "./types.js";

describe("FileWriter", () => {
  let tempDir: string;
  let writer: FileWriter;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "shipkit-test-"));
    writer = new FileWriter(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("write()", () => {
    it("creates files in the output directory", async () => {
      const files: GeneratedFile[] = [
        { path: "test.txt", content: "hello world", action: "create" },
      ];

      const result = await writer.write(files);

      expect(result.success).toBe(true);
      expect(result.written).toHaveLength(1);
      expect(result.errors).toHaveLength(0);

      const content = await readFile(join(tempDir, "test.txt"), "utf8");
      expect(content).toBe("hello world");
    });

    it("creates nested directories as needed", async () => {
      const files: GeneratedFile[] = [
        {
          path: "deep/nested/dir/file.ts",
          content: "export const x = 1;",
          action: "create",
        },
      ];

      const result = await writer.write(files);

      expect(result.success).toBe(true);
      const content = await readFile(
        join(tempDir, "deep/nested/dir/file.ts"),
        "utf8"
      );
      expect(content).toBe("export const x = 1;");
    });

    it("handles both create and update actions", async () => {
      const files: GeneratedFile[] = [
        { path: "new.ts", content: "new file", action: "create" },
        { path: "existing.ts", content: "updated content", action: "update" },
      ];

      const result = await writer.write(files);

      expect(result.success).toBe(true);
      expect(result.written).toHaveLength(2);
      expect(result.written[0].action).toBe("create");
      expect(result.written[1].action).toBe("update");

      const newContent = await readFile(join(tempDir, "new.ts"), "utf8");
      const existingContent = await readFile(
        join(tempDir, "existing.ts"),
        "utf8"
      );
      expect(newContent).toBe("new file");
      expect(existingContent).toBe("updated content");
    });

    it("returns correct WriteResult with file paths and byte counts", async () => {
      const content = "hello 世界";
      const files: GeneratedFile[] = [
        { path: "unicode.txt", content, action: "create" },
      ];

      const result = await writer.write(files);

      expect(result.success).toBe(true);
      expect(result.written[0].path).toBe(join(tempDir, "unicode.txt"));
      expect(result.written[0].bytes).toBe(Buffer.byteLength(content, "utf8"));
      expect(result.written[0].action).toBe("create");
    });

    it("writes multiple files", async () => {
      const files: GeneratedFile[] = [
        { path: "a.ts", content: "file a", action: "create" },
        { path: "b.ts", content: "file b", action: "create" },
        { path: "c.ts", content: "file c", action: "create" },
      ];

      const result = await writer.write(files);

      expect(result.success).toBe(true);
      expect(result.written).toHaveLength(3);
    });
  });

  describe("dryRun option", () => {
    it("returns what would be written without writing", async () => {
      const files: GeneratedFile[] = [
        { path: "dryrun.txt", content: "should not exist", action: "create" },
      ];

      const result = await writer.write(files, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.written).toHaveLength(1);
      expect(result.written[0].path).toBe(join(tempDir, "dryrun.txt"));
      expect(result.written[0].bytes).toBe(
        Buffer.byteLength("should not exist", "utf8")
      );

      await expect(
        readFile(join(tempDir, "dryrun.txt"), "utf8")
      ).rejects.toThrow();
    });

    it("calculates correct byte counts in dry run", async () => {
      const content = "日本語テスト";
      const files: GeneratedFile[] = [
        { path: "test.txt", content, action: "create" },
      ];

      const result = await writer.write(files, { dryRun: true });

      expect(result.written[0].bytes).toBe(Buffer.byteLength(content, "utf8"));
    });
  });

  describe("error handling", () => {
    it("handles errors gracefully and continues processing", async () => {
      const invalidWriter = new FileWriter("/nonexistent/readonly/path");
      const files: GeneratedFile[] = [
        { path: "test.txt", content: "content", action: "create" },
      ];

      const result = await invalidWriter.write(files);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toContain("test.txt");
      expect(result.errors[0].error).toBeTruthy();
    });

    it("reports errors with correct paths", async () => {
      const invalidWriter = new FileWriter("/nonexistent");
      const files: GeneratedFile[] = [
        { path: "sub/file.txt", content: "content", action: "create" },
      ];

      const result = await invalidWriter.write(files);

      expect(result.errors[0].path).toBe("/nonexistent/sub/file.txt");
    });

    it("returns success true when no errors occur", async () => {
      const files: GeneratedFile[] = [
        { path: "valid.txt", content: "valid", action: "create" },
      ];

      const result = await writer.write(files);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
