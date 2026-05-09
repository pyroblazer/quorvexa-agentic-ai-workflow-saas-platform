import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { platform } from 'node:os';

// Load root .env into process.env so all turbo child processes inherit vars
const rootEnvPath = resolve(import.meta.dirname, '..', '.env');
if (existsSync(rootEnvPath)) {
  for (const line of readFileSync(rootEnvPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
  console.log('Loaded .env from monorepo root');
} else {
  console.warn('No .env found at monorepo root — services may fail to start.');
  console.warn('Run: cp .env.example .env  and edit with your secrets.');
}

const COMPOSE = 'docker compose -f infra/docker/docker-compose.yml';
const COMPOSE_OBS = 'docker compose -f infra/docker/docker-compose.obs.yml';
const INFRA = 'postgres redis qdrant kafka zookeeper rabbitmq';

const PROJECT_PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 4000, 5432, 6379, 6333, 6334, 9092, 5672, 15672, 11434];

const isWindows = platform() === 'win32';

function killOnPort(port) {
  try {
    if (isWindows) {
      const out = execSync(`netstat -ano | findstr ":${port} " | findstr "LISTENING"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
      const pids = new Set(out.trim().split('\n').map(l => l.trim().split(/\s+/).pop()).filter(Boolean));
      for (const pid of pids) {
        try { process.kill(Number(pid)); } catch { /* already gone */ }
      }
    } else {
      const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      const pids = out.trim().split('\n').filter(Boolean);
      for (const pid of pids) {
        try { process.kill(Number(pid)); } catch { /* already gone */ }
      }
    }
    return true;
  } catch {
    return false;
  }
}

function isDockerRunning() {
  try {
    execSync('docker info', { stdio: 'pipe', windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

// ── 1. Kill any processes occupying our ports ──
console.log('Freeing project ports...');
for (const port of PROJECT_PORTS) {
  try {
    if (killOnPort(port)) {
      console.log(`  Freed port ${port}`);
    }
  } catch {
    // port is free — skip
  }
}

// ── 2. Check if Docker is running ──
const dockerAvailable = isDockerRunning();
let infraStarted = false;

if (dockerAvailable) {
  // Stop previous containers
  console.log('Stopping previous containers...');
  for (const cmd of [`${COMPOSE} down --remove-orphans`, `${COMPOSE_OBS} down --remove-orphans`]) {
    try { execSync(cmd, { stdio: 'pipe', windowsHide: true }); } catch {}
  }

  // Start infrastructure
  console.log('Starting infrastructure services...');
  try {
    execSync(`${COMPOSE} up -d --force-recreate ${INFRA}`, { stdio: 'inherit' });
    infraStarted = true;
  } catch (err) {
    console.warn('Failed to start infrastructure containers. Services that need databases will not work.');
    console.warn('Make sure Docker Desktop is running.\n');
  }
} else {
  console.warn('Docker is not running. Skipping infrastructure startup.');
  console.warn('  Start Docker Desktop and re-run, or run: pnpm dev:infra');
  console.warn('  Services needing databases will fail to connect.\n');
}

// ── 3. Wait for Postgres (only if infra started) ──
if (infraStarted) {
  console.log('Waiting for databases to be ready...');
  let retries = 30;
  while (retries-- > 0) {
    try {
      const container = execSync('docker ps -q -f name=postgres', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }).trim();
      if (container) {
        execSync(`docker exec -i ${container} pg_isready -U quorvexa`, { stdio: 'pipe', windowsHide: true });
        console.log('PostgreSQL is ready.');
        break;
      }
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (retries <= 0) {
    console.warn('PostgreSQL did not become ready in 30s — continuing anyway.');
  }
}

// ── 4. Build workspace dependencies ──
console.log('Building workspace packages...');
execSync('pnpm turbo run build --filter=./packages/*', { stdio: 'inherit' });

// ── 5. Start all application services in watch mode ──
console.log('Starting all services (watch mode)...');
console.log('  Tip: Once services are up, run  pnpm seed  to create a default admin account.');
execSync('pnpm turbo run dev --parallel', { stdio: 'inherit' });
