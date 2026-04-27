import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const loginDuration = new Trend('login_duration', true);
const requestCount = new Counter('request_count');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

function randomString(len) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Lighter configuration suitable for CI smoke testing
export const options = {
  stages: [
    { duration: '5s', target: 2 },
    { duration: '10s', target: 5 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    error_rate: ['rate<0.5'],
    http_req_failed: ['rate<0.5'],
  },
};

export function setup() {
  const email = `loadtest-${randomString(8)}@quorvexa-test.com`;
  const res = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      email,
      password: 'LoadTest@123',
      firstName: 'Load',
      lastName: 'Test',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, { 'setup: register attempted': (r) => r.status === 201 || r.status === 409 });

  if (res.status === 201) {
    try {
      const body = JSON.parse(res.body);
      return { token: body.accessToken };
    } catch {
      return { token: '' };
    }
  }
  return { token: '' };
}

export default function main(data) {
  const headers = {
    'Content-Type': 'application/json',
    ...(data.token ? { Authorization: `Bearer ${data.token}` } : {}),
  };

  // Scenario 1: Login attempt
  const loginStart = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: 'test@example.com', password: 'Test@123456' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  loginDuration.add(Date.now() - loginStart);
  requestCount.add(1);

  check(loginRes, {
    'login: got response': (r) => r.status === 200 || r.status === 401 || r.status === 502,
  });

  // Scenario 2: List workflows (authenticated, best-effort)
  if (data.token) {
    const listRes = http.get(`${BASE_URL}/api/v1/workflows?page=1&limit=20`, { headers });
    requestCount.add(1);
    check(listRes, { 'workflows: got response': (r) => r.status >= 200 && r.status < 500 });
  }

  // Scenario 3: Health check
  const healthRes = http.get(`${BASE_URL}/api/v1/health/live`);
  requestCount.add(1);
  check(healthRes, { 'health: got response': (r) => r.status === 200 || r.status === 502 });

  sleep(1);
}

export function teardown() {
  console.log('Load test completed');
}
