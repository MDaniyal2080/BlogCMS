#!/usr/bin/env node
/*
  Starts the NestJS app immediately and runs Prisma migrations in the background.
  This prevents the service from blocking on DB readiness so PaaS healthchecks can pass.
*/

const { spawn } = require('child_process');

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

// Start the compiled Nest app in the foreground
require('../dist/main');
