import { execSync, spawn } from 'node:child_process';
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
const INFRA = 'postgres redis qdrant kafka zookeeper rabbitmq ollama';
const OLLAMA_MODEL = process.env.LLM_MODEL || 'llama3';

const POSTGRES_PORT = Number(process.env.POSTGRES_PORT) || 5432;
const REDIS_PORT    = Number(process.env.REDIS_PORT)    || 6379;
const OLLAMA_PORT   = Number(process.env.OLLAMA_PORT)   || 11434;

const PROJECT_PORTS = [
  3000, 3001, 3002, 3003, 3004, 3005, 4000,
  POSTGRES_PORT, REDIS_PORT, OLLAMA_PORT,
  Number(process.env.QDRANT_HTTP_PORT)  || 6333,
  Number(process.env.QDRANT_GRPC_PORT)  || 6334,
  Number(process.env.KAFKA_PORT)        || 9092,
  Number(process.env.RABBITMQ_PORT)     || 5672,
  Number(process.env.RABBITMQ_MGMT_PORT)|| 15672,
];

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
    execSync('docker ps', { stdio: 'pipe', windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function ensureDockerRunning() {
  if (isDockerRunning()) return true;

  console.log('Docker is not running. Attempting to start it...');

  try {
    if (isWindows) {
      // Try common Docker Desktop install locations on Windows
      const candidates = [
        'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
        `${process.env.LOCALAPPDATA}\\Programs\\Docker\\Docker\\Docker Desktop.exe`,
        `${process.env.ProgramFiles}\\Docker\\Docker\\Docker Desktop.exe`,
      ];
      const exe = candidates.find(p => { try { return existsSync(p); } catch { return false; } });
      if (!exe) {
        console.error('  Could not find Docker Desktop. Install it from https://www.docker.com/products/docker-desktop/');
        return false;
      }
      // Start Docker Desktop detached (it takes ~30-60s to be ready)
      execSync(`start "" "${exe}"`, { shell: true, windowsHide: false, stdio: 'ignore' });
    } else if (process.platform === 'darwin') {
      execSync('open -a Docker', { stdio: 'ignore' });
    } else {
      // Linux — try to start the docker service
      execSync('sudo systemctl start docker 2>/dev/null || sudo service docker start 2>/dev/null', { shell: true, stdio: 'ignore' });
    }
  } catch {
    console.warn('  Could not auto-start Docker. Please start it manually and re-run.');
    return false;
  }

  // Poll until Docker is responsive (up to 120s)
  console.log('  Waiting for Docker to be ready (this can take up to 60s on first launch)...');
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    if (isDockerRunning()) {
      console.log('  Docker is ready.');
      return true;
    }
    if (i % 10 === 9) process.stdout.write(`  Still waiting... (${(i + 1) * 2}s)\n`);
  }

  console.error('  Docker did not become ready in 120s. Please start Docker Desktop manually.');
  return false;
}

function stopContainersOnPort(port) {
  try {
    const ids = execSync(`docker ps -q --filter "publish=${port}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }).trim();
    if (!ids) return;
    for (const id of ids.split('\n').filter(Boolean)) {
      try {
        execSync(`docker stop ${id}`, { stdio: 'pipe', windowsHide: true });
        console.log(`  Stopped container ${id} (was holding port ${port})`);
      } catch { /* already stopped */ }
    }
  } catch { /* docker not available */ }
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

// ── 2. Ensure Docker is running (auto-start if needed) ──
const dockerAvailable = await ensureDockerRunning();
let infraStarted = false;

if (dockerAvailable) {
  // Stop any external containers holding our infra ports (e.g. from other projects)
  console.log('Stopping external containers on conflicting ports...');
  for (const port of PROJECT_PORTS.filter(p => p >= 5000)) {
    stopContainersOnPort(port);
  }

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
  console.warn('Skipping infrastructure startup — Docker unavailable. Services needing databases will fail to connect.\n');
}

// ── 3. Wait for Postgres (only if infra started) ──
if (infraStarted) {
  console.log('Waiting for PostgreSQL to be ready...');
  let pgReady = false;
  let retries = 60;
  while (retries-- > 0) {
    try {
      const container = execSync('docker ps -q -f name=postgres', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }).trim();
      if (container) {
        execSync(`docker exec -i ${container} pg_isready -U ${process.env.POSTGRES_USER || 'quorvexa'} -d ${process.env.POSTGRES_DB || 'quorvexa_db'}`, { stdio: 'pipe', windowsHide: true });
        console.log('PostgreSQL is ready.');
        pgReady = true;
        break;
      }
    } catch { /* not ready yet */ }
    if (retries % 10 === 0 && retries < 55) {
      process.stdout.write(`  Still waiting for PostgreSQL... (${60 - retries}s)\n`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!pgReady) {
    console.error('\n[ERROR] PostgreSQL did not become ready in 60s.');
    console.error('  Showing container logs for diagnosis:');
    try {
      const logs = execSync('docker logs --tail 30 $(docker ps -aq -f name=postgres) 2>&1', { encoding: 'utf8', shell: true, windowsHide: true });
      console.error(logs);
    } catch {}
    console.error('  Tip: Run  docker ps -a  to see container status.');
    console.error('  Tip: If the postgres-data volume is corrupted, run:');
    console.error('       docker compose -f infra/docker/docker-compose.yml down -v');
    console.error('       (this wipes the database — dev data will be lost)\n');
  }
}

// ── 4. Pull Ollama model (only if infra started) ──
if (infraStarted) {
  console.log(`Waiting for Ollama and pulling model '${OLLAMA_MODEL}'...`);
  let ollamaReady = false;
  let retries = 60;
  while (retries-- > 0) {
    try {
      const container = execSync('docker ps -q -f name=ollama', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }).trim();
      if (container) {
        execSync(`docker exec ${container} curl -sf http://localhost:11434/api/tags`, { stdio: 'pipe', windowsHide: true });
        ollamaReady = true;
        break;
      }
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (ollamaReady) {
    try {
      const container = execSync('docker ps -q -f name=ollama', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }).trim();
      const tags = execSync(`docker exec ${container} ollama list`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
      if (!tags.includes(OLLAMA_MODEL)) {
        console.log(`  Pulling ${OLLAMA_MODEL} (first run — this may take a few minutes)...`);
        execSync(`docker exec ${container} ollama pull ${OLLAMA_MODEL}`, { stdio: 'inherit', windowsHide: true });
        console.log(`  Model '${OLLAMA_MODEL}' ready.`);
      } else {
        console.log(`  Model '${OLLAMA_MODEL}' already present.`);
      }
    } catch (err) {
      console.warn(`  Could not pull model '${OLLAMA_MODEL}':`, err.message);
    }
  } else {
    console.warn('  Ollama did not become ready in 120s — skipping model pull.');
  }
}

// ── 5. Build workspace dependencies ──
console.log('Building workspace packages...');
execSync('pnpm turbo run build --filter=./packages/*', { stdio: 'inherit' });

// ── 6. Start AI agent service (Python/FastAPI) ──
console.log('Starting AI agent service (Python/FastAPI)...');
const agentDir = resolve(import.meta.dirname, '..', 'services', 'ai-agent-service');
const isWindowsAgent = platform() === 'win32';
const agentProc = spawn(
  isWindowsAgent ? 'poetry.exe' : 'poetry',
  ['run', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '3005', '--reload'],
  { cwd: agentDir, stdio: 'inherit', windowsHide: true },
);
agentProc.on('error', (err) => {
  console.warn('  Failed to start AI agent service:', err.message);
  console.warn('  The AI agent will be unavailable. Install poetry and run:');
  console.warn('    cd services/ai-agent-service && poetry install && poetry run uvicorn app.main:app --port 3005');
});

// ── 7. Start all Node.js services in watch mode ──
console.log('Starting Node.js services (watch mode)...');
console.log('  Tip: Once services are up, run  pnpm seed  to create a default admin account.');
execSync('pnpm turbo run dev --parallel', { stdio: 'inherit' });
