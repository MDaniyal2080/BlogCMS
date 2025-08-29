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
function startApp() {
  const mainPath = path.resolve(__dirname, '..', 'dist', 'main.js');
  if (!fs.existsSync(mainPath)) {
    console.warn('[start] dist/main.js not found; running build first...');
    const build = spawn('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
    build.on('exit', (code) => {
      if (code === 0) {
        console.log('[start] build completed. Starting application...');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../dist/main');
      } else {
        console.error(`[start] build failed with code ${code}`);
        process.exit(code || 1);
      }
    });
    build.on('error', (err) => {
      console.error('[start] build failed to spawn:', err?.message || err);
      process.exit(1);
    });
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../dist/main');
}

startApp();
