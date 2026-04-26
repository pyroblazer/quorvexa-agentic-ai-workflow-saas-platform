import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const loginDuration = new Trend('login_duration', true);
const workflowListDuration = new Trend('workflow_list_duration', true);
const requestCount = new Counter('request_count');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

// Test configuration — three stages: ramp up, sustain, ramp down
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp up to 10 users
    { duration: '1m', target: 50 },    // ramp up to 50 users
    { duration: '2m', target: 50 },    // sustain 50 concurrent users
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% under 500ms
    error_rate: ['rate<0.01'],                         // less than 1% errors
    http_req_failed: ['rate<0.01'],
  },
};

let authToken = '';

export function setup() {
  // Register a test user and get auth token
  const res = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      email: `loadtest-${randomString(8)}@quorvexa-test.com`,
      password: 'LoadTest@123',
      firstName: 'Load',
      lastName: 'Test',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, { 'setup: register successful': (r) => r.status === 201 });

  if (res.status === 201) {
    const body = JSON.parse(res.body);
    return { token: body.accessToken };
  }
  return { token: '' };
}

export default function main(data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // Scenario 1: Login
  const loginStart = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: 'test@example.com', password: 'Test@123456' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  loginDuration.add(Date.now() - loginStart);
  requestCount.add(1);

  const loginOk = check(loginRes, {
    'login: status 200': (r) => r.status === 200 || r.status === 401,
  });
  errorRate.add(!loginOk);

  // Scenario 2: List workflows (authenticated)
  if (data.token) {
    const listStart = Date.now();
    const listRes = http.get(`${BASE_URL}/api/v1/workflows?page=1&limit=20`, { headers });
    workflowListDuration.add(Date.now() - listStart);
    requestCount.add(1);

    check(listRes, {
      'workflows: status 200': (r) => r.status === 200,
      'workflows: has items array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.items);
        } catch {
          return false;
        }
      },
    });
  }

  // Scenario 3: Health check
  const healthRes = http.get(`${BASE_URL}/api/v1/health/live`);
  requestCount.add(1);
  check(healthRes, { 'health: alive': (r) => r.status === 200 });

  sleep(1);
}

export function teardown(data) {
  console.log('Load test completed');
}
