# Supabase Database Keep-Alive Guide

## Problem

Supabase databases are automatically suspended after **7 days of inactivity** to save resources. Once suspended, the database must be manually resumed via the Supabase dashboard.

## Solution

The `scripts/keep-db-alive.js` script pings the database periodically with lightweight `SELECT 1` queries that:
- **Don't persist any data** — read-only operations only
- **Use minimal resources** — single integer query
- **Take <100ms** — negligible performance impact
- **Prevent suspension** — signals activity to Supabase

## Deployment Options

### Option 1: GitHub Actions (Recommended)

The `.github/workflows/keep-db-alive.yml` workflow:
- Runs every 5 minutes automatically
- Uses GitHub Secrets for credentials
- Zero infrastructure cost
- No additional services needed

**Setup:**
1. Add these secrets to your GitHub repository:
   - `DATABASE_URL_PRODUCTION` — from `.env.production`
   - `POSTGRES_HOST_PRODUCTION` — from `.env.production`

2. The workflow will activate automatically on the next push

**Cost:** Free (within GitHub Actions limits)

### Option 2: Scheduled Cron Job

Run locally with cron:

```bash
# Every 5 minutes
*/5 * * * * cd /path/to/project && node scripts/keep-db-alive.js >> logs/db-keep-alive.log 2>&1
```

**Environment variables needed:**
- `DATABASE_URL`
- `POSTGRES_HOST`

### Option 3: Docker Container

Run as a persistent container:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install pg dotenv
COPY scripts/keep-db-alive.js .
ENV KEEP_ALIVE_INTERVAL=5
CMD ["node", "keep-db-alive.js"]
```

Deploy to any VPS or container service (AWS ECS, Railway, Render, etc.)

## Manual Database Ping

To manually check if the database is active:

```bash
node scripts/keep-db-alive.js
```

Output:
```
Starting database keep-alive service (interval: 5 minutes)
Database: db.lqbpzipcwflysprxjvbf.supabase.co
---
[2026-05-29T10:15:30.123Z] ✓ Database ping successful - DB is active
```

## Configuration

Customize the ping interval via environment variable:

```bash
KEEP_ALIVE_INTERVAL=10 node scripts/keep-db-alive.js
# Default: 5 minutes
```

## Monitoring

GitHub Actions workflow runs show in the Actions tab. To verify:

1. Go to GitHub repository → Actions tab
2. Look for "Keep Supabase DB Active" workflow
3. View recent runs and their logs

Green checkmarks = database is being pinged successfully

## Notes

- The script uses read-only `SELECT 1` queries — absolutely safe
- No data is created, modified, or deleted
- Each ping takes <100ms and uses negligible bandwidth
- Supabase tracks "last activity" on the database, not query type
- Minimum recommended interval: 5 minutes (prevents 7-day idle timeout)
