import net from "node:net";

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

const INSTREAM_CHUNK_SIZE = 32 * 1024;

function parseStreamResponse(text: string): VirusScanResult {
  const line = text.split("\0")[0].trim();
  const found = line.match(/^stream: (.+) FOUND$/);
  if (found) {
    return { status: "infected", signature: found[1] };
  }
  if (/^stream: OK$/.test(line)) {
    return { status: "clean" };
  }
  return { status: "error", message: line || "unexpected clamd response" };
}

/**
 * Scan a buffer via the ClamAV clamd INSTREAM protocol over TCP.
 *
 * Set CLAMAV_HOST (and optionally CLAMAV_PORT, default 3310) in the
 * environment. When CLAMAV_HOST is not set the scan is skipped so local/dev
 * runs don't hard-depend on a running container.
 */
export function scanBuffer(buf: Buffer, opts: ClamScanOptions = {}): Promise<VirusScanResult> {
  return new Promise((resolve) => {
    const host = opts.host ?? process.env["CLAMAV_HOST"];
    const port = opts.port ?? Number(process.env["CLAMAV_PORT"] ?? 3310);
    const timeoutMs = opts.timeoutMs ?? 60_000;

    if (!host) {
      resolve({ status: "skipped", message: "CLAMAV_HOST not configured" });
      return;
    }

    const socket = net.connect({ host, port });
    let response = "";
    let settled = false;

    const finish = (res: VirusScanResult): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(res);
    };

    socket.setTimeout(timeoutMs);
    socket.on("timeout", () => finish({ status: "error", message: "clamd scan timed out" }));
    socket.on("error", (err) => finish({ status: "error", message: err.message }));
    socket.on("data", (chunk) => {
      response += chunk.toString("utf8");
      if (response.includes("\0")) {
        finish(parseStreamResponse(response));
      }
    });

    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      for (let offset = 0; offset < buf.length; offset += INSTREAM_CHUNK_SIZE) {
        const part = buf.subarray(offset, Math.min(offset + INSTREAM_CHUNK_SIZE, buf.length));
        const header = Buffer.alloc(4);
        header.writeUInt32BE(part.length, 0);
        socket.write(header);
        socket.write(part);
      }
      socket.write(Buffer.alloc(4));
    });
  });
}
