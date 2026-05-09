import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const envExample = '.env.example';
const envFile = '.env';

// Root .env
if (!existsSync(envFile)) {
  if (existsSync(envExample)) {
    copyFileSync(envExample, envFile);
    console.log('Created .env from .env.example');
    console.log('Edit .env with your values before continuing (at minimum: JWT_SECRET, JWT_REFRESH_SECRET).');
  } else {
    console.warn('.env.example not found — skipping env copy. Create .env manually.');
  }
} else {
  console.log('.env already exists — skipping copy.');
}

// Service-level .env files (copy from .env.example if no .env exists)
const serviceDirs = ['services/auth-service', 'services/user-service', 'services/notification-service', 'services/workflow-service', 'services/ai-agent-service', 'apps/web', 'apps/gateway'];
for (const dir of serviceDirs) {
  const example = join(dir, '.env.example');
  const target = join(dir, '.env');
  if (!existsSync(target) && existsSync(example)) {
    copyFileSync(example, target);
    console.log(`Created ${dir}/.env from .env.example`);
  }
}

console.log('Installing Node.js dependencies...');
execSync('pnpm install', { stdio: 'inherit' });

console.log('\nInstalling Python dependencies...');
try {
  execSync('poetry install', { stdio: 'inherit', cwd: 'services/ai-agent-service' });
} catch {
  console.warn('Python deps skipped — install Poetry and run: cd services/ai-agent-service && poetry install');
}

console.log('\nSetup complete! Next steps:');
console.log('  1. Edit .env with your secrets');
console.log('  2. pnpm dev:infra    # start databases & brokers');
console.log('  3. pnpm migrate      # run database migrations');
console.log('  4. pnpm dev          # start all services');
