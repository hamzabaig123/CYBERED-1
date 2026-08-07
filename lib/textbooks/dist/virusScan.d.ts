export type VirusScanStatus = "clean" | "infected" | "skipped" | "error";
export interface VirusScanResult {
    status: VirusScanStatus;
    signature?: string;
    message?: string;
}
export interface ClamScanOptions {
    host?: string;
    port?: number;
    timeoutMs?: number;
}
/**
 * Scan a buffer via the ClamAV clamd INSTREAM protocol over TCP.
 *
 * Set CLAMAV_HOST (and optionally CLAMAV_PORT, default 3310) in the
 * environment. When CLAMAV_HOST is not set the scan is skipped so local/dev
 * runs don't hard-depend on a running container.
 */
export declare function scanBuffer(buf: Buffer, opts?: ClamScanOptions): Promise<VirusScanResult>;
//# sourceMappingURL=virusScan.d.ts.map