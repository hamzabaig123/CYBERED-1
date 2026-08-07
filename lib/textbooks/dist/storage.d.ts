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
export declare function normalizeKey(key: string): string;
export declare class LocalStorage implements TextbookStorage {
    private readonly baseDir;
    constructor(baseDir: string);
    private resolve;
    putObject(key: string, body: Buffer, _contentType: string): Promise<void>;
    getObject(key: string): Promise<Buffer>;
    deleteObject(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
}
/**
 * Default storage root, anchored to the workspace rather than `process.cwd()`
 * so the ingestion script and the API server (different working directories)
 * always resolve the same folder. Storage keys already start with "textbooks/",
 * so PDFs land in <workspace>/data/textbooks/<subjectId>/.
 * Override the root with FILE_STORAGE_DIR.
 */
export declare const DEFAULT_STORAGE_DIR: string;
/**
 * Build the storage backend from environment. `STORAGE_BACKEND` is reserved for
 * "s3" (R2/B2) later; today only "local" is implemented.
 */
export declare function getStorage(): TextbookStorage;
//# sourceMappingURL=storage.d.ts.map