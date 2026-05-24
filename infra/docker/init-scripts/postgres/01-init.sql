-- Quorvexa local dev initialisation
-- Runs as the superuser (POSTGRES_USER) on first container start.
-- The main DB and user are already created by the postgres entrypoint via env vars.

-- Create test database (used by automated tests)
SELECT 'CREATE DATABASE quorvexa_test OWNER quorvexa'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'quorvexa_test')\gexec

GRANT ALL PRIVILEGES ON DATABASE quorvexa_test TO quorvexa;
