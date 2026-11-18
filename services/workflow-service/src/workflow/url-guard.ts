import { promises as dns } from 'node:dns';
import { isIP } from 'node:net';

/**
 * SSRF protection for user-configured outbound requests (HTTP_REQUEST workflow steps).
 * Only http(s) is allowed and the host must not resolve to a private, loopback or
 * link-local address (covers cloud metadata endpoints such as 169.254.169.254).
 */
export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (isIP(ip) === 6) {
    if (ip === '::' || ip === '::1') return true;
    if (ip.startsWith('::ffff:')) return isPrivateAddress(ip.slice(7));
    return /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || ip.startsWith('ff');
  }
  return true; // not a valid IP literal: treat as unsafe
}

export async function assertSafeOutboundUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    throw new Error('Target host is not allowed');
  }
  const addresses = isIP(host)
    ? [host]
    : (await dns.lookup(host, { all: true })).map((r) => r.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error('Target host resolves to a private address');
  }
  return url;
}
