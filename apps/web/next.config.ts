import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Enable React strict mode for catching potential issues early
  reactStrictMode: true,

  // Rewrites proxy API calls to gateway — avoids CORS in development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  // standalone only in CI/Docker — Windows pnpm virtual store uses symlinks that
  // require Developer Mode locally; Linux runners have no such restriction
  output: process.env['CI'] || process.env['DOCKER_BUILD'] ? 'standalone' : undefined,
  outputFileTracingRoot: path.join(__dirname, '../..'),

  experimental: {},
};

export default nextConfig;
