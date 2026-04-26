#!/usr/bin/env ts-node
/**
 * Migration Script: AWS Amplify → NestJS Microservices
 *
 * Strategy: Strangler Fig pattern
 * - Phase 1: Export Amplify data (users, workflows, etc.)
 * - Phase 2: Transform to new schema format
 * - Phase 3: Import into PostgreSQL with rollback support
 *
 * Run: npx ts-node scripts/migration/amplify-to-microservices.ts
 */

import { createWriteStream } from 'fs';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';

interface AmplifyUser {
  sub: string;
  email: string;
  name: string;
  'custom:role'?: string;
  'custom:tenantId'?: string;
  createdAt: string;
}

interface NewUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  oauthProvider: string;
  oauthId: string;
  status: string;
  createdAt: string;
}

const ROLLBACK_LOG = path.join(process.cwd(), 'migration-rollback.log');

async function logRollback(action: string, data: unknown): Promise<void> {
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), action, data }) + '\n';
  const ws = createWriteStream(ROLLBACK_LOG, { flags: 'a' });
  ws.write(entry);
  ws.end();
}

function transformUser(amplifyUser: AmplifyUser): NewUser {
  const nameParts = (amplifyUser.name || '').split(' ');
  const firstName = nameParts[0] ?? 'Unknown';
  const lastName = nameParts.slice(1).join(' ') || 'User';

  const roleMap: Record<string, string> = {
    ADMIN: 'admin',
    admin: 'admin',
    USER: 'member',
    user: 'member',
  };

  return {
    id: amplifyUser.sub,
    email: amplifyUser.email,
    firstName,
    lastName,
    role: roleMap[amplifyUser['custom:role'] ?? 'member'] ?? 'member',
    tenantId: amplifyUser['custom:tenantId'] ?? 'default',
    oauthProvider: 'amplify',
    oauthId: amplifyUser.sub,
    status: 'active',
    createdAt: amplifyUser.createdAt,
  };
}

async function migrateUsers(inputFile: string): Promise<void> {
  console.log(`Reading Amplify users from ${inputFile}...`);

  const raw = await readFile(inputFile, 'utf-8');
  const amplifyUsers: AmplifyUser[] = JSON.parse(raw) as AmplifyUser[];

  console.log(`Found ${amplifyUsers.length} users to migrate`);

  const transformed = amplifyUsers.map(transformUser);

  // Generate SQL insert statements for rollback-safe import
  const insertStatements = transformed.map((user) => {
    return `INSERT INTO users (id, email, first_name, last_name, role, tenant_id, oauth_provider, oauth_id, status, created_at)
VALUES ('${user.id}', '${user.email}', '${user.firstName}', '${user.lastName}',
        '${user.role}', '${user.tenantId}', '${user.oauthProvider}', '${user.oauthId}',
        '${user.status}', '${user.createdAt}')
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  tenant_id = EXCLUDED.tenant_id;`;
  });

  const outputFile = 'migration-users.sql';
  await writeFile(outputFile, insertStatements.join('\n\n'));

  await logRollback('users_migrated', { count: transformed.length, outputFile });

  console.log(`✅ Generated ${outputFile} with ${transformed.length} user inserts`);
  console.log(`   Run: psql $DATABASE_URL -f ${outputFile}`);
}

async function generateRollback(): Promise<void> {
  const rollbackSql = `
-- ROLLBACK: Remove all migrated Amplify users
-- Run this if the migration needs to be reversed

BEGIN;

-- Tag migrated users for easy identification
DELETE FROM users WHERE oauth_provider = 'amplify';

-- Log the rollback
INSERT INTO audit_logs (user_id, action, metadata, created_at)
VALUES (NULL, 'migration_rollback', '{"reason": "manual_rollback"}', NOW());

COMMIT;
`;

  await writeFile('migration-rollback.sql', rollbackSql);
  console.log('✅ Generated migration-rollback.sql');
}

// Main
async function main(): Promise<void> {
  const inputFile = process.argv[2] ?? 'amplify-users-export.json';

  console.log('🚀 Quorvexa Migration: AWS Amplify → NestJS Microservices');
  console.log('Strategy: Strangler Fig Pattern\n');

  await migrateUsers(inputFile).catch((err) => {
    console.warn(`⚠️  User migration skipped: ${(err as Error).message}`);
    console.log('   Provide an Amplify users export file as argument.');
  });

  await generateRollback();

  console.log('\n📋 Next steps:');
  console.log('   1. Review generated SQL files');
  console.log('   2. Test on staging: psql $TEST_DATABASE_URL -f migration-users.sql');
  console.log('   3. Verify data integrity');
  console.log('   4. Apply to production during maintenance window');
  console.log('   5. Keep rollback file ready: psql $DATABASE_URL -f migration-rollback.sql');
}

void main();
