/**
 * Seed wrapper: ensures infrastructure is running before seeding.
 * Starts postgres/redis via docker compose if Docker is available.
 */
import { execSync } from 'node:child_process';

const COMPOSE = 'docker compose -f infra/docker/docker-compose.yml';
const INFRA = 'postgres redis';

/**
 * Check if the Docker daemon is actually responding.
 * `docker info` can succeed (client-only) even when the daemon is down,
 * so we use `docker ps` which requires a live daemon.
 */
function isDaemonRunning() {
  try {
    execSync('docker ps', { stdio: 'pipe', windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

/** Check if Docker CLI is installed at all. */
function isDockerInstalled() {
  try {
    execSync('docker --version', { stdio: 'pipe', windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

function isPostgresHealthy() {
  try {
    const out = execSync('docker ps -q -f name=postgres -f health=healthy', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    }).trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

// ── 1. Ensure infra is running if Docker is available ──
if (!isDockerInstalled()) {
  console.warn('Docker is not installed. The seed requires a running Postgres database.');
  console.warn('Install Docker Desktop: https://docs.docker.com/get-docker/\n');
} else if (!isDaemonRunning()) {
  console.warn('Docker Desktop is running but the engine is not responding.');
  console.warn('Wait for Docker Desktop to fully start, then re-run: pnpm seed\n');
  process.exit(1);
} else if (!isPostgresHealthy()) {
  console.log('Starting infrastructure (postgres, redis)...');
  try {
    execSync(`${COMPOSE} up -d ${INFRA}`, { stdio: 'inherit', windowsHide: true });
  } catch {
    console.error('Failed to start infrastructure containers.');
    console.error('Try manually: pnpm dev:infra\n');
    process.exit(1);
  }

  // Wait for Postgres to be healthy
  console.log('Waiting for Postgres...');
  for (let i = 0; i < 60; i++) {
    if (isPostgresHealthy()) {
      console.log('Postgres is ready.');
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!isPostgresHealthy()) {
    console.error('Postgres did not become healthy in 60s.');
    process.exit(1);
  }
}

// ── 2. Run the seeds ──
console.log('\n--- Running seeds ---\n');
execSync('node services/auth-service/src/database/seeds/seed-admin.js', { stdio: 'inherit' });
execSync('node services/auth-service/src/database/seeds/seed-demo.js', { stdio: 'inherit' });
