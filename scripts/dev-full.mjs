import { execSync } from 'node:child_process';

const COMPOSE = 'docker compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.obs.yml';
const INFRA = 'postgres redis qdrant kafka zookeeper rabbitmq';

// ── 1. Stop any previously running containers ──
console.log('Stopping previous containers...');
try { execSync('docker compose -f infra/docker/docker-compose.yml down --remove-orphans', { stdio: 'pipe' }); } catch {}
try { execSync('docker compose -f infra/docker/docker-compose.obs.yml down --remove-orphans', { stdio: 'pipe' }); } catch {}

// ── 2. Start all infrastructure + observability ──
console.log('Starting infrastructure + observability...');
execSync(`${COMPOSE} up -d --force-recreate ${INFRA}`, { stdio: 'inherit' });

// ── 3. Wait for Postgres ──
console.log('Waiting for databases to be ready...');
let retries = 30;
while (retries-- > 0) {
  try {
    execSync(`docker exec -i $(docker ps -q -f name=postgres) pg_isready -U quorvexa`, { stdio: 'pipe' });
    console.log('PostgreSQL is ready.');
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 1000));
  }
}
if (retries <= 0) console.warn('PostgreSQL did not become ready in 30s — continuing anyway.');

// ── 4. Build workspace dependencies ──
console.log('Building workspace packages...');
execSync('pnpm turbo run build --filter=./packages/*', { stdio: 'inherit' });

// ── 5. Start all services in watch mode ──
console.log('Starting all services (watch mode)...');
execSync('pnpm turbo run dev --parallel', { stdio: 'inherit' });
