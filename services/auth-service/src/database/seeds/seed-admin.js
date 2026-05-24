/**
 * Dev-only seed: creates a default super_admin account.
 *
 * Usage:  node src/database/seeds/seed-admin.js
 *
 * Reads DATABASE_URL from the project .env file.
 * Idempotent — safe to run multiple times (upserts on email).
 * Retries connection for up to 30s to handle Postgres startup lag.
 */

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { execSync } = require('node:child_process');
const pg = require('pg');
const argon2 = require('argon2');

function loadEnv() {
  const candidates = [
    resolve(__dirname, '../../../../../.env'),
    resolve(__dirname, '../../../../.env'),
    resolve(__dirname, '../../.env'),
  ];
  for (const path of candidates) {
    try {
      const content = readFileSync(path, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
      return;
    } catch {
      continue;
    }
  }
  console.error('Could not find .env file. Create one with: cp .env.example .env');
  process.exit(1);
}

const ADMIN_EMAIL = 'admin@quorvexa.dev';
const ADMIN_PASSWORD = 'Qu0rv3xa!Admin';
const ADMIN_FIRST = 'Admin';
const ADMIN_LAST = 'Dev';
const ADMIN_TENANT = 'default';

const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 1000;

async function waitForDatabase(pool) {
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === '57P03') {
        process.stdout.write(`\r  Waiting for database... (${i}/${MAX_RETRIES})`);
        if (i < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
        continue;
      }
      throw err;
    }
  }
  return false;
}

function isDockerAvailable() {
  try {
    execSync('docker ps', { stdio: 'pipe', windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function seed() {
  loadEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set. Check your .env file.');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    const connected = await waitForDatabase(pool);
    if (!connected) {
      console.error('\n  Database is not reachable after 30s.');
      if (!isDockerAvailable()) {
        console.error('  Docker is not running. Start Docker Desktop first, then run:');
        console.error('    pnpm dev:infra && pnpm seed\n');
      } else {
        console.error('  Start the infrastructure with:');
        console.error('    pnpm dev:infra');
        console.error('  Then re-run: pnpm seed\n');
      }
      process.exitCode = 1;
      return;
    }

    // Clear the retry line
    process.stdout.write('\r' + ' '.repeat(50) + '\r');

    const passwordHash = await argon2.hash(ADMIN_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const result = await pool.query(
      `INSERT INTO users (email, "passwordHash", "firstName", "lastName", role, status, "tenantId", "emailVerifiedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (email) DO UPDATE SET
         "passwordHash"    = EXCLUDED."passwordHash",
         "firstName"       = EXCLUDED."firstName",
         "lastName"        = EXCLUDED."lastName",
         role              = EXCLUDED.role,
         status            = EXCLUDED.status,
         "emailVerifiedAt"  = EXCLUDED."emailVerifiedAt"
       RETURNING id, email, role, status`,
      [ADMIN_EMAIL, passwordHash, ADMIN_FIRST, ADMIN_LAST, 'super_admin', 'active', ADMIN_TENANT],
    );

    const user = result.rows[0];
    console.log('  Default admin account ready:');
    console.log(`    Email:    ${user.email}`);
    console.log(`    Password: ${ADMIN_PASSWORD}`);
    console.log(`    Role:     ${user.role}`);
    console.log(`    Tenant:   ${ADMIN_TENANT}`);
  } catch (err) {
    if (err.code === '42P01') {
      console.error('\n  Table "users" does not exist yet.');
      console.error('  Run migrations first: pnpm migrate\n');
    } else {
      console.error('Seed failed:', err.message);
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
