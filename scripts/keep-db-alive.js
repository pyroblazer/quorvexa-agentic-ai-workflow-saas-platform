#!/usr/bin/env node

/**
 * Database Keep-Alive Script
 * Pings Supabase database periodically to prevent idle suspension
 * Only performs read operations (SELECT 1) - no data persistence
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function pingDatabase() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT 1 as ping');
    client.release();

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✓ Database ping successful - DB is active`);
    return true;
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ✗ Database ping failed:`, error.message);
    return false;
  }
}

async function main() {
  const intervalMinutes = parseInt(process.env.KEEP_ALIVE_INTERVAL || '5', 10);
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`Starting database keep-alive service (interval: ${intervalMinutes} minutes)`);
  console.log(`Database: ${process.env.POSTGRES_HOST}`);
  console.log('---');

  // Initial ping
  await pingDatabase();

  // Periodic pings
  setInterval(async () => {
    await pingDatabase();
  }, intervalMs);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down keep-alive service...');
    await pool.end();
    process.exit(0);
  });
}

main().catch(console.error);
