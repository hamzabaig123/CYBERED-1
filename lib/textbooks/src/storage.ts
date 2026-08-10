import { promises as fs } from "node:fs";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type S3ClientConfig,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Storage abstraction for textbook files. `storage_key` is a flat, portable
 * path/object key — the same value works whether the backing store is a local
 * folder (default), R2 or B2. Swapping backends later only means providing a
 * different implementation of `TextbookStorage`.
 */
export interface TextbookStorage {
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  putStream(key: string, body: NodeJS.ReadableStream, contentType: string): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getPresignedUploadUrl?(key: string, expirySeconds: number): Promise<string | null>;
}

/**
 * Normalize a storage key into a safe, forward-slash path. Rejects traversal.
 * Handles both relative keys (preferred) and absolute Windows paths from legacy
 * DB records by extracting just the filename portion.
 */
export function normalizeKey(key: string): string {
  // Handle absolute Windows paths (e.g. D:\...\file.pdf or \\server\share\file.pdf)
  // by extracting just the filename — this preserves backward compat with
  // legacy DB records that stored absolute paths.
  if (/^[A-Za-z]:\\|^\\\\/ .test(key)) {
    const filename = key.split(/[/\\]+/).pop() ?? key;
    return filename.replace(/^[/\\]+/, "").replace(/[/\\]+$/, "");
  }
  const clean = key.replace(/^[/\\]+/, "").replace(/[/\\]+$/, "");
  const parts = clean.split(/[/\\]+/).filter((p) => p.length > 0);
  if (parts.some((p) => p === "..")) {
    throw new Error(`Invalid storage key (path traversal): "${key}"`);
  }
  return parts.join("/");
}

export class LocalStorage implements TextbookStorage {
  constructor(private readonly baseDir: string) { }

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

  async putStream(key: string, body: NodeJS.ReadableStream, _contentType: string): Promise<void> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    const fileStream = createWriteStream(full);
    for await (const chunk of body) {
      fileStream.write(chunk);
    }
    fileStream.end();
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

  async getPresignedUploadUrl(key: string, _expirySeconds: number): Promise<string | null> {
    const baseUrl = process.env["API_BASE_URL"] ?? "http://localhost:3000";
    return `${baseUrl}/api/files/direct-upload?storageKey=${encodeURIComponent(key)}`;
  }
}

export class S3Storage implements TextbookStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const bucket = process.env["S3_BUCKET"];
    if (!bucket) {
      throw new Error('S3Storage requires S3_BUCKET environment variable');
    }
    this.bucket = bucket;

    const region = process.env["S3_REGION"] ?? "auto";
    const endpoint = process.env["S3_ENDPOINT"];
    const forcePathStyle = process.env["S3_FORCE_PATH_STYLE"] === "true";

    const config: S3ClientConfig = { region, forcePathStyle };
    if (endpoint) {
      config.endpoint = endpoint;
    }

    const accessKeyId = process.env["S3_ACCESS_KEY_ID"];
    const secretAccessKey = process.env["S3_SECRET_ACCESS_KEY"];
    if (accessKeyId && secretAccessKey) {
      config.credentials = { accessKeyId, secretAccessKey };
    }

    this.client = new S3Client(config);
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    const clean = normalizeKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: clean,
        Body: body,
        ContentType: contentType,
      } as PutObjectCommandInput)
    );
  }

  async putStream(key: string, body: NodeJS.ReadableStream, contentType: string): Promise<void> {
    const clean = normalizeKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: clean,
        Body: body,
        ContentType: contentType,
      } as PutObjectCommandInput)
    );
  }

  async getObject(key: string): Promise<Buffer> {
    const clean = normalizeKey(key);
    const resp = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: clean })
    );
    const arr = await resp.Body?.transformToByteArray();
    if (!arr) {
      throw new Error(`Empty body for S3 object: ${clean}`);
    }
    return Buffer.from(arr);
  }

  async deleteObject(key: string): Promise<void> {
    const clean = normalizeKey(key);
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: clean })
    );
  }

  async exists(key: string): Promise<boolean> {
    const clean = normalizeKey(key);
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: clean })
      );
      return true;
    } catch (err: any) {
      if (err && (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404)) {
        return false;
      }
      throw err;
    }
  }

  async getPresignedUploadUrl(key: string, expirySeconds: number): Promise<string | null> {
    const clean = normalizeKey(key);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: clean,
    });
    const expiresIn = expirySeconds > 0 ? expirySeconds : 900;
    return getSignedUrl(this.client, command, { expiresIn });
  }
}

/**
 * Default storage root, anchored to the workspace rather than `process.cwd()`
 * so the ingestion script and the API server (different working directories)
 * always resolve the same folder. Storage keys already start with "textbooks/",
 * so PDFs land in <workspace>/data/textbooks/<subjectId>/.
 * Override the root with FILE_STORAGE_DIR.
 */
export const DEFAULT_STORAGE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "data",
);

/**
 * Build the storage backend from environment.
 * Supported: "local" (default), "s3" (AWS S3 / Cloudflare R2 / Backblaze B2).
 */
export function getStorage(): TextbookStorage {
  const backend = (process.env["STORAGE_BACKEND"] ?? "local").toLowerCase();
  if (backend === "s3") {
    return new S3Storage();
  }
  if (backend === "local") {
    const baseDir = process.env["FILE_STORAGE_DIR"] ?? DEFAULT_STORAGE_DIR;
    return new LocalStorage(baseDir);
  }
  throw new Error(`Unsupported STORAGE_BACKEND "${backend}" — use "local" or "s3"`);
}
