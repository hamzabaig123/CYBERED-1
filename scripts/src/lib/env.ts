import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "../../..");

const candidates = [
  path.resolve(workspaceRoot, "artifacts/api-server/.env"),
  path.resolve(workspaceRoot, ".env"),
];

for (const file of candidates) {
  if (existsSync(file)) {
    dotenv.config({ path: file });
  }
}

if (!process.env["DATABASE_URL"]) {
  throw new Error(
    "DATABASE_URL is required — set it in artifacts/api-server/.env or a workspace .env",
  );
}
