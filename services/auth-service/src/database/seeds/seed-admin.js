/**
 * Dev-only seed: creates a default super_admin account.
 *
 * Usage:  node src/database/seeds/seed-admin.js
 *
 * Reads DATABASE_URL from the project .env file.
 * Idempotent — safe to run multiple times (upserts on email).
 */

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const pg = require('pg');
const argon2 = require('argon2');

function loadEnv() {
  // Try monorepo root first (5 levels up from seeds/), then service dir (4 levels up)
  const candidates = [
    resolve(__dirname, '../../../../../.env'),
    resolve(__dirname, '../../../../.env'),
    resolve(__dirname, '../../.env'),
  ];
  let envPath;
  let content;
  for (const path of candidates) {
    try {
      content = readFileSync(path, 'utf-8');
      envPath = path;
      break;
    } catch {
      continue;
    }
  }
  if (!content) {
    console.error('Could not find .env in any of:', candidates);
    process.exit(1);
  }
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const ADMIN_EMAIL = 'admin@quorvexa.dev';
const ADMIN_PASSWORD = 'Qu0rv3xa!Admin';
const ADMIN_FIRST = 'Quorvexa';
const ADMIN_LAST = 'Admin';
const ADMIN_TENANT = 'default';

async function seed() {
  loadEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set. Check your .env file.');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
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
         role              = EXCLUDED.role,
         status            = EXCLUDED.status,
         "emailVerifiedAt"  = EXCLUDED."emailVerifiedAt"
       RETURNING id, email, role, status`,
      [ADMIN_EMAIL, passwordHash, ADMIN_FIRST, ADMIN_LAST, 'super_admin', 'active', ADMIN_TENANT],
    );

    const user = result.rows[0];
    console.log('\n  Default admin account ready:');
    console.log(`    Email:    ${user.email}`);
    console.log(`    Password: ${ADMIN_PASSWORD}`);
    console.log(`    Role:     ${user.role}`);
    console.log(`    Tenant:   ${ADMIN_TENANT}\n`);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('\n  Database not reachable — is Postgres running? (try: pnpm dev:infra)\n');
    } else if (err.code === '42P01') {
      console.error('\n  Table "users" does not exist yet — start the auth-service first so TypeORM creates it.\n');
    } else {
      console.error('Seed failed:', err.message);
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
