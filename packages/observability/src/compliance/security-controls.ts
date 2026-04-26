import { Request, Response, NextFunction } from 'express';

import { createLogger } from '../logger';

const logger = createLogger('compliance:security');

// ISO 27001 Annex A Control: A.8.1.1 - Asset Inventory
export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  category: string;
  retentionDays: number;
  encryptionRequired: boolean;
  auditRequired: boolean;
}

// ISO 27001 Annex A Controls mapping
export const ISO27001_CONTROLS = {
  A5_1: 'Information security policies',
  A5_2: 'Information security roles and responsibilities',
  A5_3: 'Segregation of duties',
  A6_1: 'Screening',
  A6_2: 'Terms and conditions of employment',
  A7_1: 'Physical security perimeters',
  A8_1: 'User endpoint devices',
  A8_2: 'Privileged access rights',
  A8_3: 'Information access restriction',
  A8_4: 'Access to source code',
  A8_5: 'Secure authentication',
  A8_6: 'Capacity management',
  A8_7: 'Protection against malware',
  A8_8: 'Management of technical vulnerabilities',
  A8_9: 'Configuration management',
  A8_10: 'Information deletion',
  A8_11: 'Data masking',
  A8_12: 'Data leakage prevention',
  A8_13: 'Information backup',
  A8_14: 'Redundancy of information processing facilities',
  A8_15: 'Logging',
  A8_16: 'Monitoring activities',
  A8_17: 'Clock synchronization',
  A8_18: 'Use of privileged utility programs',
  A8_19: 'Installation of software on operational systems',
  A8_20: 'Networks security',
  A8_21: 'Security of network services',
  A8_22: 'Segregation of networks',
  A8_23: 'Web filtering',
  A8_24: 'Use of cryptography',
  A8_25: 'Secure development life cycle',
  A8_26: 'Application security requirements',
  A8_27: 'Secure system architecture and engineering',
  A8_28: 'Secure coding',
  A8_29: 'Security testing in development and acceptance',
  A8_30: 'Outsourced development',
  A8_31: 'Separation of development, test and production environments',
  A8_32: 'Change management',
  A8_33: 'Test information',
  A9_1: 'Event logging',
  A9_2: 'Collection of evidence',
  A9_3: 'Protection of audit information',
  A9_4: 'Administrator and operator logs',
} as const;

// ISO 9001 Quality Management Controls
export const ISO9001_CONTROLS = {
  QM_4_1: 'Context of the organization - understanding',
  QM_4_2: 'Needs and expectations of interested parties',
  QM_4_3: 'Scope of the quality management system',
  QM_4_4: 'Quality management system and its processes',
  QM_5_1: 'Leadership and commitment',
  QM_5_2: 'Quality policy',
  QM_5_3: 'Organizational roles, responsibilities and authorities',
  QM_6_1: 'Actions to address risks and opportunities',
  QM_6_2: 'Quality objectives and planning to achieve them',
  QM_6_3: 'Planning of changes',
  QM_7_1: 'Resources',
  QM_7_2: 'Competence',
  QM_7_3: 'Awareness',
  QM_7_4: 'Communication',
  QM_7_5: 'Documented information',
  QM_8_1: 'Operational planning and control',
  QM_8_2: 'Requirements for products and services',
  QM_8_3: 'Design and development of products and services',
  QM_8_4: 'Control of externally provided processes, products and services',
  QM_8_5: 'Production and service provision',
  QM_8_6: 'Release of products and services',
  QM_8_7: 'Control of nonconforming outputs',
  QM_9_1: 'Monitoring, measurement, analysis and evaluation',
  QM_9_2: 'Internal audit',
  QM_9_3: 'Management review',
  QM_10_1: 'Improvement',
  QM_10_2: 'Nonconformity and corrective action',
  QM_10_3: 'Continual improvement',
} as const;

// Data classification levels per ISO 27001 A.5.12
export const DATA_CLASSIFICATIONS: Record<string, DataClassification> = {
  user_personal: { level: 'confidential', category: 'personal_data', retentionDays: 365, encryptionRequired: true, auditRequired: true },
  user_auth: { level: 'restricted', category: 'authentication', retentionDays: 90, encryptionRequired: true, auditRequired: true },
  user_profile: { level: 'confidential', category: 'personal_data', retentionDays: 730, encryptionRequired: true, auditRequired: false },
  workflow_data: { level: 'internal', category: 'business_data', retentionDays: 365, encryptionRequired: false, auditRequired: true },
  notification_data: { level: 'internal', category: 'business_data', retentionDays: 90, encryptionRequired: false, auditRequired: false },
  audit_log: { level: 'restricted', category: 'security_data', retentionDays: 365, encryptionRequired: true, auditRequired: true },
  system_metrics: { level: 'internal', category: 'operational', retentionDays: 30, encryptionRequired: false, auditRequired: false },
  api_keys: { level: 'restricted', category: 'secrets', retentionDays: 0, encryptionRequired: true, auditRequired: true },
  public_content: { level: 'public', category: 'marketing', retentionDays: 0, encryptionRequired: false, auditRequired: false },
};

// Security headers middleware for ISO 27001 compliance
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
}

// PII redaction for GDPR/ISO 27001 compliance
export function redactPii(data: Record<string, unknown>): Record<string, unknown> {
  const piiFields = ['email', 'phone', 'firstName', 'lastName', 'address', 'ip', 'ipAddress', 'password', 'token', 'secret'];
  const redacted = { ...data };

  for (const field of piiFields) {
    if (field in redacted && typeof redacted[field] === 'string') {
      const value = redacted[field] as string;
      if (field === 'email') {
        const [local, domain] = value.split('@');
        redacted[field] = `${local.charAt(0)}***@${domain}`;
      } else if (field === 'ip' || field === 'ipAddress') {
        const parts = value.split('.');
        redacted[field] = parts.map((p, i) => i < parts.length - 1 ? '***' : p).join('.');
      } else if (value.length > 2) {
        redacted[field] = `${value.charAt(0)}${'*'.repeat(value.length - 2)}${value.charAt(value.length - 1)}`;
      } else {
        redacted[field] = '[REDACTED]';
      }
    }
  }

  return redacted;
}

// Audit event logger for ISO 27001 A.8.15 (Logging)
export interface ComplianceAuditEvent {
  timestamp: string;
  controlId: string;
  action: string;
  actor: string;
  resource: string;
  result: 'success' | 'failure' | 'denied';
  details?: Record<string, unknown>;
  dataClassification?: DataClassification;
}

export function logComplianceEvent(event: Omit<ComplianceAuditEvent, 'timestamp'>): void {
  const fullEvent: ComplianceAuditEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  logger.info({
    compliance: true,
    iso27001: event.controlId.startsWith('A'),
    iso9001: event.controlId.startsWith('QM'),
    ...redactPii(fullEvent as any),
  }, `Compliance event: ${event.action}`);
}

// Access control matrix per ISO 27001 A.5.15
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['users:read', 'users:write', 'users:delete', 'workflows:read', 'workflows:write', 'workflows:delete', 'workflows:execute', 'agents:read', 'agents:write', 'agents:execute', 'notifications:read', 'notifications:write', 'notifications:delete', 'settings:read', 'settings:write', 'audit:read', 'compliance:read', 'compliance:write', 'system:admin'],
  admin: ['users:read', 'users:write', 'workflows:read', 'workflows:write', 'workflows:delete', 'workflows:execute', 'agents:read', 'agents:write', 'agents:execute', 'notifications:read', 'notifications:write', 'notifications:delete', 'settings:read', 'audit:read', 'compliance:read'],
  member: ['users:read:self', 'workflows:read', 'workflows:write', 'workflows:execute', 'agents:read', 'agents:execute', 'notifications:read:self', 'settings:read:self'],
  viewer: ['users:read:self', 'workflows:read', 'agents:read', 'notifications:read:self'],
};

export function hasPermission(role: string, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] ?? [];
  return permissions.includes(permission) || permissions.includes(`${permission.split(':')[0]}:*`);
}

// Data retention enforcement per ISO 27001 A.8.10
export function isDataExpired(createdAt: Date, classification: DataClassification): boolean {
  if (classification.retentionDays === 0) return false;
  const expiryDate = new Date(createdAt);
  expiryDate.setDate(expiryDate.getDate() + classification.retentionDays);
  return new Date() > expiryDate;
}
