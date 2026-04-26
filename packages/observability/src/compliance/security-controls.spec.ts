import {
  redactPii,
  hasPermission,
  isDataExpired,
  DATA_CLASSIFICATIONS,
  ROLE_PERMISSIONS,
  ISO27001_CONTROLS,
  ISO9001_CONTROLS,
} from './security-controls';
import type { DataClassification } from './security-controls';

describe('ISO 27001 Compliance', () => {
  describe('ISO27001_CONTROLS', () => {
    it('contains all required control families', () => {
      expect(Object.keys(ISO27001_CONTROLS).length).toBeGreaterThanOrEqual(30);
      expect(ISO27001_CONTROLS.A5_1).toBe('Information security policies');
      expect(ISO27001_CONTROLS.A8_15).toBe('Logging');
      expect(ISO27001_CONTROLS.A8_24).toBe('Use of cryptography');
    });
  });

  describe('ISO9001_CONTROLS', () => {
    it('contains quality management controls', () => {
      expect(Object.keys(ISO9001_CONTROLS).length).toBeGreaterThanOrEqual(20);
      expect(ISO9001_CONTROLS.QM_4_1).toBe('Context of the organization - understanding');
      expect(ISO9001_CONTROLS.QM_9_2).toBe('Internal audit');
      expect(ISO9001_CONTROLS.QM_10_3).toBe('Continual improvement');
    });
  });

  describe('DATA_CLASSIFICATIONS', () => {
    it('classifies user personal data as confidential', () => {
      expect(DATA_CLASSIFICATIONS.user_personal.level).toBe('confidential');
      expect(DATA_CLASSIFICATIONS.user_personal.encryptionRequired).toBe(true);
    });

    it('classifies auth data as restricted', () => {
      expect(DATA_CLASSIFICATIONS.user_auth.level).toBe('restricted');
      expect(DATA_CLASSIFICATIONS.user_auth.auditRequired).toBe(true);
    });

    it('classifies audit logs as restricted', () => {
      expect(DATA_CLASSIFICATIONS.audit_log.level).toBe('restricted');
      expect(DATA_CLASSIFICATIONS.audit_log.retentionDays).toBe(365);
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('super_admin has all permissions', () => {
      expect(ROLE_PERMISSIONS.super_admin).toContain('system:admin');
      expect(ROLE_PERMISSIONS.super_admin.length).toBeGreaterThan(10);
    });

    it('viewer has minimal read-only permissions', () => {
      expect(ROLE_PERMISSIONS.viewer).toContain('users:read:self');
      expect(ROLE_PERMISSIONS.viewer).not.toContain('users:delete');
    });

    it('permissions escalate correctly across roles', () => {
      expect(ROLE_PERMISSIONS.super_admin.length).toBeGreaterThan(ROLE_PERMISSIONS.admin.length);
      expect(ROLE_PERMISSIONS.admin.length).toBeGreaterThan(ROLE_PERMISSIONS.member.length);
      expect(ROLE_PERMISSIONS.member.length).toBeGreaterThan(ROLE_PERMISSIONS.viewer.length);
    });
  });
});

describe('redactPii', () => {
  it('redacts email addresses', () => {
    const result = redactPii({ email: 'user@example.com' });
    expect(result.email).toBe('u***@example.com');
  });

  it('redacts IP addresses', () => {
    const result = redactPii({ ip: '192.168.1.100' });
    expect(result.ip).toBe('***.***.***.100');
  });

  it('redacts names', () => {
    const result = redactPii({ firstName: 'John', lastName: 'Doe' });
    expect(result.firstName).toBe('J**n');
    expect(result.lastName).toBe('D*e');
  });

  it('redacts passwords and tokens', () => {
    const result = redactPii({ password: 's', token: 'a' });
    expect(result.password).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
  });

  it('leaves non-PII fields untouched', () => {
    const result = redactPii({ status: 'active', count: 42 });
    expect(result.status).toBe('active');
    expect(result.count).toBe(42);
  });

  it('handles empty data', () => {
    const result = redactPii({});
    expect(result).toEqual({});
  });

  it('handles short strings', () => {
    const result = redactPii({ firstName: 'A' });
    expect(result.firstName).toBe('[REDACTED]');
  });
});

describe('hasPermission', () => {
  it('returns true for valid role-permission pairs', () => {
    expect(hasPermission('super_admin', 'system:admin')).toBe(true);
    expect(hasPermission('admin', 'users:write')).toBe(true);
    expect(hasPermission('member', 'workflows:read')).toBe(true);
    expect(hasPermission('viewer', 'users:read:self')).toBe(true);
  });

  it('returns false for invalid role-permission pairs', () => {
    expect(hasPermission('viewer', 'users:delete')).toBe(false);
    expect(hasPermission('member', 'system:admin')).toBe(false);
    expect(hasPermission('unknown_role', 'users:read')).toBe(false);
  });
});

describe('isDataExpired', () => {
  it('returns true when data exceeds retention period', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 400);
    const classification: DataClassification = { level: 'confidential', category: 'test', retentionDays: 365, encryptionRequired: true, auditRequired: true };

    expect(isDataExpired(oldDate, classification)).toBe(true);
  });

  it('returns false when data is within retention period', () => {
    const recentDate = new Date();
    const classification: DataClassification = { level: 'confidential', category: 'test', retentionDays: 365, encryptionRequired: true, auditRequired: true };

    expect(isDataExpired(recentDate, classification)).toBe(false);
  });

  it('returns false when retention is indefinite (0 days)', () => {
    const oldDate = new Date(2020, 0, 1);
    const classification: DataClassification = { level: 'public', category: 'test', retentionDays: 0, encryptionRequired: false, auditRequired: false };

    expect(isDataExpired(oldDate, classification)).toBe(false);
  });
});
