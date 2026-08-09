import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Load .env from api-server root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../..", ".env");
dotenv.config({ path: envPath });

// Now import and run the actual job
await import("./process-textbooks.js");
