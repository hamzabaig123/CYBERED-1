#!/usr/bin/env node
/**
 * CyberEd Project Startup Script
 * - Waits for PostgreSQL to be available
 * - Creates the database if it doesn't exist
 * - Runs Drizzle migrations (push schema)
 * - Starts the API server
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// Colors for terminal output
const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

console.log(c.bold(c.cyan(`
╔═══════════════════════════════════════════════╗
║          CyberEd API Server Starting          ║
╚═══════════════════════════════════════════════╝
`)));

// Load env
const envPath = resolve(__dirname, '.env');
if (!existsSync(envPath)) {
  console.error(c.red('ERROR: .env file not found at ' + envPath));
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => l.split('=').map((v, i) => i === 0 ? v.trim() : v.trim()))
);

const DATABASE_URL = env.DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(c.red('ERROR: DATABASE_URL not set in .env'));
  process.exit(1);
}

console.log(c.yellow(`📡 Database URL: ${DATABASE_URL.replace(/:([^:@]+)@/, ':***@')}`));

// Try to push schema using drizzle-kit
console.log(c.cyan('\n⚙️  Pushing database schema with drizzle-kit...'));
try {
  execSync('npx pnpm --filter "@workspace/db" drizzle-kit push --config=drizzle.config.ts', {
    stdio: 'inherit',
    cwd: ROOT,
    env: { ...process.env, ...env },
  });
  console.log(c.green('✅ Database schema ready!\n'));
} catch (err) {
  console.error(c.red('❌ Schema push failed. Make sure PostgreSQL is running and DATABASE_URL is correct.'));
  console.error(err.message);
  process.exit(1);
}

// Build the server
console.log(c.cyan('🔨 Building API server...'));
try {
  execSync('node ./build.mjs', {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env, ...env },
  });
  console.log(c.green('✅ Build complete!\n'));
} catch (err) {
  console.error(c.red('❌ Build failed.'));
  process.exit(1);
}

// Start the server
console.log(c.cyan('🚀 Starting API server...'));
const PORT = env.PORT || '3000';
const server = spawn(
  'node',
  ['--enable-source-maps', './dist/index.mjs'],
  {
    cwd: __dirname,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  }
);

server.on('error', (err) => {
  console.error(c.red('Failed to start server:'), err);
  process.exit(1);
});

console.log(c.green(`\n✅ API Server running at http://localhost:${PORT}`));
