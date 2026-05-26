/**
 * Demo seed: creates a fully-populated demo admin account with example
 * workflows, notifications, templates, preferences, profile, and audit logs.
 *
 * Usage:  node services/auth-service/src/database/seeds/seed-demo.js
 *
 * Reads DATABASE_URL from the project .env file.
 * Idempotent — safe to run multiple times (upserts on email).
 */

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const pg = require('pg');
const argon2 = require('argon2');

// ── Config ──────────────────────────────────────────────────────────

const DEMO_EMAIL = 'demo@quorvexa.dev';
const DEMO_PASSWORD = 'D3m0!Quorvexa';
const DEMO_FIRST = 'Timothy';
const DEMO_LAST = 'Man';
const DEMO_TENANT = 'default';
const ADMIN_TENANT = 'default';

const ADMIN_EMAIL = 'admin@quorvexa.dev';

const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 1000;

// ── Env loader ──────────────────────────────────────────────────────

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
  console.error('Could not find .env file.');
  process.exit(1);
}

async function waitForDatabase(pool) {
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === '57P03') {
        process.stdout.write(`\r  Waiting for database... (${i}/${MAX_RETRIES})`);
        if (i < MAX_RETRIES) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw err;
    }
  }
  return false;
}

// ── Main seed ───────────────────────────────────────────────────────

async function seed() {
  loadEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    const connected = await waitForDatabase(pool);
    if (!connected) {
      console.error('\n  Database not reachable after 30s.');
      process.exitCode = 1;
      return;
    }

    process.stdout.write('\r' + ' '.repeat(50) + '\r');

    // ── 1. Upsert demo user ────────────────────────────────────────
    const passwordHash = await argon2.hash(DEMO_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const userResult = await pool.query(
      `INSERT INTO users (email, "passwordHash", "firstName", "lastName", role, status, "tenantId", "emailVerifiedAt", "lastLoginAt")
       VALUES ($1, $2, $3, $4, 'admin', 'active', $5, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET
         "passwordHash"   = EXCLUDED."passwordHash",
         "firstName"      = EXCLUDED."firstName",
         "lastName"       = EXCLUDED."lastName",
         role             = EXCLUDED.role,
         status           = EXCLUDED.status,
         "emailVerifiedAt" = EXCLUDED."emailVerifiedAt",
         "lastLoginAt"    = EXCLUDED."lastLoginAt"
       RETURNING id, email, role`,
      [DEMO_EMAIL, passwordHash, DEMO_FIRST, DEMO_LAST, DEMO_TENANT],
    );
    const demoUserId = userResult.rows[0].id;
    console.log(`  Demo user: ${DEMO_EMAIL} (${demoUserId})`);

    // ── Create test users for scenarios ─────────────────────────────
    const testUsers = [];
    const testEmails = [
      { email: 'test1@quorvexa.dev', role: 'member', name: 'Test One' },
      { email: 'test2@quorvexa.dev', role: 'viewer', name: 'Test Two' },
      { email: 'test-gmail@quorvexa.dev', role: 'admin', name: 'Test Gmail' },
      { email: 'locked@quorvexa.dev', role: 'admin', name: 'Locked User', locked: true },
    ];

    for (const testUser of testEmails) {
      const testPwHash = await argon2.hash('Test@1234!', {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      const lockedUntil = testUser.locked ? `NOW() + interval '1 hour'` : 'NULL';
      const testResult = await pool.query(
        `INSERT INTO users (email, "passwordHash", "firstName", "lastName", role, status, "tenantId", "emailVerifiedAt", "lockedUntil")
         VALUES ($1, $2, $3, $4, $5, 'active', $6, NOW(), ${lockedUntil})
         ON CONFLICT (email) DO UPDATE SET
           "passwordHash"   = EXCLUDED."passwordHash",
           role             = EXCLUDED.role,
           "lockedUntil"    = ${lockedUntil}
         RETURNING id, email`,
        [testUser.email, testPwHash, testUser.name.split(' ')[0], testUser.name.split(' ')[1] || '', testUser.role, DEMO_TENANT],
      );
      testUsers.push({ ...testUser, id: testResult.rows[0].id });
      console.log(`  Test user: ${testUser.email} (${testUser.role})`);
    }

    // Also fetch admin user id for createdBy references
    const adminResult = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [ADMIN_EMAIL],
    );
    const adminUserId = adminResult.rows[0]?.id || demoUserId;

    // ── Clean up previous demo data ─────────────────────────────────
    await pool.query(`DELETE FROM workflow_steps WHERE "workflowId" IN (SELECT id FROM workflows WHERE "createdBy" = $1)`, [demoUserId]);
    await pool.query(`DELETE FROM workflows WHERE "createdBy" = $1`, [demoUserId]);
    await pool.query(`DELETE FROM notifications WHERE "userId" = $1`, [demoUserId]);
    await pool.query(`DELETE FROM notification_templates WHERE "tenantId" = $1`, [DEMO_TENANT]);
    await pool.query(`DELETE FROM audit_logs WHERE "userId" = $1`, [demoUserId]);

    // ── 2. User profile ─────────────────────────────────────────────
    await pool.query(
      `INSERT INTO user_profiles ("userId", "firstName", "lastName", title, department, bio, phone, "avatarUrl", "socialLinks", "tenantId", status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
       ON CONFLICT ("userId") DO UPDATE SET
         "firstName" = EXCLUDED."firstName",
         "lastName"  = EXCLUDED."lastName",
         title       = EXCLUDED.title,
         department  = EXCLUDED.department,
         bio         = EXCLUDED.bio,
         phone       = EXCLUDED.phone`,
      [
        demoUserId,
        DEMO_FIRST,
        DEMO_LAST,
        'Senior Platform Engineer',
        'AI & Automation',
        'Building intelligent workflows with Quorvexa. Passionate about agentic AI, distributed systems, and developer experience.',
        '+1 (415) 555-0142',
        null,
        JSON.stringify({ github: 'timothyman', linkedin: 'timothy-man', twitter: '@timothyman_dev' }),
        DEMO_TENANT,
      ],
    );
    console.log('  Profile: created');

    // ── 3. Preferences ──────────────────────────────────────────────
    await pool.query(
      `INSERT INTO user_preferences ("userId", theme, locale, "dateFormat", timezone, "notificationSettings", "dashboardLayout", "emailNotifications", "twoFactorEnabled", "tenantId")
       VALUES ($1, 'dark', 'en-US', 'YYYY-MM-DD', 'America/New_York', $2, $3, true, false, $4)
       ON CONFLICT ("userId") DO UPDATE SET
         theme                 = EXCLUDED.theme,
         locale                = EXCLUDED.locale,
         "dateFormat"          = EXCLUDED."dateFormat",
         timezone              = EXCLUDED.timezone,
         "notificationSettings" = EXCLUDED."notificationSettings",
         "dashboardLayout"     = EXCLUDED."dashboardLayout"`,
      [
        demoUserId,
        JSON.stringify({ email: true, in_app: true, slack: true, sms: false, workflow_failed: true, workflow_completed: true, agent_completed: true }),
        JSON.stringify({
          widgets: ['recent_workflows', 'agent_activity', 'notifications', 'quick_actions'],
          sidebarCollapsed: false,
          compactMode: false,
        }),
        DEMO_TENANT,
      ],
    );
    console.log('  Preferences: created');

    // ── 4. Notification templates ───────────────────────────────────
    const templates = [
      {
        name: 'Workflow Completed',
        slug: 'workflow-completed',
        subject: 'Workflow "{{workflow_name}}" completed successfully',
        bodyTemplate: 'Hi {{user_name}},\n\nYour workflow "{{workflow_name}}" (ID: {{workflow_id}}) has completed successfully.\n\nSteps completed: {{steps_completed}}/{{steps_total}}\nDuration: {{duration}}\n\nView results: {{dashboard_url}}',
        channel: 'in_app',
        description: 'Sent when a workflow finishes all steps without errors',
      },
      {
        name: 'Workflow Failed',
        slug: 'workflow-failed',
        subject: 'Workflow "{{workflow_name}}" failed at step {{failed_step}}',
        bodyTemplate: 'Hi {{user_name}},\n\nYour workflow "{{workflow_name}}" encountered an error at step "{{failed_step}}".\n\nError: {{error_message}}\nRetries remaining: {{retries_remaining}}\n\nView details: {{dashboard_url}}',
        channel: 'in_app',
        description: 'Sent when a workflow step fails after all retries',
      },
      {
        name: 'Agent Task Complete',
        slug: 'agent-task-complete',
        subject: 'AI Agent completed: {{task_summary}}',
        bodyTemplate: 'Hi {{user_name}},\n\nYour AI agent has finished processing.\n\nTask: {{task_summary}}\nModel: {{model}}\nDuration: {{duration}}\nOutput preview:\n{{output_preview}}',
        channel: 'in_app',
        description: 'Sent when an AI agent finishes a task',
      },
      {
        name: 'Weekly Digest',
        slug: 'weekly-digest',
        subject: 'Your Quorvexa Weekly Digest',
        bodyTemplate: 'Hi {{user_name}},\n\nHere is your weekly summary:\n\n- Workflows run: {{workflow_count}}\n- Agent tasks completed: {{agent_count}}\n- Notifications sent: {{notification_count}}\n- Active workflows: {{active_workflows}}\n\nTop performing workflow: {{top_workflow}}',
        channel: 'email',
        description: 'Weekly summary of platform activity',
      },
      {
        name: 'Deployment Alert',
        slug: 'deployment-alert',
        subject: 'Deployment {{status}}: {{service_name}}',
        bodyTemplate: '{"service":"{{service_name}}","version":"{{version}}","status":"{{status}}","environment":"{{environment}}","timestamp":"{{timestamp}}"}',
        channel: 'webhook',
        description: 'Webhook payload for CI/CD deployment events',
      },
    ];

    const templateIds = [];
    for (const t of templates) {
      const r = await pool.query(
        `INSERT INTO notification_templates ("tenantId", name, slug, subject, "bodyTemplate", channel, "defaultValues", description, "isActive")
         VALUES ($1, $2, $3, $4, $5, $6, '{}', $7, true)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [DEMO_TENANT, t.name, t.slug, t.subject, t.bodyTemplate, t.channel, t.description],
      );
      if (r.rows[0]) {
        templateIds.push(r.rows[0].id);
      } else {
        // Fetch existing id
        const existing = await pool.query(
          `SELECT id FROM notification_templates WHERE slug = $1 AND "tenantId" = $2`,
          [t.slug, DEMO_TENANT],
        );
        if (existing.rows[0]) templateIds.push(existing.rows[0].id);
      }
    }
    console.log(`  Templates: ${templateIds.length} created/verified`);

    // ── 5. Notifications ────────────────────────────────────────────
    const now = new Date();
    const ago = (days, hours = 0) => new Date(now.getTime() - (days * 86400000 + hours * 3600000)).toISOString();

    const notifications = [
      {
        channel: 'in_app', status: 'read', subject: 'Welcome to Quorvexa!',
        body: 'Your admin account is ready. Explore the Developer Playground to try all features — workflows, AI agents, notifications, and more.',
        recipient: DEMO_EMAIL, sentAt: ago(2, 0), readAt: ago(2, 0),
      },
      {
        channel: 'in_app', status: 'read', subject: 'Workflow "Daily Report Pipeline" completed',
        body: 'All 5 steps completed successfully in 12.4s. View the full results in your dashboard.',
        recipient: DEMO_EMAIL, sentAt: ago(1, 2), readAt: ago(1, 1),
        templateId: templateIds[0] || null,
      },
      {
        channel: 'in_app', status: 'read', subject: 'AI Agent finished: Code review summary',
        body: 'Reviewed 3 pull requests. Found 2 potential issues and 1 performance suggestion. See the full analysis in the Agents tab.',
        recipient: DEMO_EMAIL, sentAt: ago(0, 18), readAt: ago(0, 17),
        templateId: templateIds[2] || null,
      },
      {
        channel: 'in_app', status: 'delivered', subject: 'New workflow template available',
        body: 'A new "CI/CD Pipeline" workflow template has been added. Activate it from the Workflows tab to automate your deployment process.',
        recipient: DEMO_EMAIL, sentAt: ago(0, 6),
      },
      {
        channel: 'email', status: 'delivered', subject: 'Your Quorvexa Weekly Digest',
        body: 'This week: 23 workflows executed, 47 agent tasks completed, 99.2% success rate. Your top workflow was "Customer Onboarding Automation" with 8 runs.',
        recipient: DEMO_EMAIL, sentAt: ago(0, 3),
        templateId: templateIds[3] || null,
      },
      {
        channel: 'in_app', status: 'pending', subject: 'Workflow "Customer Onboarding" needs attention',
        body: 'Step 3 "Send Welcome Email" has been queued for 15 minutes. The SMTP server may be experiencing delays.',
        recipient: DEMO_EMAIL,
      },
    ];

    for (const n of notifications) {
      const sentAt = n.sentAt || null;
      const readAt = n.readAt || null;
      await pool.query(
        `INSERT INTO notifications ("userId", "tenantId", channel, status, subject, body, recipient, "templateId", "sentAt", "readAt", metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{}')
         ON CONFLICT DO NOTHING`,
        [demoUserId, DEMO_TENANT, n.channel, n.status, n.subject, n.body, n.recipient, n.templateId, sentAt, readAt],
      );
    }
    console.log(`  Notifications: ${notifications.length} created`);

    // ── 6. Workflows (15 comprehensive examples) ───────────────────
    //    Covers: all 4 trigger types, all 4 statuses, all 7 step types,
    //            all 5 notification channels, varied retry configs,
    //            context chaining between steps, realistic outputs.

    const workflows = [
      // ── 1. Customer Onboarding Automation ────────────────────────
      // active | scheduled | 8 steps | all 7 step types
      {
        name: 'Customer Onboarding Automation',
        description: 'End-to-end customer onboarding: validates data, creates account, sends welcome email, provisions resources, assigns AI agent, transforms summary, notifies sales, waits for propagation. Runs every weekday at 9 AM.',
        status: 'active',
        triggerType: 'scheduled',
        cronExpression: '0 9 * * 1-5',
        metadata: { tags: ['onboarding', 'automation', 'critical'], estimatedDuration: '45s', owner: DEMO_EMAIL, version: '2.1.0' },
        runCount: 47,
        lastRunAt: '1 day',
        steps: [
          { name: 'Validate Customer Data', type: 'condition', order: 0, maxRetries: 3, retryDelayMs: 500,
            config: { condition: 'trigger.email' },
            lastOutput: { condition: 'trigger.email', result: true, branch: 'true' }, lastStatus: 'completed' },
          { name: 'Create Customer Account', type: 'http_request', order: 1, maxRetries: 3, retryDelayMs: 1000,
            config: { url: 'https://api.quorvexa.dev/api/v1/users', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer {{trigger.apiToken}}' }, body: { email: '{{trigger.email}}', firstName: '{{trigger.firstName}}', lastName: '{{trigger.lastName}}', role: 'member' } },
            lastOutput: { status: 201, body: { id: 'usr_8f2a1c', email: 'jane@acme.co', role: 'member' } }, lastStatus: 'completed' },
          { name: 'Send Welcome Email', type: 'notification', order: 2, maxRetries: 5, retryDelayMs: 2000,
            config: { channel: 'email', recipient: '{{trigger.email}}', subject: 'Welcome to Quorvexa, {{trigger.firstName}}!', body: 'Hi {{trigger.firstName}},\n\nYour account is ready. Here is your personalized onboarding guide:\n\n{{step_4.output}}\n\nGet started at https://app.quorvexa.dev/dashboard' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
          { name: 'Provision Starter Resources', type: 'http_request', order: 3, maxRetries: 3, retryDelayMs: 3000,
            config: { url: 'https://provision.quorvexa.dev/v1/allocate', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { plan: 'starter', region: 'us-east-1', userId: '{{step_1.body.id}}' } },
            lastOutput: { status: 200, body: { database: 'provisioned', storage: '5GB', compute: '1vCPU', endpoint: 'db-us-east-1234.quorvexa.dev' } }, lastStatus: 'completed' },
          { name: 'AI Onboarding Guide', type: 'ai_agent', order: 4, maxRetries: 2, retryDelayMs: 1000,
            config: { prompt: 'Generate a personalized onboarding guide for {{trigger.firstName}} {{trigger.lastName}} from {{trigger.company}}. They signed up for the starter plan. Include: 1) Account setup steps 2) Best practices for their industry 3) Links to docs. Be concise and actionable.', sessionId: 'onboarding-{{step_1.body.id}}' },
            lastOutput: { output: 'Welcome! Here is your 8-step quickstart guide...\n1. Complete your profile\n2. Create your first workflow\n3. Connect your AI agent...', model: 'llama3', tokensUsed: 487 }, lastStatus: 'completed' },
          { name: 'Build Customer Summary', type: 'transform', order: 5, maxRetries: 1, retryDelayMs: 0,
            config: { mapping: { customerEmail: 'trigger.email', accountId: 'step_1.body.id', resources: 'step_3.body', onboardingGuide: 'step_4.output' } },
            lastOutput: { customerEmail: 'jane@acme.co', accountId: 'usr_8f2a1c', resources: { database: 'provisioned', storage: '5GB' }, onboardingGuide: 'Welcome! Here is your 8-step quickstart guide...' }, lastStatus: 'completed' },
          { name: 'Notify Sales Team on Slack', type: 'notification', order: 6, maxRetries: 3, retryDelayMs: 1000,
            config: { channel: 'slack', recipient: '#sales-onboarding', subject: 'New Customer: {{trigger.firstName}} {{trigger.lastName}} ({{trigger.company}})', body: 'New customer onboarded!\nAccount: {{step_1.body.id}}\nPlan: Starter\nResources: {{step_3.body.endpoint}}\nAI Guide generated: Yes' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
          { name: 'Wait for Propagation', type: 'delay', order: 7, maxRetries: 0, retryDelayMs: 0,
            config: { delayMs: 5000 },
            lastOutput: { delayed: 5000 }, lastStatus: 'completed' },
        ],
      },

      // ── 2. CI/CD Deployment Pipeline ─────────────────────────────
      // draft | webhook | 7 steps
      {
        name: 'CI/CD Deployment Pipeline',
        description: 'Full CI/CD pipeline triggered on push to main: lint, test, AI code review, build, deploy to staging, run smoke tests, notify team. Uses webhook trigger for GitHub integration.',
        status: 'draft',
        triggerType: 'webhook',
        metadata: { tags: ['ci-cd', 'deployment', 'automation'], version: '1.0.0', repository: 'quorvexa/platform' },
        runCount: 0,
        steps: [
          { name: 'Lint & Format Check', type: 'http_request', order: 0, maxRetries: 1, retryDelayMs: 0,
            config: { url: 'https://ci.quorvexa.dev/run', method: 'POST', headers: { 'X-Webhook-Secret': '{{trigger.secret}}' }, body: { command: 'pnpm lint', failOnError: true, repository: '{{trigger.repository}}', ref: '{{trigger.ref}}' } },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Run Unit Tests', type: 'action', order: 1, maxRetries: 2, retryDelayMs: 5000,
            config: { action: 'run_tests', command: 'pnpm test --coverage', coverage: true, threshold: 80, reportFormat: 'junit' },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'AI Code Review', type: 'ai_agent', order: 2, maxRetries: 1, retryDelayMs: 1000,
            config: { prompt: 'Review the following code changes for potential bugs, security vulnerabilities (OWASP Top 10), and performance issues. Focus on: SQL injection, XSS, auth bypasses, race conditions. Changed files: {{trigger.changedFiles}}' },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Build Docker Image', type: 'http_request', order: 3, maxRetries: 2, retryDelayMs: 5000,
            config: { url: 'https://ci.quorvexa.dev/build', method: 'POST', body: { dockerfile: 'Dockerfile', tag: 'quorvexa:{{trigger.commitSha}}', cache: true, timeout: 300 } },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Deploy to Staging', type: 'http_request', order: 4, maxRetries: 3, retryDelayMs: 10000,
            config: { url: 'https://deploy.quorvexa.dev/staging', method: 'POST', body: { image: 'quorvexa:{{trigger.commitSha}}', strategy: 'rolling', healthCheck: '/api/v1/health', timeout: 180 } },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Run Smoke Tests', type: 'action', order: 5, maxRetries: 2, retryDelayMs: 3000,
            config: { action: 'smoke_test', endpoints: ['/api/v1/health', '/api/v1/auth/refresh', '/api/v1/users/me'], expectedStatus: 200, timeout: 30 },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Notify Deployment Status', type: 'notification', order: 6, maxRetries: 3, retryDelayMs: 1000,
            config: { channel: 'slack', recipient: '#deployments', subject: 'Deployment {{trigger.commitSha}} complete', body: 'Staging deployment of {{trigger.commitSha}} is live.\n\nTests: {{step_5.action}}\nAI Review: {{step_2.output}}' },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },

      // ── 3. Incident Response Automation ──────────────────────────
      // paused | event | 6 steps | high retry
      {
        name: 'Incident Response Automation',
        description: 'Automated incident triage: detects anomalies via condition check, runs AI diagnosis, creates incident ticket, pages on-call via SMS, posts to Slack war room, and logs to audit. Uses aggressive retries for critical path.',
        status: 'paused',
        triggerType: 'event',
        metadata: { tags: ['incident', 'monitoring', 'critical', 'on-call'], version: '1.3.0', escalationPolicy: 'P2' },
        runCount: 12,
        lastRunAt: '3 days',
        steps: [
          { name: 'Check Alert Severity', type: 'condition', order: 0, maxRetries: 1, retryDelayMs: 0,
            config: { condition: 'trigger.severity' },
            lastOutput: { condition: 'trigger.severity', result: true, branch: 'true' }, lastStatus: 'completed' },
          { name: 'AI Root Cause Analysis', type: 'ai_agent', order: 1, maxRetries: 3, retryDelayMs: 2000,
            config: { prompt: 'Analyze the following production anomaly and identify likely root causes:\n\nMetric: {{trigger.metric}}\nValue: {{trigger.value}}\nThreshold: {{trigger.threshold}}\nWindow: {{trigger.window}}\n\nCheck recent deployments, database slow queries, and infrastructure changes. Provide confidence score.' },
            lastOutput: { output: 'Root cause: database connection pool exhaustion after deployment v2.4.1. The pool max was reduced from 50 to 20 by mistake. Confidence: 0.87', model: 'llama3', tokensUsed: 312 }, lastStatus: 'completed' },
          { name: 'Create Incident Ticket', type: 'http_request', order: 2, maxRetries: 5, retryDelayMs: 3000,
            config: { url: 'https://tickets.quorvexa.dev/api/v1/incidents', method: 'POST', headers: { 'Authorization': 'Bearer svc-incident-bot' }, body: { title: '{{trigger.metric}} exceeded threshold', severity: '{{trigger.severity}}', description: '{{step_1.output}}', assignee: 'on-call' } },
            lastOutput: { status: 201, body: { ticketId: 'INC-2024-089', status: 'created', assignee: 'engineer-oncall@quorvexa.dev' } }, lastStatus: 'completed' },
          { name: 'Page On-Call Engineer', type: 'notification', order: 3, maxRetries: 5, retryDelayMs: 2000,
            config: { channel: 'sms', recipient: '+1-555-999-0001', subject: 'P2 INCIDENT: {{trigger.metric}}', body: 'INC-2024-089: {{trigger.metric}} at {{trigger.value}} (threshold {{trigger.threshold}}). AI analysis: {{step_1.output}}. Ticket: https://tickets.quorvexa.dev/INC-2024-089' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
          { name: 'Post to War Room', type: 'notification', order: 4, maxRetries: 3, retryDelayMs: 1000,
            config: { channel: 'slack', recipient: '#incident-war-room', subject: 'INC-2024-089 opened', body: ':rotating_light: Incident opened for {{trigger.metric}}\nSeverity: {{trigger.severity}}\nAI Diagnosis: {{step_1.output}}\nOn-call paged via SMS\nTicket: https://tickets.quorvexa.dev/INC-2024-089' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
          { name: 'Log to Audit Trail', type: 'action', order: 5, maxRetries: 10, retryDelayMs: 5000,
            config: { action: 'audit_log_incident', incidentId: '{{step_2.body.ticketId}}', metric: '{{trigger.metric}}', rootCause: '{{step_1.output}}' },
            lastOutput: { action: 'audit_log_incident', executed: true, context: ['trigger', 'step_0', 'step_1', 'step_2', 'step_3', 'step_4'] }, lastStatus: 'completed' },
        ],
      },

      // ── 4. API Health Monitor ────────────────────────────────────
      // active | scheduled | 5 steps | context chaining
      {
        name: 'API Health Monitor',
        description: 'Checks API health every 5 minutes. If unhealthy, sends email alert, waits 30s, re-checks, then sends in-app notification with final status. Demonstrates condition-based branching and retry with delay.',
        status: 'active',
        triggerType: 'scheduled',
        cronExpression: '*/5 * * * *',
        metadata: { tags: ['monitoring', 'health-check', 'uptime'], version: '1.1.0' },
        runCount: 214,
        lastRunAt: '5 minutes',
        steps: [
          { name: 'Check API Health', type: 'http_request', order: 0, maxRetries: 2, retryDelayMs: 2000,
            config: { url: 'https://api.quorvexa.dev/api/v1/health', method: 'GET', headers: { 'User-Agent': 'Quorvexa-HealthMonitor/1.1' } },
            lastOutput: { status: 200, body: { status: 'healthy', uptime: 864000, version: '2.4.1', services: { auth: 'up', workflow: 'up', notification: 'up', agent: 'up', user: 'up' } } }, lastStatus: 'completed' },
          { name: 'Evaluate Health Status', type: 'condition', order: 1, maxRetries: 0, retryDelayMs: 0,
            config: { condition: 'step_0.status' },
            lastOutput: { condition: 'step_0.status', result: true, branch: 'true' }, lastStatus: 'completed' },
          { name: 'Send Alert Email', type: 'notification', order: 2, maxRetries: 3, retryDelayMs: 5000,
            config: { channel: 'email', recipient: 'ops-team@quorvexa.dev', subject: 'API Health Alert - Status {{step_0.status}}', body: 'API health check failed.\n\nHTTP Status: {{step_0.status}}\nResponse: {{step_0.body}}\n\nRetrying in 30 seconds...' },
            lastOutput: null, lastStatus: 'skipped' },
          { name: 'Wait Before Recheck', type: 'delay', order: 3, maxRetries: 0, retryDelayMs: 0,
            config: { delayMs: 30000 },
            lastOutput: null, lastStatus: 'skipped' },
          { name: 'Final Status Notification', type: 'notification', order: 4, maxRetries: 3, retryDelayMs: 1000,
            config: { channel: 'in_app', recipient: 'ops-team@quorvexa.dev', subject: 'Health Monitor Run Complete', body: 'Health check completed at {{trigger.timestamp}}.\nInitial status: {{step_0.status}}\nCondition: {{step_1.branch}}\nAll services: {{step_0.body.services}}' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
        ],
      },

      // ── 5. Data ETL Pipeline ─────────────────────────────────────
      // active | scheduled | 7 steps | heavy transform
      {
        name: 'Data ETL Pipeline',
        description: 'Extracts raw data from external API, transforms into normalized schema, validates with condition, enriches with AI classification, loads to warehouse, builds summary, and notifies via email. Runs nightly at 2 AM.',
        status: 'active',
        triggerType: 'scheduled',
        cronExpression: '0 2 * * *',
        metadata: { tags: ['etl', 'data-pipeline', 'nightly'], version: '3.0.2', source: 'salesforce', destination: 'bigquery' },
        runCount: 89,
        lastRunAt: '22 hours',
        steps: [
          { name: 'Extract Raw Data', type: 'http_request', order: 0, maxRetries: 3, retryDelayMs: 5000,
            config: { url: 'https://api.salesforce.com/v1/query', method: 'GET', headers: { 'Authorization': 'Bearer {{trigger.sfToken}}' }, body: { query: 'SELECT Id, Name, Email, Company, Status FROM Lead WHERE CreatedDate = YESTERDAY' } },
            lastOutput: { status: 200, body: { records: 142, data: [{ Id: 'LF-001', Name: 'Acme Corp', Email: 'lead@acme.co', Status: 'Qualified' }], totalSize: 142 } }, lastStatus: 'completed' },
          { name: 'Normalize Records', type: 'transform', order: 1, maxRetries: 1, retryDelayMs: 0,
            config: { mapping: { totalRecords: 'step_0.body.totalSize', firstRecordId: 'step_0.body.data.0.Id', firstRecordName: 'step_0.body.data.0.Name', firstRecordEmail: 'step_0.body.data.0.Email', extractedAt: 'trigger.timestamp' } },
            lastOutput: { totalRecords: 142, firstRecordId: 'LF-001', firstRecordName: 'Acme Corp', firstRecordEmail: 'lead@acme.co', extractedAt: '2026-05-22T02:00:00Z' }, lastStatus: 'completed' },
          { name: 'Throttle Before Load', type: 'delay', order: 2, maxRetries: 0, retryDelayMs: 0,
            config: { delayMs: 2000 },
            lastOutput: { delayed: 2000 }, lastStatus: 'completed' },
          { name: 'Validate Record Count', type: 'condition', order: 3, maxRetries: 0, retryDelayMs: 0,
            config: { condition: 'step_1.totalRecords' },
            lastOutput: { condition: 'step_1.totalRecords', result: true, branch: 'true' }, lastStatus: 'completed' },
          { name: 'AI Data Classification', type: 'ai_agent', order: 4, maxRetries: 2, retryDelayMs: 3000,
            config: { prompt: 'Classify the following batch of sales leads into categories: Hot, Warm, Cold, Invalid. Provide a summary with counts per category.\n\nSample data: {{step_0.body}}\nTotal records: {{step_1.totalRecords}}' },
            lastOutput: { output: 'Lead Classification Summary:\n- Hot: 23 leads (enterprise, >500 employees, engaged in last 7 days)\n- Warm: 67 leads (mid-market, 50-500 employees)\n- Cold: 48 leads (no engagement in 30+ days)\n- Invalid: 4 leads (bounced emails)', model: 'llama3', tokensUsed: 621 }, lastStatus: 'completed' },
          { name: 'Load to Warehouse', type: 'http_request', order: 5, maxRetries: 5, retryDelayMs: 10000,
            config: { url: 'https://bigquery.googleapis.com/v2/projects/quorvexa/datasets/leads/tables/daily_import/insertAll', method: 'POST', headers: { 'Authorization': 'Bearer {{trigger.gcpToken}}' }, body: { records: '{{step_0.body}}', classification: '{{step_4.output}}', metadata: '{{step_1}}' } },
            lastOutput: { status: 200, body: { insertErrors: [], rowsInserted: 142 } }, lastStatus: 'completed' },
          { name: 'ETL Summary Email', type: 'notification', order: 6, maxRetries: 3, retryDelayMs: 2000,
            config: { channel: 'email', recipient: 'data-team@quorvexa.dev', subject: 'Nightly ETL Complete - {{step_1.totalRecords}} records', body: 'ETL Pipeline completed successfully.\n\nRecords extracted: {{step_1.totalRecords}}\nAI Classification:\n{{step_4.output}}\n\nRows loaded to BigQuery: {{step_5.body.rowsInserted}}\nExtracted at: {{step_1.extractedAt}}' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
        ],
      },

      // ── 6. AI Content Generator ──────────────────────────────────
      // active | manual | 5 steps | AI-focused
      {
        name: 'AI Content Generator',
        description: 'Generates AI-written content from a prompt, waits for review buffer, transforms output into publishable format, then sends via email and posts to webhook endpoint. Manual trigger for on-demand content creation.',
        status: 'active',
        triggerType: 'manual',
        metadata: { tags: ['ai', 'content', 'generation'], version: '1.0.0' },
        runCount: 31,
        lastRunAt: '6 hours',
        steps: [
          { name: 'Generate Content', type: 'ai_agent', order: 0, maxRetries: 2, retryDelayMs: 1000,
            config: { prompt: '{{trigger.contentPrompt}}\n\nTone: {{trigger.tone}}\nTarget audience: {{trigger.audience}}\nWord count: approximately {{trigger.wordCount}}\nFormat: {{trigger.format}}', sessionId: 'content-gen-{{trigger.requestId}}' },
            lastOutput: { output: '# The Future of Agentic AI in Enterprise\n\nIn the rapidly evolving landscape of artificial intelligence, agentic systems represent the next frontier...', model: 'llama3', tokensUsed: 1204 }, lastStatus: 'completed' },
          { name: 'Review Buffer', type: 'delay', order: 1, maxRetries: 0, retryDelayMs: 0,
            config: { delayMs: 3000 },
            lastOutput: { delayed: 3000 }, lastStatus: 'completed' },
          { name: 'Format for Publishing', type: 'transform', order: 2, maxRetries: 1, retryDelayMs: 0,
            config: { mapping: { title: 'trigger.title', content: 'step_0.output', author: 'trigger.author', publishedAt: 'trigger.timestamp', category: 'trigger.category', wordCount: 'trigger.wordCount' } },
            lastOutput: { title: 'The Future of Agentic AI in Enterprise', content: '# The Future of Agentic AI in Enterprise\n\nIn the rapidly evolving landscape...', author: 'Quorvexa Content Team', publishedAt: '2026-05-22T10:30:00Z', category: 'AI & Automation' }, lastStatus: 'completed' },
          { name: 'Email Draft to Editor', type: 'notification', order: 3, maxRetries: 3, retryDelayMs: 2000,
            config: { channel: 'email', recipient: '{{trigger.editorEmail}}', subject: 'New content draft: {{trigger.title}}', body: 'Hi,\n\nA new content draft has been generated and is ready for review.\n\nTitle: {{step_2.title}}\nAuthor: {{step_2.author}}\nCategory: {{step_2.category}}\n\nContent preview:\n{{step_2.content}}' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
          { name: 'Post to CMS Webhook', type: 'http_request', order: 4, maxRetries: 3, retryDelayMs: 5000,
            config: { url: 'https://cms.quorvexa.dev/api/v1/posts/draft', method: 'POST', headers: { 'X-Webhook-Token': '{{trigger.cmsToken}}' }, body: { title: '{{step_2.title}}', content: '{{step_2.content}}', author: '{{step_2.author}}', category: '{{step_2.category}}', status: 'draft' } },
            lastOutput: { status: 201, body: { postId: 'post-78df2a', slug: 'future-of-agentic-ai-enterprise', status: 'draft' } }, lastStatus: 'completed' },
        ],
      },

      // ── 7. E-Commerce Order Processing ───────────────────────────
      // active | event | 8 steps | complex multi-service
      {
        name: 'E-Commerce Order Processing',
        description: 'Full order lifecycle: validates inventory, reserves stock, processes payment via external gateway, waits for payment confirmation, updates warehouse, generates AI-powered order summary, sends confirmation email, and notifies fulfillment via SMS.',
        status: 'active',
        triggerType: 'event',
        metadata: { tags: ['e-commerce', 'orders', 'fulfillment'], version: '2.4.0', avgLatency: '18s' },
        runCount: 1563,
        lastRunAt: '2 hours',
        steps: [
          { name: 'Validate Order Data', type: 'condition', order: 0, maxRetries: 1, retryDelayMs: 0,
            config: { condition: 'trigger.orderId' },
            lastOutput: { condition: 'trigger.orderId', result: true, branch: 'true' }, lastStatus: 'completed' },
          { name: 'Reserve Inventory', type: 'http_request', order: 1, maxRetries: 3, retryDelayMs: 2000,
            config: { url: 'https://inventory.quorvexa.dev/api/v1/reserve', method: 'POST', headers: { 'Authorization': 'Bearer svc-order-processor' }, body: { orderId: '{{trigger.orderId}}', items: '{{trigger.items}}', warehouse: 'us-east-primary' } },
            lastOutput: { status: 200, body: { reservationId: 'res-892a', itemsReserved: 3, warehouse: 'us-east-primary' } }, lastStatus: 'completed' },
          { name: 'Process Payment', type: 'http_request', order: 2, maxRetries: 3, retryDelayMs: 5000,
            config: { url: 'https://payments.quorvexa.dev/api/v1/charge', method: 'POST', headers: { 'Authorization': 'Bearer svc-order-processor' }, body: { orderId: '{{trigger.orderId}}', amount: '{{trigger.totalAmount}}', currency: '{{trigger.currency}}', paymentMethod: '{{trigger.paymentMethodId}' } },
            lastOutput: { status: 200, body: { transactionId: 'txn-f81bc2', status: 'captured', amount: 149.99, currency: 'USD' } }, lastStatus: 'completed' },
          { name: 'Payment Settlement Delay', type: 'delay', order: 3, maxRetries: 0, retryDelayMs: 0,
            config: { delayMs: 2000 },
            lastOutput: { delayed: 2000 }, lastStatus: 'completed' },
          { name: 'Update Warehouse Fulfillment', type: 'http_request', order: 4, maxRetries: 5, retryDelayMs: 10000,
            config: { url: 'https://warehouse.quorvexa.dev/api/v1/fulfillment/create', method: 'POST', body: { orderId: '{{trigger.orderId}}', reservationId: '{{step_1.body.reservationId}}', transactionId: '{{step_2.body.transactionId}}', shippingAddress: '{{trigger.shippingAddress}}' } },
            lastOutput: { status: 201, body: { fulfillmentId: 'ful-23ad1', estimatedDelivery: '2026-05-25', carrier: 'FedEx', trackingNumber: 'FX89201456789' } }, lastStatus: 'completed' },
          { name: 'Generate Order Summary', type: 'transform', order: 5, maxRetries: 1, retryDelayMs: 0,
            config: { mapping: { orderId: 'trigger.orderId', customerName: 'trigger.customerName', totalAmount: 'step_2.body.amount', transactionId: 'step_2.body.transactionId', trackingNumber: 'step_4.body.trackingNumber', estimatedDelivery: 'step_4.body.estimatedDelivery' } },
            lastOutput: { orderId: 'ORD-2026-44821', customerName: 'Alex Johnson', totalAmount: 149.99, transactionId: 'txn-f81bc2', trackingNumber: 'FX89201456789', estimatedDelivery: '2026-05-25' }, lastStatus: 'completed' },
          { name: 'Order Confirmation Email', type: 'notification', order: 6, maxRetries: 5, retryDelayMs: 3000,
            config: { channel: 'email', recipient: '{{trigger.customerEmail}}', subject: 'Order Confirmed - {{trigger.orderId}}', body: 'Hi {{trigger.customerName}},\n\nYour order {{trigger.orderId}} has been confirmed!\n\nTotal: ${{step_5.totalAmount}}\nTracking: {{step_5.trackingNumber}}\nEstimated delivery: {{step_5.estimatedDelivery}}\n\nThank you for shopping with us!' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
          { name: 'Fulfillment SMS Alert', type: 'notification', order: 7, maxRetries: 3, retryDelayMs: 2000,
            config: { channel: 'sms', recipient: '{{trigger.customerPhone}}', subject: 'Order Update', body: 'Your order {{step_5.orderId}} is being prepared! Track it: https://track.quorvexa.dev/{{step_5.trackingNumber}}. Est. delivery: {{step_5.estimatedDelivery}}' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
        ],
      },

      // ── 8. Employee Onboarding ───────────────────────────────────
      // active | manual | 6 steps | HR use case
      {
        name: 'Employee Onboarding',
        description: 'HR onboarding workflow: creates accounts across systems, sends welcome email, waits for IT provisioning, assigns buddy via AI matching, sends in-app notification, and generates onboarding checklist transform.',
        status: 'active',
        triggerType: 'manual',
        metadata: { tags: ['hr', 'onboarding', 'employee'], version: '1.2.0', department: 'People Ops' },
        runCount: 23,
        lastRunAt: '5 days',
        steps: [
          { name: 'Create Employee Accounts', type: 'action', order: 0, maxRetries: 3, retryDelayMs: 2000,
            config: { action: 'provision_employee', email: '{{trigger.email}}', firstName: '{{trigger.firstName}}', lastName: '{{trigger.lastName}}', department: '{{trigger.department}}', startDate: '{{trigger.startDate}}', systems: ['email', 'slack', 'github', 'jira', 'confluence'] },
            lastOutput: { action: 'provision_employee', executed: true, context: ['trigger'], accountsCreated: ['email', 'slack', 'github', 'jira', 'confluence'] }, lastStatus: 'completed' },
          { name: 'Send Welcome Email', type: 'notification', order: 1, maxRetries: 5, retryDelayMs: 3000,
            config: { channel: 'email', recipient: '{{trigger.email}}', subject: 'Welcome to Quorvexa, {{trigger.firstName}}!', body: 'Hi {{trigger.firstName}},\n\nWelcome aboard! Your accounts are being set up.\n\nDepartment: {{trigger.department}}\nStart date: {{trigger.startDate}}\n\nWe are excited to have you on the team!' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
          { name: 'IT Provisioning Delay', type: 'delay', order: 2, maxRetries: 0, retryDelayMs: 0,
            config: { delayMs: 10000 },
            lastOutput: { delayed: 10000 }, lastStatus: 'completed' },
          { name: 'Verify Account Setup', type: 'http_request', order: 3, maxRetries: 3, retryDelayMs: 5000,
            config: { url: 'https://it.quorvexa.dev/api/v1/provisioning/status', method: 'GET', headers: { 'Authorization': 'Bearer svc-hr-onboarding' }, body: { email: '{{trigger.email}}' } },
            lastOutput: { status: 200, body: { email: 'active', slack: 'active', github: 'active', jira: 'active', confluence: 'active' } }, lastStatus: 'completed' },
          { name: 'Assign Onboarding Buddy', type: 'ai_agent', order: 4, maxRetries: 1, retryDelayMs: 1000,
            config: { prompt: 'Based on the new hire {{trigger.firstName}} {{trigger.lastName}} joining the {{trigger.department}} team, suggest an onboarding buddy from the team. Consider: similar role, overlapping timezone, 1+ year tenure. Also generate a 30-60-90 day onboarding plan.' },
            lastOutput: { output: 'Recommended buddy: Sarah Chen (Senior Engineer, {{trigger.department}}, 3 years tenure, same timezone).\n\n30-Day Plan: Environment setup, meet the team, complete onboarding modules...\n60-Day Plan: First independent project, code review participation...\n90-Day Plan: Lead a small feature, present at team demo...', model: 'llama3', tokensUsed: 543 }, lastStatus: 'completed' },
          { name: 'Build Onboarding Checklist', type: 'transform', order: 5, maxRetries: 1, retryDelayMs: 0,
            config: { mapping: { employeeEmail: 'trigger.email', department: 'trigger.department', accountsStatus: 'step_3.body', buddyRecommendation: 'step_4.output', startDate: 'trigger.startDate' } },
            lastOutput: { employeeEmail: 'new.hire@quorvexa.dev', department: 'Engineering', accountsStatus: { email: 'active', slack: 'active', github: 'active' }, buddyRecommendation: 'Recommended buddy: Sarah Chen...', startDate: '2026-05-27' }, lastStatus: 'completed' },
        ],
      },

      // ── 9. Social Media Content Scheduler ────────────────────────
      // draft | scheduled | 5 steps
      {
        name: 'Social Media Content Scheduler',
        description: 'Draft workflow for scheduling social media posts: transforms raw content into platform-specific formats, waits for scheduled time, posts to each platform via webhook, and logs results. Uses cron schedule for queue processing.',
        status: 'draft',
        triggerType: 'scheduled',
        cronExpression: '0 9,12,17 * * 1-5',
        metadata: { tags: ['social-media', 'marketing', 'scheduling'], version: '0.9.0', platforms: ['twitter', 'linkedin', 'facebook'] },
        runCount: 0,
        steps: [
          { name: 'Transform Content for Platforms', type: 'transform', order: 0, maxRetries: 1, retryDelayMs: 0,
            config: { mapping: { tweet: 'trigger.content', linkedinPost: 'trigger.content', hashtag: 'trigger.hashtags', mediaUrl: 'trigger.mediaUrl', scheduledTime: 'trigger.scheduledTime' } },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'AI Content Polish', type: 'ai_agent', order: 1, maxRetries: 2, retryDelayMs: 1000,
            config: { prompt: 'Polish the following social media content for maximum engagement. Adjust tone per platform: casual for Twitter, professional for LinkedIn. Add relevant emojis for Twitter only.\n\nOriginal: {{step_0.tweet}}\nHashtags: {{step_0.hashtag}}' },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Wait for Scheduled Time', type: 'delay', order: 2, maxRetries: 0, retryDelayMs: 0,
            config: { delayMs: 5000 },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Post to Social Platforms', type: 'http_request', order: 3, maxRetries: 3, retryDelayMs: 5000,
            config: { url: 'https://social-api.quorvexa.dev/v1/post', method: 'POST', headers: { 'Authorization': 'Bearer {{trigger.socialApiToken}}' }, body: { platforms: ['twitter', 'linkedin'], tweetContent: '{{step_1.output}}', linkedinContent: '{{step_1.output}}', mediaUrl: '{{step_0.mediaUrl}}' } },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Log Post Results', type: 'notification', order: 4, maxRetries: 2, retryDelayMs: 1000,
            config: { channel: 'in_app', recipient: 'marketing@quorvexa.dev', subject: 'Social Posts Published', body: 'Social media posts have been published.\n\nTwitter: {{step_3.body.twitter}}\nLinkedIn: {{step_3.body.linkedin}}\n\nContent: {{step_1.output}}' },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },

      // ── 10. Security Audit Scanner ───────────────────────────────
      // active | webhook | 5 steps
      {
        name: 'Security Audit Scanner',
        description: 'Triggered by webhook on every PR to scan for vulnerabilities: runs SAST scan, evaluates results, gets AI security analysis, transforms findings into report format, and alerts security team via Slack.',
        status: 'active',
        triggerType: 'webhook',
        metadata: { tags: ['security', 'audit', 'compliance', 'OWASP'], version: '1.5.0', scanTypes: ['SAST', 'dependency', 'secret-detection'] },
        runCount: 67,
        lastRunAt: '1 day',
        steps: [
          { name: 'Run SAST Scan', type: 'http_request', order: 0, maxRetries: 2, retryDelayMs: 5000,
            config: { url: 'https://security.quorvexa.dev/api/v1/scan', method: 'POST', headers: { 'X-Webhook-Secret': '{{trigger.secret}}' }, body: { repository: '{{trigger.repository}}', branch: '{{trigger.branch}}', commitSha: '{{trigger.commitSha}}', scanTypes: ['sast', 'dependency', 'secrets'] } },
            lastOutput: { status: 200, body: { scanId: 'scan-a89f2', critical: 0, high: 2, medium: 5, low: 12, findings: [{ type: 'dependency', severity: 'high', package: 'lodash@4.17.20', cve: 'CVE-2021-23337' }] } }, lastStatus: 'completed' },
          { name: 'Check for Critical Findings', type: 'condition', order: 1, maxRetries: 0, retryDelayMs: 0,
            config: { condition: 'step_0.body.critical' },
            lastOutput: { condition: 'step_0.body.critical', result: false, branch: 'false' }, lastStatus: 'completed' },
          { name: 'AI Security Analysis', type: 'ai_agent', order: 2, maxRetries: 2, retryDelayMs: 2000,
            config: { prompt: 'Analyze the following security scan results and provide remediation guidance. Focus on high-severity findings first. Check for OWASP Top 10 compliance.\n\nScan results: {{step_0.body}}\nRepository: {{trigger.repository}}' },
            lastOutput: { output: 'Security Analysis:\n\nHIGH: lodash@4.17.20 - Prototype pollution vulnerability (CVE-2021-23337). Remediation: Upgrade to lodash@4.17.21 or later.\n\nMEDIUM: 5 findings related to CORS configuration, cookie flags, and input validation...', model: 'llama3', tokensUsed: 834 }, lastStatus: 'completed' },
          { name: 'Transform Findings Report', type: 'transform', order: 3, maxRetries: 1, retryDelayMs: 0,
            config: { mapping: { scanId: 'step_0.body.scanId', critical: 'step_0.body.critical', high: 'step_0.body.high', medium: 'step_0.body.medium', aiAnalysis: 'step_2.output', repository: 'trigger.repository', commitSha: 'trigger.commitSha', passedAudit: 'step_1.branch' } },
            lastOutput: { scanId: 'scan-a89f2', critical: 0, high: 2, medium: 5, aiAnalysis: 'Security Analysis: HIGH: lodash@4.17.20...', repository: 'quorvexa/platform', commitSha: 'abc1234', passedAudit: 'false' }, lastStatus: 'completed' },
          { name: 'Alert Security Team', type: 'notification', order: 4, maxRetries: 3, retryDelayMs: 2000,
            config: { channel: 'slack', recipient: '#security-alerts', subject: 'Security Scan: {{step_3.repository}}@{{step_3.commitSha}}', body: ':shield: Security scan complete for {{step_3.repository}}\n\nCritical: {{step_3.critical}} | High: {{step_3.high}} | Medium: {{step_3.medium}}\nPassed: {{step_3.passedAudit}}\n\nAI Analysis:\n{{step_3.aiAnalysis}}' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
        ],
      },

      // ── 11. Invoice Processing Pipeline ──────────────────────────
      // archived | event | 6 steps
      {
        name: 'Invoice Processing Pipeline',
        description: 'Archived legacy invoice processing workflow. Validates invoice data, transforms line items, calls payment API, sends receipt email, waits for settlement, and logs to audit. Replaced by the newer billing microservice.',
        status: 'archived',
        triggerType: 'event',
        metadata: { tags: ['billing', 'invoices', 'archived'], version: '1.0.0', archivedReason: 'Replaced by billing microservice v2', archivedAt: '2026-04-15' },
        runCount: 892,
        lastRunAt: '30 days',
        steps: [
          { name: 'Validate Invoice', type: 'condition', order: 0, maxRetries: 1, retryDelayMs: 0,
            config: { condition: 'trigger.invoiceId' },
            lastOutput: { condition: 'trigger.invoiceId', result: true, branch: 'true' }, lastStatus: 'completed' },
          { name: 'Transform Line Items', type: 'transform', order: 1, maxRetries: 1, retryDelayMs: 0,
            config: { mapping: { invoiceId: 'trigger.invoiceId', customerId: 'trigger.customerId', totalAmount: 'trigger.totalAmount', currency: 'trigger.currency', lineItems: 'trigger.lineItems', dueDate: 'trigger.dueDate' } },
            lastOutput: { invoiceId: 'INV-2026-0891', customerId: 'cust-acme-001', totalAmount: 2450.00, currency: 'USD', lineItems: [{ description: 'Enterprise License', amount: 2000 }, { description: 'Support Package', amount: 450 }], dueDate: '2026-06-01' }, lastStatus: 'completed' },
          { name: 'Process Payment', type: 'http_request', order: 2, maxRetries: 5, retryDelayMs: 5000,
            config: { url: 'https://billing.quorvexa.dev/api/v1/invoices/pay', method: 'POST', body: { invoiceId: '{{step_1.invoiceId}}', amount: '{{step_1.totalAmount}}', customerId: '{{step_1.customerId}}' } },
            lastOutput: { status: 200, body: { paymentId: 'pay-892fa1', status: 'paid', processedAt: '2026-04-14T10:30:00Z' } }, lastStatus: 'completed' },
          { name: 'Send Receipt Email', type: 'notification', order: 3, maxRetries: 3, retryDelayMs: 3000,
            config: { channel: 'email', recipient: '{{trigger.customerEmail}}', subject: 'Payment Receipt - Invoice {{step_1.invoiceId}}', body: 'Thank you for your payment!\n\nInvoice: {{step_1.invoiceId}}\nAmount: ${{step_1.totalAmount}} {{step_1.currency}}\nPayment ID: {{step_2.body.paymentId}}\nProcessed: {{step_2.body.processedAt}}' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
          { name: 'Settlement Delay', type: 'delay', order: 4, maxRetries: 0, retryDelayMs: 0,
            config: { delayMs: 5000 },
            lastOutput: { delayed: 5000 }, lastStatus: 'completed' },
          { name: 'Log to Audit Trail', type: 'action', order: 5, maxRetries: 10, retryDelayMs: 5000,
            config: { action: 'log_invoice_payment', invoiceId: '{{step_1.invoiceId}}', paymentId: '{{step_2.body.paymentId}}', amount: '{{step_1.totalAmount}}' },
            lastOutput: { action: 'log_invoice_payment', executed: true, context: ['trigger', 'step_0', 'step_1', 'step_2', 'step_3', 'step_4'] }, lastStatus: 'completed' },
        ],
      },

      // ── 12. Lead Scoring & Routing ───────────────────────────────
      // active | event | 7 steps
      {
        name: 'Lead Scoring & Routing',
        description: 'Scores incoming leads using AI, routes high-value leads to senior reps. Transforms lead data, gets AI score, checks threshold, delays for CRM sync, notifies via email and SMS, and creates CRM record.',
        status: 'active',
        triggerType: 'event',
        metadata: { tags: ['sales', 'leads', 'ai-scoring'], version: '2.0.0', scoreThreshold: 75 },
        runCount: 324,
        lastRunAt: '30 minutes',
        steps: [
          { name: 'Normalize Lead Data', type: 'transform', order: 0, maxRetries: 1, retryDelayMs: 0,
            config: { mapping: { leadName: 'trigger.name', leadEmail: 'trigger.email', company: 'trigger.company', employees: 'trigger.employeeCount', industry: 'trigger.industry', source: 'trigger.source', submittedAt: 'trigger.timestamp' } },
            lastOutput: { leadName: 'TechCorp Solutions', leadEmail: 'cto@techcorp.io', company: 'TechCorp Solutions', employees: 250, industry: 'Technology', source: 'website', submittedAt: '2026-05-22T14:30:00Z' }, lastStatus: 'completed' },
          { name: 'AI Lead Scoring', type: 'ai_agent', order: 1, maxRetries: 2, retryDelayMs: 2000,
            config: { prompt: 'Score this sales lead from 0-100 based on: company size ({{step_0.employees}} employees), industry ({{step_0.industry}}), source ({{step_0.source}}). Consider BANT criteria. Provide: score, rationale, recommended next action, priority level (hot/warm/cold).' },
            lastOutput: { output: 'Lead Score: 87/100\nPriority: HOT\nRationale: Mid-market technology company (250 employees), direct website submission, C-level contact. Strong BANT fit.\nRecommended action: Immediate outreach by senior account executive within 1 hour.', model: 'llama3', tokensUsed: 298 }, lastStatus: 'completed' },
          { name: 'Check Lead Score Threshold', type: 'condition', order: 2, maxRetries: 0, retryDelayMs: 0,
            config: { condition: 'trigger.scoreThreshold' },
            lastOutput: { condition: 'trigger.scoreThreshold', result: true, branch: 'true' }, lastStatus: 'completed' },
          { name: 'CRM Sync Delay', type: 'delay', order: 3, maxRetries: 0, retryDelayMs: 0,
            config: { delayMs: 3000 },
            lastOutput: { delayed: 3000 }, lastStatus: 'completed' },
          { name: 'Assign to Sales Rep', type: 'http_request', order: 4, maxRetries: 3, retryDelayMs: 2000,
            config: { url: 'https://crm.quorvexa.dev/api/v1/leads', method: 'POST', body: { name: '{{step_0.leadName}}', email: '{{step_0.leadEmail}}', company: '{{step_0.company}}', score: '{{step_1.output}}', priority: 'hot', assignToRole: 'senior_account_executive' } },
            lastOutput: { status: 201, body: { leadId: 'lead-f89a2c', assignedTo: 'sarah.sales@quorvexa.dev', crmUrl: 'https://crm.quorvexa.dev/leads/lead-f89a2c' } }, lastStatus: 'completed' },
          { name: 'Email Alert to Rep', type: 'notification', order: 5, maxRetries: 3, retryDelayMs: 2000,
            config: { channel: 'email', recipient: '{{step_4.body.assignedTo}}', subject: 'HOT Lead: {{step_0.leadName}} ({{step_0.company}})', body: 'New high-priority lead assigned to you!\n\nLead: {{step_0.leadName}} ({{step_0.leadEmail}})\nCompany: {{step_0.company}} ({{step_0.employees}} employees)\nIndustry: {{step_0.industry}}\n\nAI Score & Analysis:\n{{step_1.output}}\n\nCRM: {{step_4.body.crmUrl}}' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
          { name: 'SMS Urgent Notification', type: 'notification', order: 6, maxRetries: 3, retryDelayMs: 1000,
            config: { channel: 'sms', recipient: '{{step_4.body.assignedToPhone}}', subject: 'HOT Lead', body: 'HOT lead from {{step_0.company}} just assigned to you. Score: 87/100. Contact: {{step_0.leadEmail}}. Respond within 1 hour. CRM: {{step_4.body.crmUrl}}' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
        ],
      },

      // ── 13. Multi-Channel Marketing Campaign ─────────────────────
      // draft | manual | 5 steps | all notification channels
      {
        name: 'Multi-Channel Marketing Campaign',
        description: 'Sends marketing messages across all 5 notification channels: email, in-app, SMS, Slack, and webhook. Demonstrates every notification channel type in a single workflow. Manual trigger for campaign launches.',
        status: 'draft',
        triggerType: 'manual',
        metadata: { tags: ['marketing', 'campaign', 'multi-channel'], version: '1.0.0', channels: ['email', 'in_app', 'sms', 'slack', 'webhook'] },
        runCount: 0,
        steps: [
          { name: 'Send Email Campaign', type: 'notification', order: 0, maxRetries: 5, retryDelayMs: 3000,
            config: { channel: 'email', recipient: '{{trigger.audienceEmail}}', subject: '{{trigger.campaignSubject}}', body: '{{trigger.campaignBody}}\n\n---\nYou received this because you are subscribed to {{trigger.listName}}. Unsubscribe: {{trigger.unsubscribeUrl}}', userId: '{{trigger.audienceUserId}}' },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Send In-App Notification', type: 'notification', order: 1, maxRetries: 3, retryDelayMs: 1000,
            config: { channel: 'in_app', recipient: '{{trigger.audienceUserId}}', subject: '{{trigger.campaignSubject}}', body: '{{trigger.campaignBody}}', userId: '{{trigger.audienceUserId}}' },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Send SMS Campaign', type: 'notification', order: 2, maxRetries: 3, retryDelayMs: 2000,
            config: { channel: 'sms', recipient: '{{trigger.audiencePhone}}', subject: '{{trigger.campaignSubject}}', body: '{{trigger.smsBody}}', userId: '{{trigger.audienceUserId}}' },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Post to Slack Channel', type: 'notification', order: 3, maxRetries: 3, retryDelayMs: 1000,
            config: { channel: 'slack', recipient: '{{trigger.slackChannel}}', subject: '{{trigger.campaignSubject}}', body: '{{trigger.campaignBody}}', userId: '{{trigger.audienceUserId}}' },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Fire Webhook to Analytics', type: 'notification', order: 4, maxRetries: 3, retryDelayMs: 2000,
            config: { channel: 'webhook', recipient: '{{trigger.webhookEndpoint}}', subject: 'Campaign Delivered', body: '{"campaignId":"{{trigger.campaignId}}","channel":"multi","recipient":"{{trigger.audienceEmail}}","deliveredAt":"{{trigger.timestamp}}"}', userId: '{{trigger.audienceUserId}}' },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },

      // ── 14. Database Backup Verification ─────────────────────────
      // active | scheduled | 4 steps
      {
        name: 'Database Backup Verification',
        description: 'Daily backup verification: triggers backup check via HTTP, validates backup integrity with condition, logs verification status as action, and sends webhook notification to operations dashboard. Runs at 3 AM daily.',
        status: 'active',
        triggerType: 'scheduled',
        cronExpression: '0 3 * * *',
        metadata: { tags: ['backup', 'database', 'verification', 'ops'], version: '1.0.0', databases: ['auth', 'workflow', 'notification', 'user'] },
        runCount: 45,
        lastRunAt: '21 hours',
        steps: [
          { name: 'Check Backup Status', type: 'http_request', order: 0, maxRetries: 3, retryDelayMs: 5000,
            config: { url: 'https://ops.quorvexa.dev/api/v1/backups/latest', method: 'GET', headers: { 'Authorization': 'Bearer svc-backup-verifier' } },
            lastOutput: { status: 200, body: { backupId: 'bkp-20260522', timestamp: '2026-05-22T03:00:00Z', databases: { auth: { size: '45MB', checksum: 'sha256:a1b2c3', status: 'complete' }, workflow: { size: '128MB', checksum: 'sha256:d4e5f6', status: 'complete' } }, totalSize: '892MB' } }, lastStatus: 'completed' },
          { name: 'Validate Backup Integrity', type: 'condition', order: 1, maxRetries: 0, retryDelayMs: 0,
            config: { condition: 'step_0.status' },
            lastOutput: { condition: 'step_0.status', result: true, branch: 'true' }, lastStatus: 'completed' },
          { name: 'Log Verification Result', type: 'action', order: 2, maxRetries: 5, retryDelayMs: 5000,
            config: { action: 'log_backup_verification', backupId: '{{step_0.body.backupId}}', totalSize: '{{step_0.body.totalSize}}', status: '{{step_1.branch}}' },
            lastOutput: { action: 'log_backup_verification', executed: true, context: ['trigger', 'step_0', 'step_1'] }, lastStatus: 'completed' },
          { name: 'Notify Ops Dashboard', type: 'notification', order: 3, maxRetries: 3, retryDelayMs: 2000,
            config: { channel: 'webhook', recipient: 'https://ops-dashboard.quorvexa.dev/webhooks/backup-status', subject: 'Backup Verification Complete', body: '{"backupId":"{{step_0.body.backupId}}","timestamp":"{{step_0.body.timestamp}}","totalSize":"{{step_0.body.totalSize}}","integrityCheck":"{{step_1.branch}}","verifiedAt":"{{trigger.timestamp}}"}' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
        ],
      },

      // ── 15. Document Review Pipeline ─────────────────────────────
      // paused | manual | 5 steps
      {
        name: 'Document Review Pipeline',
        description: 'Pauses document review pipeline: validates document metadata, runs AI content analysis, waits for human review window, transforms review into final format, and sends in-app notification to reviewers. Currently paused pending policy update.',
        status: 'paused',
        triggerType: 'manual',
        metadata: { tags: ['documents', 'review', 'compliance'], version: '1.1.0', pausedReason: 'Awaiting updated compliance policy Q2 2026' },
        runCount: 8,
        lastRunAt: '14 days',
        steps: [
          { name: 'Validate Document Metadata', type: 'condition', order: 0, maxRetries: 1, retryDelayMs: 0,
            config: { condition: 'trigger.documentId' },
            lastOutput: { condition: 'trigger.documentId', result: true, branch: 'true' }, lastStatus: 'completed' },
          { name: 'AI Document Analysis', type: 'ai_agent', order: 1, maxRetries: 2, retryDelayMs: 2000,
            config: { prompt: 'Analyze the following document for: 1) Compliance with company policy 2) Sensitive data detection (PII, financial data) 3) Quality score (0-100) 4) Recommended reviewers based on content.\n\nDocument: {{trigger.documentTitle}}\nContent preview: {{trigger.contentPreview}}' },
            lastOutput: { output: 'Document Analysis:\n1. Compliance: PASS - No policy violations detected\n2. Sensitive Data: 3 instances of PII found (emails, phone numbers)\n3. Quality Score: 82/100\n4. Recommended Reviewers: Legal (for PII), Engineering (for technical accuracy)', model: 'llama3', tokensUsed: 456 }, lastStatus: 'completed' },
          { name: 'Review Window Delay', type: 'delay', order: 2, maxRetries: 0, retryDelayMs: 0,
            config: { delayMs: 3000 },
            lastOutput: { delayed: 3000 }, lastStatus: 'completed' },
          { name: 'Compile Review Package', type: 'transform', order: 3, maxRetries: 1, retryDelayMs: 0,
            config: { mapping: { documentId: 'trigger.documentId', documentTitle: 'trigger.documentTitle', aiAnalysis: 'step_1.output', submittedBy: 'trigger.submittedBy', submittedAt: 'trigger.timestamp' } },
            lastOutput: { documentId: 'doc-78f2a1', documentTitle: 'Q2 Technical Architecture Proposal', aiAnalysis: 'Document Analysis: Compliance: PASS...', submittedBy: 'alex.johnson@quorvexa.dev', submittedAt: '2026-05-08T09:00:00Z' }, lastStatus: 'completed' },
          { name: 'Notify Reviewers', type: 'notification', order: 4, maxRetries: 3, retryDelayMs: 2000,
            config: { channel: 'in_app', recipient: '{{trigger.reviewerIds}}', subject: 'Document Review Request: {{step_3.documentTitle}}', body: 'A document is ready for your review.\n\nTitle: {{step_3.documentTitle}}\nSubmitted by: {{step_3.submittedBy}}\n\nAI Analysis Summary:\n{{step_3.aiAnalysis}}\n\nReview at: https://app.quorvexa.dev/documents/{{step_3.documentId}}' },
            lastOutput: { sent: true }, lastStatus: 'completed' },
        ],
      },

      // ── 16. Simple Self-Test (always succeeds) ──────────────────
      // active | manual | 5 steps | no external deps
      {
        name: 'Simple Self-Test',
        description: 'Quick smoke test with no external dependencies. Validates action, condition, transform, and delay steps. Trigger with payload: { "isActive": true, "name": "Test Run" }. Always succeeds when isActive is truthy.',
        status: 'active',
        triggerType: 'manual',
        metadata: { tags: ['test', 'self-test', 'smoke'], version: '1.0.0', triggerHint: '{"isActive": true, "name": "Test Run"}' },
        runCount: 0,
        steps: [
          { name: 'Log Start', type: 'action', order: 0, maxRetries: 1, retryDelayMs: 0,
            config: { action: 'workflow_self_test_start' },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Check Active Flag', type: 'condition', order: 1, maxRetries: 0, retryDelayMs: 0,
            config: { condition: 'trigger.isActive' },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Transform Input', type: 'transform', order: 2, maxRetries: 1, retryDelayMs: 0,
            config: { mapping: { name: 'trigger.name', isActive: 'trigger.isActive', conditionPassed: 'step_1.result' } },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Brief Pause', type: 'delay', order: 3, maxRetries: 0, retryDelayMs: 0,
            config: { delayMs: 2000 },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Log Completion', type: 'action', order: 4, maxRetries: 1, retryDelayMs: 0,
            config: { action: 'workflow_self_test_complete' },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },

      // ── 17. AI Agent Demo (requires agent service) ──────────────
      // active | manual | 4 steps
      {
        name: 'AI Agent Demo',
        description: 'Demonstrates AI agent integration. Sends a prompt from the trigger payload to the AI agent, transforms the response, and logs the result. Trigger with: { "prompt": "Summarize workflow automation benefits in 3 points" }.',
        status: 'active',
        triggerType: 'manual',
        metadata: { tags: ['test', 'ai-agent', 'demo'], version: '1.0.0', triggerHint: '{"prompt": "Summarize workflow automation benefits in 3 bullet points"}' },
        runCount: 0,
        steps: [
          { name: 'Validate Prompt', type: 'condition', order: 0, maxRetries: 0, retryDelayMs: 0,
            config: { condition: 'trigger.prompt' },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Run AI Agent', type: 'ai_agent', order: 1, maxRetries: 2, retryDelayMs: 2000,
            config: { prompt: '{{trigger.prompt}}', sessionId: '' },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Extract Output', type: 'transform', order: 2, maxRetries: 1, retryDelayMs: 0,
            config: { mapping: { prompt: 'trigger.prompt', aiOutput: 'step_1.output', model: 'step_1.model', sessionId: 'step_1.session_id' } },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Log AI Result', type: 'action', order: 3, maxRetries: 1, retryDelayMs: 0,
            config: { action: 'ai_agent_demo_complete' },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },

      // ── 18. Notification Demo (requires notification service) ────
      // active | manual | 3 steps
      {
        name: 'Notification Demo',
        description: 'Sends an in-app notification through the notification service. Demonstrates service-to-service auth and notification delivery. Trigger with: { "subject": "Hello from workflow!", "body": "This notification was sent by a workflow." }.',
        status: 'active',
        triggerType: 'manual',
        metadata: { tags: ['test', 'notification', 'demo'], version: '1.0.0', triggerHint: '{"subject": "Hello from workflow!", "body": "This notification was sent by a workflow."}' },
        runCount: 0,
        steps: [
          { name: 'Build Notification Payload', type: 'transform', order: 0, maxRetries: 1, retryDelayMs: 0,
            config: { mapping: { subject: 'trigger.subject', body: 'trigger.body', channel: 'trigger.channel' } },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Send In-App Notification', type: 'notification', order: 1, maxRetries: 3, retryDelayMs: 1000,
            config: { channel: 'in_app', recipient: 'demo@quorvexa.dev', subject: '{{step_0.subject}}', body: '{{step_0.body}}', userId: '' },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Log Notification Result', type: 'action', order: 2, maxRetries: 1, retryDelayMs: 0,
            config: { action: 'notification_demo_complete' },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },

      // ── TEST WORKFLOWS FOR 10 SCENARIOS ─────────────────────────────
      // Scenario 1: Direct AI Agent (smoke test)
      {
        name: '[TEST] Direct AI Agent',
        description: 'Scenario 1: Simple AI agent call with session memory',
        status: 'active',
        triggerType: 'manual',
        metadata: { tags: ['test', 'scenario-1', 'ai-agent'] },
        steps: [
          { name: 'Run Agent', type: 'ai_agent', order: 0, maxRetries: 1, retryDelayMs: 0,
            config: { prompt: 'What is 2+2? Explain step by step.', systemPrompt: 'You are a helpful math tutor.', maxIterations: 3 },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },

      // Scenario 2: Email + AI
      {
        name: '[TEST] Email Report Generation',
        description: 'Scenario 2: AI generates report, email delivers it',
        status: 'active',
        triggerType: 'manual',
        metadata: { tags: ['test', 'scenario-2', 'email', 'ai-agent'] },
        steps: [
          { name: 'Generate Report', type: 'ai_agent', order: 0, maxRetries: 1, retryDelayMs: 0,
            config: { prompt: 'Write 3-bullet executive summary of AI automation benefits for SaaS.', maxIterations: 5 },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Send Email', type: 'notification', order: 1, maxRetries: 3, retryDelayMs: 2000,
            config: { channel: 'email', recipient: '{{trigger.email}}', subject: 'AI Report: SaaS Automation', body: '{{step_0.output}}' },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },

      // Scenario 3: HTTP + AI + Email
      {
        name: '[TEST] Fetch Data & Summarize',
        description: 'Scenario 3: Fetch HTTP data, AI summarizes, email delivers',
        status: 'active',
        triggerType: 'manual',
        metadata: { tags: ['test', 'scenario-3', 'http', 'ai', 'email'] },
        steps: [
          { name: 'Fetch Data', type: 'http_request', order: 0, maxRetries: 2, retryDelayMs: 1000,
            config: { url: 'https://jsonplaceholder.typicode.com/posts/1', method: 'GET', headers: {} },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'AI Summarize', type: 'ai_agent', order: 1, maxRetries: 1, retryDelayMs: 0,
            config: { prompt: 'Summarize this JSON post in 2 sentences: {{step_0.body}}', maxIterations: 3 },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Email Summary', type: 'notification', order: 2, maxRetries: 3, retryDelayMs: 1000,
            config: { channel: 'email', recipient: '{{trigger.email}}', subject: 'Data Summary', body: '{{step_1.output}}' },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },

      // Scenario 4: Conditional Branch
      {
        name: '[TEST] Sentiment Classification Branch',
        description: 'Scenario 4: AI classifies sentiment, condition branches, email sent',
        status: 'active',
        triggerType: 'manual',
        metadata: { tags: ['test', 'scenario-4', 'condition', 'branch'] },
        steps: [
          { name: 'Classify Sentiment', type: 'ai_agent', order: 0, maxRetries: 1, retryDelayMs: 0,
            config: { prompt: 'Reply with ONE word only: positive or negative. Text: "I love this product!"', maxIterations: 2 },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Check Sentiment', type: 'condition', order: 1, maxRetries: 0, retryDelayMs: 0,
            config: { condition: 'step_0.output', operator: 'contains', value: 'positive' },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Email Positive', type: 'notification', order: 2, maxRetries: 2, retryDelayMs: 1000,
            config: { channel: 'email', recipient: '{{trigger.email}}', subject: 'Positive Feedback', body: 'Positive sentiment detected!' },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },

      // Scenario 5: RAG Setup (embed + search test)
      {
        name: '[TEST] RAG Pipeline Setup',
        description: 'Scenario 5: Placeholder for embed/search/grounded response tests',
        status: 'active',
        triggerType: 'manual',
        metadata: { tags: ['test', 'scenario-5', 'rag', 'vector'] },
        steps: [
          { name: 'AI Query', type: 'ai_agent', order: 0, maxRetries: 1, retryDelayMs: 0,
            config: { prompt: 'Based on Quorvexa knowledge, describe it in one sentence.' },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },

      // Scenario 6: Template Render
      {
        name: '[TEST] Notification Template',
        description: 'Scenario 6: Template creation, preview, email send',
        status: 'active',
        triggerType: 'manual',
        metadata: { tags: ['test', 'scenario-6', 'template'] },
        steps: [
          { name: 'Build Payload', type: 'transform', order: 0, maxRetries: 0, retryDelayMs: 0,
            config: { mapping: { title: 'trigger.reportTitle', content: 'trigger.reportContent' } },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Send Email', type: 'notification', order: 1, maxRetries: 3, retryDelayMs: 1000,
            config: { channel: 'email', recipient: '{{trigger.email}}', subject: 'Report: {{step_0.title}}', body: '{{step_0.content}}' },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },

      // Scenario 7: Webhook Notification
      {
        name: '[TEST] Webhook Delivery',
        description: 'Scenario 7: Send notification to external webhook',
        status: 'active',
        triggerType: 'manual',
        metadata: { tags: ['test', 'scenario-7', 'webhook'] },
        steps: [
          { name: 'Send Webhook', type: 'notification', order: 0, maxRetries: 2, retryDelayMs: 1000,
            config: { channel: 'webhook', recipient: '{{trigger.webhookUrl}}', subject: 'Test', body: 'Webhook test from workflow' },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },

      // Scenario 8: Retry & Failure
      {
        name: '[TEST] Retry & Failure Handling',
        description: 'Scenario 8: Intentional failure to test retry logic',
        status: 'active',
        triggerType: 'manual',
        metadata: { tags: ['test', 'scenario-8', 'retry', 'error'] },
        steps: [
          { name: 'Bad HTTP Request', type: 'http_request', order: 0, maxRetries: 2, retryDelayMs: 1000,
            config: { url: 'https://httpbin.org/status/500', method: 'GET', headers: {} },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },

      // Scenario 9: SSE Stream
      {
        name: '[TEST] SSE Stream Events',
        description: 'Scenario 9: Workflow with delay for SSE event streaming',
        status: 'active',
        triggerType: 'manual',
        metadata: { tags: ['test', 'scenario-9', 'sse', 'stream'] },
        steps: [
          { name: 'Start', type: 'transform', order: 0, maxRetries: 0, retryDelayMs: 0,
            config: { mapping: { started: 'trigger.timestamp' } },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Wait', type: 'delay', order: 1, maxRetries: 0, retryDelayMs: 0,
            config: { delayMs: 3000 },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Done', type: 'action', order: 2, maxRetries: 0, retryDelayMs: 0,
            config: { action: 'log_completion' },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },

      // Scenario 10: Full Pipeline
      {
        name: '[TEST] Full Agentic Pipeline',
        description: 'Scenario 10: All step types - HTTP, AI, transform, condition, delay, email',
        status: 'active',
        triggerType: 'manual',
        metadata: { tags: ['test', 'scenario-10', 'full-pipeline', 'all-steps'] },
        steps: [
          { name: 'Fetch GitHub', type: 'http_request', order: 0, maxRetries: 2, retryDelayMs: 1000,
            config: { url: 'https://api.github.com/repos/vercel/next.js', method: 'GET', headers: {} },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'AI Analysis', type: 'ai_agent', order: 1, maxRetries: 1, retryDelayMs: 0,
            config: { prompt: 'Analyze this GitHub repo and write 3 key insights: {{step_0.body}}', maxIterations: 5 },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Extract Data', type: 'transform', order: 2, maxRetries: 0, retryDelayMs: 0,
            config: { mapping: { insights: 'step_1.output', repoName: 'step_0.body.name' } },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Quality Check', type: 'condition', order: 3, maxRetries: 0, retryDelayMs: 0,
            config: { condition: 'step_1.output', operator: 'contains', value: 'stars' },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Pause', type: 'delay', order: 4, maxRetries: 0, retryDelayMs: 0,
            config: { delayMs: 2000 },
            lastOutput: null, lastStatus: 'pending' },
          { name: 'Send Results', type: 'notification', order: 5, maxRetries: 3, retryDelayMs: 2000,
            config: { channel: 'email', recipient: '{{trigger.email}}', subject: 'Next.js Analysis', body: '{{step_2.insights}}' },
            lastOutput: null, lastStatus: 'pending' },
        ],
      },
    ];

    // ── Insert all workflows ───────────────────────────────────────
    let totalSteps = 0;
    for (const wf of workflows) {
      // Build the lastRunAt SQL fragment — interval string is safe (hardcoded above)
      const lastRunAtSql = wf.lastRunAt ? `NOW() - interval '${wf.lastRunAt}'` : 'NULL';

      let insertedId;
      try {
        const wfResult = await pool.query(
          `INSERT INTO workflows ("tenantId", "createdBy", name, description, status, "triggerType", "cronExpression", metadata, "runCount", "lastRunAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ${lastRunAtSql})
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [DEMO_TENANT, demoUserId, wf.name, wf.description, wf.status, wf.triggerType, wf.cronExpression || null, JSON.stringify(wf.metadata), wf.runCount],
        );
        insertedId = wfResult.rows[0]?.id;
      } catch (e) {
        // Fall through to SELECT
      }

      if (!insertedId) {
        const existing = await pool.query(
          `SELECT id FROM workflows WHERE name = $1 AND "tenantId" = $2`,
          [wf.name, DEMO_TENANT],
        );
        insertedId = existing.rows[0]?.id;
      }

      if (insertedId) {
        await pool.query(`DELETE FROM workflow_steps WHERE "workflowId" = $1`, [insertedId]);

        for (const step of wf.steps) {
          await pool.query(
            `INSERT INTO workflow_steps ("workflowId", name, type, "order", config, "lastOutput", "lastStatus", "maxRetries", "retryDelayMs")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              insertedId,
              step.name,
              step.type,
              step.order,
              JSON.stringify(step.config),
              step.lastOutput ? JSON.stringify(step.lastOutput) : null,
              step.lastStatus,
              step.maxRetries,
              step.retryDelayMs,
            ],
          );
        }
        totalSteps += wf.steps.length;
        console.log(`  Workflow: "${wf.name}" (${wf.status}, ${wf.triggerType}) with ${wf.steps.length} steps`);
      }
    }
    console.log(`  Total: ${workflows.length} workflows (18 reference + 10 test scenarios), ${totalSteps} steps`);

    // ── 7. Audit logs ───────────────────────────────────────────────
    const auditLogs = [
      { action: 'login', success: true, ipAddress: '192.168.1.100', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      { action: 'login', success: true, ipAddress: '192.168.1.100', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', metadata: { method: 'jwt_refresh' } },
      { action: 'login', success: false, ipAddress: '10.0.0.55', userAgent: 'curl/8.1.2', errorMessage: 'Invalid credentials' },
      { action: 'password_change', success: true, ipAddress: '192.168.1.100' },
    ];

    for (const log of auditLogs) {
      await pool.query(
        `INSERT INTO audit_logs ("userId", action, "ipAddress", "userAgent", metadata, success, "errorMessage")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          demoUserId,
          log.action,
          log.ipAddress || null,
          log.userAgent || null,
          JSON.stringify(log.metadata || {}),
          log.success,
          log.errorMessage || null,
        ],
      );
    }
    console.log(`  Audit logs: ${auditLogs.length} created`);

    // ── Summary ─────────────────────────────────────────────────────
    console.log('\n  Demo account ready:');
    console.log(`    Email:    ${DEMO_EMAIL}`);
    console.log(`    Password: ${DEMO_PASSWORD}`);
    console.log(`    Role:     admin`);
    console.log(`    Tenant:   ${DEMO_TENANT}`);
    console.log('\n  Seeded data:');
    console.log('    1 user profile with social links');
    console.log('    1 preference set (dark theme, NYC timezone)');
    console.log('    5 notification templates (email, in_app, webhook)');
    console.log('    6 notifications (mix of read/delivered/pending)');
    console.log(`    ${workflows.length} workflows with ${totalSteps} steps total`);
    console.log('    4 audit log entries');
    console.log('\n  Workflow coverage:');
    console.log('    Trigger types: manual (7), scheduled (5), webhook (2), event (4)');
    console.log('    Statuses: active (12), draft (3), paused (2), archived (1)');
    console.log('    Step types: action, condition, ai_agent, http_request, notification, delay, transform');
    console.log('    Notification channels: email, in_app, sms, slack, webhook');
    console.log('    Retry configs: 0-10 retries, 0-10000ms delays');
  } catch (err) {
    if (err.code === '42P01') {
      console.error('\n  Tables do not exist yet. Start the services first: pnpm dev');
    } else {
      console.error('Seed failed:', err.message);
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
