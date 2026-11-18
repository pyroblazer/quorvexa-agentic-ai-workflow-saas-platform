import { assertSafeOutboundUrl, isPrivateAddress } from './url-guard';

describe('url-guard', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '0.0.0.0',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('treats %s as private', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111'])(
    'treats %s as public',
    (ip) => {
      expect(isPrivateAddress(ip)).toBe(false);
    },
  );

  it('rejects non-http schemes, localhost and metadata IPs', async () => {
    await expect(assertSafeOutboundUrl('file:///etc/passwd')).rejects.toThrow();
    await expect(assertSafeOutboundUrl('http://localhost:5432')).rejects.toThrow();
    await expect(assertSafeOutboundUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow();
    await expect(assertSafeOutboundUrl('not a url')).rejects.toThrow('Invalid URL');
  });

  it('allows public IP literals', async () => {
    await expect(assertSafeOutboundUrl('https://8.8.8.8/dns')).resolves.toBeInstanceOf(URL);
  });
});
