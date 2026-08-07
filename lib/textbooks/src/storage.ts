import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Storage abstraction for textbook files. `storage_key` is a flat, portable
 * path/object key — the same value works whether the backing store is a local
 * folder (default), R2 or B2. Swapping backends later only means providing a
 * different implementation of `TextbookStorage`.
 */
export interface TextbookStorage {
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

/** Normalize a storage key into a safe, forward-slash path. Rejects traversal. */
export function normalizeKey(key: string): string {
  const clean = key.replace(/^[/\\]+/, "").replace(/[/\\]+$/, "");
  const parts = clean.split(/[/\\]+/).filter((p) => p.length > 0);
  if (parts.some((p) => p === "..")) {
    throw new Error(`Invalid storage key (path traversal): "${key}"`);
  }
  return parts.join("/");
}

export class LocalStorage implements TextbookStorage {
  constructor(private readonly baseDir: string) {}

  private resolve(key: string): string {
    const clean = normalizeKey(key);
    const root = path.resolve(this.baseDir);
    const full = path.resolve(root, clean);
    if (full !== root && !full.startsWith(root + path.sep)) {
      throw new Error(`Invalid storage key (outside base dir): "${key}"`);
    }
    return full;
  }

  async putObject(key: string, body: Buffer, _contentType: string): Promise<void> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  }

  async getObject(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async deleteObject(key: string): Promise<void> {
    await fs.unlink(this.resolve(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }
}

export const DEFAULT_STORAGE_DIR = path.resolve(process.cwd(), "data", "textbooks");

/**
 * Build the storage backend from environment. `STORAGE_BACKEND` is reserved for
 * "s3" (R2/B2) later; today only "local" is implemented.
 */
export function getStorage(): TextbookStorage {
  const backend = process.env["STORAGE_BACKEND"] ?? "local";
  if (backend !== "local") {
    throw new Error(`STORAGE_BACKEND "${backend}" is not implemented yet — use "local"`);
  }
  const baseDir = process.env["FILE_STORAGE_DIR"] ?? DEFAULT_STORAGE_DIR;
  return new LocalStorage(baseDir);
}
