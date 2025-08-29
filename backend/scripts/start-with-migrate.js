#!/usr/bin/env node
/*
  Starts the NestJS app immediately and runs Prisma migrations in the background.
  This prevents the service from blocking on DB readiness so PaaS healthchecks can pass.
*/

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function runMigrations() {
  try {
    // Ensure Prisma has a directUrl for migrations; fall back to DATABASE_URL if needed
    const env = { ...process.env };
    if (!env.DATABASE_URL_UNPOOLED && env.DATABASE_URL) {
      env.DATABASE_URL_UNPOOLED = env.DATABASE_URL;
    }
    const child = spawn('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
      shell: true,
      env,
    });
    child.on('exit', (code) => {
      if (code === 0) {
        console.log('[prisma] migrate deploy completed successfully');
      } else {
        console.warn(`[prisma] migrate deploy exited with code ${code}`);
      }
    });
    child.on('error', (err) => {
      console.warn('[prisma] migrate deploy failed to start:', err?.message || err);
    });
  } catch (err) {
    console.warn('[prisma] migrate deploy spawn error:', err?.message || err);
  }
}

runMigrations();

// Start the compiled Nest app in the foreground, building if necessary
function startWithTsNode() {
  try {
    console.warn('[start] falling back to ts-node execution...');
    // Register ts-node to execute TypeScript directly
    require('ts-node/register');
    const srcEntry = path.resolve(__dirname, '..', 'src', 'main.ts');
    console.log(`[start] using ts-node entry: ${srcEntry}`);
    require(srcEntry);
  } catch (err) {
    console.error('[start] ts-node fallback failed:', err?.message || err);
    process.exit(1);
  }
}

function startApp() {
  const candidates = [
    path.resolve(__dirname, '..', 'dist', 'main.js'),
    path.resolve(__dirname, '..', 'dist', 'src', 'main.js'),
  ];
  const hasAny = candidates.some((p) => fs.existsSync(p));
  if (!hasAny) {
    console.warn('[start] no dist entry found; using ts-node fallback.');
    return startWithTsNode();
  }
  const resolved = candidates.find((p) => fs.existsSync(p));
  if (!resolved) {
    console.warn('[start] No dist entry present; using ts-node fallback.');
    return startWithTsNode();
  }
  console.log(`[start] using entry: ${resolved}`);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require(resolved);
}

startApp();
