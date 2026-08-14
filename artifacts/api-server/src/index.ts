import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import "./jobs/process-textbooks";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

const requiredEnvVars = ["GEMINI_API_KEY", "DATABASE_URL"];
const missingVars = requiredEnvVars.filter((env) => !process.env[env]);
if (missingVars.length > 0) {
  logger.error(`❌ AI Engine cannot start`);
  logger.error(`❌ Missing required environment variables: ${missingVars.join(", ")}`);
  process.exit(1);
} else {
  logger.info(`GEMINI_API_KEY: configured`);
  logger.info(`DATABASE_URL: configured`);
  logger.info(`Storage: configured`);
}

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
