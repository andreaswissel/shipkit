import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { GeneratedFile } from "./types.js";

export interface WriteResult {
  success: boolean;
  written: WrittenFile[];
  errors: WriteError[];
}

export interface WrittenFile {
  path: string;
  action: "create" | "update";
  bytes: number;
}

export interface WriteError {
  path: string;
  error: string;
}

export interface FileWriterOptions {
  dryRun?: boolean;
}

export class FileWriter {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async write(
    files: GeneratedFile[],
    options: FileWriterOptions = {}
  ): Promise<WriteResult> {
    const written: WrittenFile[] = [];
    const errors: WriteError[] = [];

    for (const file of files) {
      const fullPath = path.resolve(this.baseDir, file.path);

      try {
        if (options.dryRun) {
          written.push({
            path: fullPath,
            action: file.action,
            bytes: Buffer.byteLength(file.content, "utf8"),
          });
          continue;
        }

        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });

        await fs.writeFile(fullPath, file.content, "utf8");

        written.push({
          path: fullPath,
          action: file.action,
          bytes: Buffer.byteLength(file.content, "utf8"),
        });
      } catch (err) {
        errors.push({
          path: fullPath,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      success: errors.length === 0,
      written,
      errors,
    };
  }
}
